import {
  getModelConfig,
  getMarketContext,
  ingestMessages,
  isPipelineEnabled,
  submitPolicyEvents,
  submitProposals,
  upsertTopics
} from '../client/ritualApi.js';
import { computeEngagementScore } from '../pipeline/engagementScorer.js';
import { generateMarketProposal } from '../pipeline/marketGenerator.js';
import { normalizeMessage } from '../pipeline/normalize.js';
import { evaluateSuitability } from '../pipeline/suitabilityFilter.js';
import { buildTopicCandidates } from '../pipeline/topicBuilder.js';
import { drainRawMessages } from '../queue/rawQueue.js';

export async function runTopicProcessorWorker() {
  // Check if pipeline is enabled before running
  const enabled = await isPipelineEnabled();
  if (!enabled) {
    console.log('Topic processor: AI pipeline is paused — skipping.');
    return;
  }

  const drainLimit = Number(process.env.TOPIC_PROCESSOR_DRAIN_LIMIT || 200);
  let highScoreThreshold = Number(process.env.TOPIC_SCORE_HIGH_THRESHOLD || 0.75);
  let reviewScoreThreshold = Number(process.env.TOPIC_SCORE_REVIEW_THRESHOLD || 0.5);
  let duplicateThreshold = Number(process.env.TOPIC_DUPLICATE_THRESHOLD || 0.85);
  let scoringWeights;
  const rawMessages = await drainRawMessages(drainLimit);

  if (rawMessages.length === 0) {
    console.log('Topic processor: no queued raw messages.');
    return;
  }

  const normalizedMessages = rawMessages.map(normalizeMessage).filter((message) => {
    return message.source && message.sourceMessageId && message.authorHash && message.text;
  });

  if (normalizedMessages.length === 0) {
    console.log('Topic processor: all queued messages were invalid after normalization.');
    return;
  }

  await ingestMessages(normalizedMessages);

  const topicCandidates = buildTopicCandidates(normalizedMessages);

  try {
    const modelResponse = await getModelConfig('engagement_v1');
    const activeModel = modelResponse?.model;

    if (activeModel?.weights) {
      scoringWeights = activeModel.weights;
    }

    if (activeModel?.thresholds) {
      highScoreThreshold = Number(activeModel.thresholds.high ?? highScoreThreshold);
      reviewScoreThreshold = Number(activeModel.thresholds.review ?? reviewScoreThreshold);
      duplicateThreshold = Number(activeModel.thresholds.duplicate ?? duplicateThreshold);
    }
  } catch (error) {
    await submitPolicyEvents([
      {
        eventType: 'topic_processor_model_config_fallback',
        reasonCode: 'model_config_unavailable',
        details: {
          message: error.message
        }
      }
    ]);
  }

  let context = { activeMarketTexts: [], proposalTexts: [] };
  try {
    context = await getMarketContext();
  } catch (error) {
    await submitPolicyEvents([
      {
        eventType: 'topic_processor_context_error',
        reasonCode: 'market_context_unavailable',
        details: {
          message: error.message
        }
      }
    ]);
  }

  const dedupTexts = [
    ...(context.activeMarketTexts || []),
    ...(context.proposalTexts || [])
  ];

  const scoredTopics = await Promise.all(topicCandidates.map(async (topic) => {
    const score = computeEngagementScore(topic, {
      activeSourceCount: 2,
      historicalTitles: dedupTexts,
      sourceWeights: scoringWeights
    });

    const suitability = await evaluateSuitability(
      {
        ...topic,
        engagementScore: score.finalScore
      },
      {
        duplicateTexts: dedupTexts,
        duplicateThreshold
      }
    );

    const status = score.finalScore >= reviewScoreThreshold ? 'scored' : 'filtered';

    return {
      ...topic,
      engagementScore: score.finalScore,
      scoreBreakdown: score.components,
      suitability,
      status
    };
  }));

  if (scoredTopics.length > 0) {
    await upsertTopics(
      scoredTopics.map((topic) => ({
        ...topic,
        status: topic.status
      }))
    );
  }

  const proposalCandidates = scoredTopics.filter((topic) => {
    const passesScore = topic.engagementScore >= highScoreThreshold;
    return passesScore && topic.suitability.suitable;
  });

  if (proposalCandidates.length > 0) {
    const proposals = await Promise.all(proposalCandidates.map(async (topic) => {
      const aiConfidence = Math.max(
        0.5,
        Math.min(0.95, (topic.engagementScore * 0.7) + (topic.suitability.confidence * 0.3))
      );

      return generateMarketProposal(
        {
          ...topic,
          aiConfidence
        },
        {
          fallbackDays: Number(process.env.DEFAULT_PROPOSAL_RESOLUTION_DAYS || 14)
        }
      );
    }));

    await submitProposals(proposals);

    await upsertTopics(
      proposalCandidates.map((topic) => ({
        ...topic,
        status: 'proposed'
      }))
    );
  }

  const rejectedBySuitability = scoredTopics.filter(
    (topic) => topic.engagementScore >= reviewScoreThreshold && !topic.suitability.suitable
  );

  if (rejectedBySuitability.length > 0) {
    await submitPolicyEvents(
      rejectedBySuitability.map((topic) => ({
        source: Object.keys(topic.sourceBreakdown || {})[0] || null,
        topicId: topic.id,
        eventType: 'suitability_rejection',
        reasonCode: topic.suitability.rejectionReason,
        details: {
          score: topic.engagementScore,
          duplicate_similarity: topic.suitability.duplicateSimilarity,
          score_breakdown: topic.scoreBreakdown
        }
      }))
    );
  }

  await submitPolicyEvents([
    {
      eventType: 'topic_processor_run',
      reasonCode: 'phase2_pipeline',
      details: {
        drained: rawMessages.length,
        normalized: normalizedMessages.length,
        topic_candidates: topicCandidates.length,
        scored_topics: scoredTopics.length,
        proposals_submitted: proposalCandidates.length,
        rejected_by_suitability: rejectedBySuitability.length,
        thresholds: {
          review: reviewScoreThreshold,
          high: highScoreThreshold,
          duplicate: duplicateThreshold
        }
      }
    }
  ]);

  console.log(
    `Topic processor completed: drained=${rawMessages.length}, normalized=${normalizedMessages.length}, topics=${topicCandidates.length}, proposals=${proposalCandidates.length}`
  );
}
