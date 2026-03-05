import { generateJSON } from '../llm/gemini.js';
import { maxSimilarity } from './similarity.js';

// ---------------------------------------------------------------------------
// Fast heuristic pre-filter (runs first, blocks obviously bad topics)
// ---------------------------------------------------------------------------

const BANNED_PATTERNS = [
  /kill|suicide|murder|assassinat|terror/i,
  /sexual|rape|abuse/i,
  /doxx|leak personal/i,
  /self harm|violence/i
];

const TIME_BOUND_HINTS = [
  'before', 'by', 'on', 'this week', 'this month', 'today', 'tomorrow', 'deadline',
  '2026', '2027', 'q1', 'q2', 'q3', 'q4'
];

function hasAnyPattern(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function containsTimeBoundHint(text) {
  const lower = text.toLowerCase();
  return TIME_BOUND_HINTS.some((hint) => lower.includes(hint));
}

function looksResolvable(text) {
  return /(will|can|does|is|are|reach|launch|release|pass|win|approve|ban|ship)/i.test(text);
}

function heuristicEvaluation(topic, options = {}) {
  const { duplicateTexts = [], duplicateThreshold = 0.85 } = options;
  const combinedText = `${topic.label || ''}. ${topic.summary || ''}`.trim();

  const legal = !hasAnyPattern(combinedText, BANNED_PATTERNS);
  const ethical = legal;
  const resolvable = looksResolvable(combinedText);
  const timeBound = containsTimeBoundHint(combinedText);
  const outcomeClarity = Boolean(topic.entities?.length) || /vs|or|will/i.test(combinedText);

  const duplicateSimilarity = maxSimilarity(combinedText, duplicateTexts);
  const duplicate = duplicateSimilarity >= duplicateThreshold;

  const suitable = resolvable && timeBound && outcomeClarity && legal && ethical && !duplicate;

  let rejectionReason = null;
  if (!resolvable) rejectionReason = 'unresolvable';
  else if (!timeBound) rejectionReason = 'not_time_bound';
  else if (!outcomeClarity) rejectionReason = 'unclear_outcomes';
  else if (!legal) rejectionReason = 'policy_blocked';
  else if (duplicate) rejectionReason = 'duplicate_topic';

  return {
    suitable,
    resolvable,
    timeBound,
    outcomeClarity,
    legal,
    duplicate,
    ethical,
    duplicateSimilarity,
    rejectionReason,
    confidence: suitable ? Math.max(0.6, 1 - (duplicateSimilarity * 0.4)) : Math.max(0.4, 0.8 - duplicateSimilarity),
    evaluatedBy: 'heuristic',
  };
}

// ---------------------------------------------------------------------------
// LLM-as-judge suitability assessment
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a suitability judge for prediction-market topics on the Ritual platform.
Evaluate the given topic and decide whether it is suitable for a public prediction market.

Criteria to evaluate (score each 0.0–1.0):
1. resolvable: Can the outcome be objectively verified from public sources?
2. timeBound: Is there a clear time horizon or event date implied?
3. outcomeClarity: Are the possible outcomes well-defined and mutually exclusive?
4. legal: Does the topic comply with platform policies (no violence, abuse, doxxing, terrorism)?
5. ethical: Is it appropriate for a public market (not exploitative or tasteless)?

Also provide:
- suitable: boolean — true only if ALL criteria score >= 0.5 and legal+ethical are both >= 0.8
- rejectionReason: null if suitable, otherwise one of: "unresolvable", "not_time_bound", "unclear_outcomes", "policy_blocked", "unethical"
- confidence: overall confidence in your judgment (0.0–1.0)
- reasoning: one-sentence explanation

Return ONLY valid JSON:
{
  "suitable": boolean,
  "resolvable": number,
  "timeBound": number,
  "outcomeClarity": number,
  "legal": number,
  "ethical": number,
  "rejectionReason": string | null,
  "confidence": number,
  "reasoning": string
}`;

function buildUserPrompt(topic) {
  return `Topic label: ${topic.label || 'N/A'}
Summary: ${topic.summary || 'N/A'}
Entities: ${(topic.entities || []).join(', ') || 'none'}
Engagement score: ${topic.engagementScore ?? 'N/A'}`;
}

/**
 * Evaluate topic suitability using LLM with heuristic fallback.
 * The heuristic pre-filter always runs first to block banned content quickly.
 */
export async function evaluateSuitability(topic, options = {}) {
  const { duplicateTexts = [], duplicateThreshold = 0.85 } = options;

  // Always run heuristic first — fast policy block
  const heuristic = heuristicEvaluation(topic, options);

  // If heuristic blocks on policy, don't waste an LLM call
  if (!heuristic.legal || heuristic.duplicate) {
    return heuristic;
  }

  // Skip LLM if no API key configured
  if (!process.env.GEMINI_API_KEY) {
    return heuristic;
  }

  try {
    const result = await generateJSON(SYSTEM_PROMPT, buildUserPrompt(topic), {
      temperature: 0.3,
      maxTokens: 512,
    });

    if (typeof result.suitable !== 'boolean' || typeof result.confidence !== 'number') {
      console.warn('LLM suitability returned invalid structure, using heuristic');
      return heuristic;
    }

    // Merge LLM judgment with duplicate detection from heuristic
    const duplicateSimilarity = maxSimilarity(
      `${topic.label || ''}. ${topic.summary || ''}`.trim(),
      duplicateTexts
    );
    const duplicate = duplicateSimilarity >= duplicateThreshold;

    const suitable = result.suitable && !duplicate;
    let rejectionReason = result.rejectionReason;
    if (duplicate) rejectionReason = 'duplicate_topic';

    return {
      suitable,
      resolvable: result.resolvable >= 0.5,
      timeBound: result.timeBound >= 0.5,
      outcomeClarity: result.outcomeClarity >= 0.5,
      legal: result.legal >= 0.8,
      ethical: result.ethical >= 0.8,
      duplicate,
      duplicateSimilarity,
      rejectionReason: suitable ? null : rejectionReason,
      confidence: result.confidence,
      reasoning: result.reasoning || null,
      evaluatedBy: 'gemini',
      scores: {
        resolvable: result.resolvable,
        timeBound: result.timeBound,
        outcomeClarity: result.outcomeClarity,
        legal: result.legal,
        ethical: result.ethical,
      },
    };
  } catch (error) {
    console.error('LLM suitability evaluation failed, using heuristic fallback:', error.message);
    return heuristic;
  }
}
