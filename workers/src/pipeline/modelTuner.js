function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeActual(actual) {
  const tradeComponent = clamp((Number(actual.totalTrades || 0) / 25), 0, 1);
  const volumeComponent = clamp((Number(actual.totalVolume || 0) / 500), 0, 1);
  const uniqueTradersComponent = clamp((Number(actual.uniqueTraders || 0) / 20), 0, 1);
  const timeToFirstTradeHours = Number(actual.timeToFirstTradeHours);
  const speedComponent = Number.isFinite(timeToFirstTradeHours)
    ? clamp(1 - (timeToFirstTradeHours / 24), 0, 1)
    : 0;

  return clamp(
    (tradeComponent * 0.35) +
    (volumeComponent * 0.3) +
    (uniqueTradersComponent * 0.25) +
    (speedComponent * 0.1),
    0,
    1
  );
}

function normalizeWeights(weights) {
  const safeWeights = {
    volume: Number(weights.volume || 0),
    velocity: Number(weights.velocity || 0),
    controversy: Number(weights.controversy || 0),
    diversity: Number(weights.diversity || 0),
    temporal: Number(weights.temporal || 0),
    historical: Number(weights.historical || 0)
  };

  const total = Object.values(safeWeights).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return {
      volume: 0.15,
      velocity: 0.25,
      controversy: 0.2,
      diversity: 0.1,
      temporal: 0.15,
      historical: 0.15
    };
  }

  return Object.fromEntries(
    Object.entries(safeWeights).map(([key, value]) => [key, value / total])
  );
}

export function tuneModelWeights({ currentWeights, proposalPerformance, learningRate = 0.05 }) {
  const baselineWeights = normalizeWeights(currentWeights || {});

  if (!Array.isArray(proposalPerformance) || proposalPerformance.length === 0) {
    return {
      nextWeights: baselineWeights,
      diagnostics: {
        sampleCount: 0,
        meanAbsoluteError: 0,
        meanSignedError: 0,
        weightDeltaMagnitude: 0
      }
    };
  }

  const deltas = {
    volume: 0,
    velocity: 0,
    controversy: 0,
    diversity: 0,
    temporal: 0,
    historical: 0
  };

  let absoluteErrorSum = 0;
  let signedErrorSum = 0;

  for (const item of proposalPerformance) {
    const predicted = clamp(Number(item.predictedEngagementScore || 0), 0, 1);
    const actual = normalizeActual(item.actual || {});
    const error = actual - predicted;

    absoluteErrorSum += Math.abs(error);
    signedErrorSum += error;

    const confidence = clamp(Number(item.aiConfidence || 0.5), 0, 1);

    deltas.volume += error * 0.20;
    deltas.velocity += error * 0.22;
    deltas.controversy += error * (0.18 + (confidence * 0.1));
    deltas.diversity += error * 0.12;
    deltas.temporal += error * 0.14;
    deltas.historical += error * (0.14 + ((1 - confidence) * 0.1));
  }

  const sampleCount = proposalPerformance.length;
  const meanAbsoluteError = absoluteErrorSum / sampleCount;
  const meanSignedError = signedErrorSum / sampleCount;

  const candidateWeights = {};
  for (const [key, value] of Object.entries(baselineWeights)) {
    candidateWeights[key] = clamp(value + ((deltas[key] / sampleCount) * learningRate), 0.02, 0.5);
  }

  const nextWeights = normalizeWeights(candidateWeights);

  const weightDeltaMagnitude = Object.keys(nextWeights).reduce((sum, key) => {
    return sum + Math.abs(nextWeights[key] - baselineWeights[key]);
  }, 0);

  return {
    nextWeights,
    diagnostics: {
      sampleCount,
      meanAbsoluteError: Number(meanAbsoluteError.toFixed(6)),
      meanSignedError: Number(meanSignedError.toFixed(6)),
      weightDeltaMagnitude: Number(weightDeltaMagnitude.toFixed(6))
    }
  };
}
