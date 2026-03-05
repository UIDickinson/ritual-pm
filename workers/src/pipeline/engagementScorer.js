import { maxSimilarity } from './similarity.js';

function clamp01(value) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeEngagementScore(topic, options = {}) {
  const {
    baseline24hCount = 200,
    activeSourceCount = 2,
    historicalTitles = [],
    sourceWeights = {
      volume: 0.15,
      velocity: 0.25,
      controversy: 0.2,
      diversity: 0.1,
      temporal: 0.15,
      historical: 0.15
    }
  } = options;

  const messageCount = Number(topic.messageCount || 0);
  const sourceBreakdown = topic.sourceBreakdown || {};
  const sourceKeys = Object.keys(sourceBreakdown).filter((key) => Number(sourceBreakdown[key] || 0) > 0);

  const representativeMessages = topic.metadata?.representativeMessages || [];
  const messageLengths = representativeMessages.map((value) => String(value).length);
  const avgMessageLength = average(messageLengths);

  const firstSeenTs = new Date(topic.firstSeen || Date.now()).getTime();
  const lastSeenTs = new Date(topic.lastSeen || Date.now()).getTime();
  const ageHours = Math.max(1, (Date.now() - firstSeenTs) / (1000 * 60 * 60));
  const activeWindowHours = Math.max(1, (lastSeenTs - firstSeenTs) / (1000 * 60 * 60));

  const volumeScore = clamp01(Math.log1p(messageCount) / Math.log1p(baseline24hCount));

  const velocityRaw = (messageCount / ageHours) * activeWindowHours;
  const velocityScore = clamp01(velocityRaw / 20);

  const sourceCounts = sourceKeys.map((key) => Number(sourceBreakdown[key] || 0));
  const sourceMean = average(sourceCounts);
  const sourceVariance = sourceCounts.length
    ? sourceCounts.reduce((sum, count) => sum + ((count - sourceMean) ** 2), 0) / sourceCounts.length
    : 0;
  const sourceStdDev = Math.sqrt(sourceVariance);

  const disagreementProxy = sourceMean > 0 ? sourceStdDev / sourceMean : 0;
  const textComplexityProxy = clamp01(avgMessageLength / 600);
  const controversyScore = clamp01((disagreementProxy * 0.6) + (textComplexityProxy * 0.4));

  const diversityScore = clamp01(sourceKeys.length / Math.max(1, activeSourceCount));

  const temporalDecay = 1 / (1 + (ageHours / 24));
  const temporalScore = clamp01((temporalDecay * 0.7) + (velocityScore * 0.3));

  const title = `${topic.label || ''} ${topic.summary || ''}`.trim();
  const historicalScore = clamp01(maxSimilarity(title, historicalTitles));

  const weights = sourceWeights;
  const finalScore = clamp01(
    (weights.volume * volumeScore) +
    (weights.velocity * velocityScore) +
    (weights.controversy * controversyScore) +
    (weights.diversity * diversityScore) +
    (weights.temporal * temporalScore) +
    (weights.historical * historicalScore)
  );

  return {
    finalScore,
    components: {
      volumeScore,
      velocityScore,
      controversyScore,
      diversityScore,
      temporalScore,
      historicalScore
    }
  };
}
