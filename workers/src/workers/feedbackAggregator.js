import {
  getModelConfig,
  getPerformanceContext,
  isPipelineEnabled,
  submitFeedbackEvents,
  submitPolicyEvents,
  updateModelConfig
} from '../client/ritualApi.js';
import { tuneModelWeights } from '../pipeline/modelTuner.js';

function clampThreshold(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0.05, Math.min(0.98, parsed));
}

function deriveThresholds(currentThresholds, diagnostics) {
  const review = clampThreshold(currentThresholds?.review, 0.5);
  const high = clampThreshold(currentThresholds?.high, 0.75);
  const duplicate = clampThreshold(currentThresholds?.duplicate, 0.85);

  if (diagnostics.sampleCount < 5) {
    return { review, high, duplicate };
  }

  const adjustedHigh = diagnostics.meanAbsoluteError > 0.25
    ? Math.min(0.9, high + 0.02)
    : Math.max(0.65, high - 0.01);

  const adjustedReview = diagnostics.meanAbsoluteError > 0.25
    ? Math.min(0.7, review + 0.01)
    : Math.max(0.4, review - 0.01);

  return {
    review: Number(adjustedReview.toFixed(4)),
    high: Number(adjustedHigh.toFixed(4)),
    duplicate: Number(duplicate.toFixed(4))
  };
}

export async function runFeedbackAggregatorWorker() {
  // Check if pipeline is enabled before running
  const enabled = await isPipelineEnabled();
  if (!enabled) {
    console.log('Feedback aggregator: AI pipeline is paused — skipping.');
    return;
  }

  const lookbackHours = Number(process.env.FEEDBACK_LOOKBACK_HOURS || 72);
  const learningRate = Number(process.env.MODEL_LEARNING_RATE || 0.05);
  const minSampleSize = Number(process.env.MODEL_TUNING_MIN_SAMPLES || 5);

  const [modelConfigResponse, performanceResponse] = await Promise.all([
    getModelConfig('engagement_v1'),
    getPerformanceContext(lookbackHours)
  ]);

  const activeModel = modelConfigResponse?.model;
  const proposalPerformance = performanceResponse?.proposalPerformance || [];

  if (!activeModel) {
    throw new Error('No active model configuration available for tuning');
  }

  const tuning = tuneModelWeights({
    currentWeights: activeModel.weights,
    proposalPerformance,
    learningRate
  });

  const diagnostics = tuning.diagnostics;

  await submitFeedbackEvents([
    {
      eventType: 'feedback_aggregation_run',
      payload: {
        lookbackHours,
        proposalCount: proposalPerformance.length,
        diagnostics
      }
    }
  ]);

  if (diagnostics.sampleCount < minSampleSize) {
    await submitPolicyEvents([
      {
        eventType: 'model_tuning_skipped',
        reasonCode: 'insufficient_samples',
        details: {
          sample_count: diagnostics.sampleCount,
          min_sample_size: minSampleSize
        }
      }
    ]);

    console.log(`Feedback aggregator: skipped tuning (samples=${diagnostics.sampleCount}, required=${minSampleSize})`);
    return;
  }

  const nextThresholds = deriveThresholds(activeModel.thresholds, diagnostics);

  const updateResponse = await updateModelConfig({
    modelName: activeModel.model_name,
    weights: tuning.nextWeights,
    thresholds: nextThresholds,
    metadata: {
      source: 'feedback_aggregator',
      previous_version: activeModel.version,
      diagnostics,
      lookbackHours,
      tuned_at: new Date().toISOString()
    }
  });

  await submitPolicyEvents([
    {
      eventType: 'model_tuning_applied',
      reasonCode: 'ok',
      details: {
        previous_version: activeModel.version,
        new_version: updateResponse?.model?.version,
        diagnostics,
        thresholds: nextThresholds
      }
    }
  ]);

  console.log(
    `Feedback aggregator: updated model from v${activeModel.version} to v${updateResponse?.model?.version} (samples=${diagnostics.sampleCount})`
  );
}
