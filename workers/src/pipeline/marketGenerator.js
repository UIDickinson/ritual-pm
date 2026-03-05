import { generateJSON } from '../llm/gemini.js';

// ---------------------------------------------------------------------------
// Heuristic helpers (used as LLM fallback)
// ---------------------------------------------------------------------------

function truncate(value, max = 120) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function inferCategories(topic) {
  const text = `${topic.label} ${topic.summary}`.toLowerCase();
  const categories = [];

  if (/(election|policy|government|parliament|senate|president|law)/i.test(text)) categories.push('politics');
  if (/(ai|tech|software|openai|model|startup|app)/i.test(text)) categories.push('technology');
  if (/(token|crypto|bitcoin|ethereum|market cap)/i.test(text)) categories.push('crypto');
  if (/(sport|match|league|cup|championship|team)/i.test(text)) categories.push('sports');
  if (/(movie|music|celebrity|show|stream)/i.test(text)) categories.push('entertainment');

  if (categories.length === 0) categories.push('general');
  return categories.slice(0, 3);
}

function inferResolutionDate(topic, fallbackDays = 14) {
  const sourceDate = new Date(topic.lastSeen || Date.now());
  const date = new Date(sourceDate.getTime() + (fallbackDays * 24 * 60 * 60 * 1000));
  return date.toISOString();
}

function inferQuestion(topic) {
  const entity = Array.isArray(topic.entities) && topic.entities[0] ? topic.entities[0] : null;
  if (entity) {
    return truncate(`Will ${entity} be a confirmed outcome by ${new Date(inferResolutionDate(topic)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}?`);
  }

  const cleanLabel = String(topic.label || 'this topic').replace(/^\w+ trend:\s*/i, '');
  return truncate(`Will ${cleanLabel} be confirmed before the resolution date?`);
}

function heuristicProposal(topic, options = {}) {
  const question = inferQuestion(topic);
  const resolutionDate = options.resolutionDate || inferResolutionDate(topic, options.fallbackDays || 14);

  const description = truncate(
    `${topic.summary} This proposal was generated from Reddit/Telegram trend signals and is queued for admin review before publication.`,
    500
  );

  return {
    topicId: topic.id,
    title: question,
    description,
    outcomes: ['Yes', 'No'],
    resolutionCriteria: 'Resolved using publicly verifiable sources relevant to the topic and date window.',
    resolutionDate,
    categories: inferCategories(topic),
    aiConfidence: topic.aiConfidence ?? 0.7,
    engagementScore: topic.engagementScore ?? null,
    generatedBy: 'heuristic',
  };
}

// ---------------------------------------------------------------------------
// LLM-powered generation
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a prediction-market creator for the Ritual platform.
Given a trending topic with its label, summary, entities, and source signals, generate a compelling prediction market proposal.

Rules:
1. The question (title) must be a clear, specific, time-bound yes-or-no question OR a multi-outcome question.
2. Outcomes must be mutually exclusive and collectively exhaustive. Use ["Yes","No"] when appropriate, but feel free to propose richer outcomes (2-6 options).
3. The description should provide enough context for a user who has never heard of the topic.
4. Resolution criteria must be objective, referencing publicly verifiable sources.
5. Categories must be chosen from: politics, technology, crypto, sports, entertainment, science, business, general (max 3).
6. The resolution date should be realistic — not too far in the future, not too soon.

Return ONLY valid JSON with this shape:
{
  "title": "string (max 120 chars)",
  "description": "string (max 500 chars)",
  "outcomes": ["string", ...],
  "resolutionCriteria": "string",
  "resolutionDate": "ISO-8601 date string",
  "categories": ["string", ...]
}`;

function buildUserPrompt(topic) {
  return `Topic label: ${topic.label || 'N/A'}
Summary: ${topic.summary || 'N/A'}
Entities: ${(topic.entities || []).join(', ') || 'none'}
Source(s): ${Object.keys(topic.sourceBreakdown || {}).join(', ') || 'unknown'}
Engagement score: ${topic.engagementScore ?? 'N/A'}
First seen: ${topic.firstSeen || 'unknown'}
Last seen: ${topic.lastSeen || 'unknown'}
Today: ${new Date().toISOString().split('T')[0]}`;
}

/**
 * Generate a market proposal using Gemini LLM, with heuristic fallback.
 */
export async function generateMarketProposal(topic, options = {}) {
  // Skip LLM if no API key configured — use heuristic
  if (!process.env.GEMINI_API_KEY) {
    return heuristicProposal(topic, options);
  }

  try {
    const result = await generateJSON(SYSTEM_PROMPT, buildUserPrompt(topic), {
      temperature: 0.7,
      maxTokens: 1024,
    });

    // Validate required fields
    if (!result.title || !result.outcomes || !Array.isArray(result.outcomes) || result.outcomes.length < 2) {
      console.warn('LLM returned invalid proposal structure, falling back to heuristic');
      return heuristicProposal(topic, options);
    }

    return {
      topicId: topic.id,
      title: truncate(result.title, 120),
      description: truncate(result.description || topic.summary, 500),
      outcomes: result.outcomes.slice(0, 6),
      resolutionCriteria: result.resolutionCriteria || 'Resolved using publicly verifiable sources.',
      resolutionDate: result.resolutionDate || options.resolutionDate || inferResolutionDate(topic, options.fallbackDays || 14),
      categories: (result.categories || inferCategories(topic)).slice(0, 3),
      aiConfidence: topic.aiConfidence ?? 0.7,
      engagementScore: topic.engagementScore ?? null,
      generatedBy: 'gemini',
    };
  } catch (error) {
    console.error('LLM market generation failed, using heuristic fallback:', error.message);
    return heuristicProposal(topic, options);
  }
}
