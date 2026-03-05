const apiBaseUrl = process.env.RITUAL_API_BASE_URL;
const serviceToken = process.env.AI_SERVICE_TOKEN;

function ensureConfig() {
  if (!apiBaseUrl || !serviceToken) {
    throw new Error('Missing worker API configuration: RITUAL_API_BASE_URL or AI_SERVICE_TOKEN');
  }
}

async function post(path, body) {
  ensureConfig();

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed (${response.status}) ${path}: ${text}`);
  }

  return response.json();
}

async function get(path) {
  ensureConfig();

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${serviceToken}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed (${response.status}) ${path}: ${text}`);
  }

  return response.json();
}

export async function upsertTopics(topics) {
  return post('/api/ai/topics', { topics });
}

export async function ingestMessages(messages) {
  return post('/api/ai/messages', { messages });
}

export async function submitPolicyEvents(events) {
  return post('/api/ai/policy-events', { events });
}

export async function submitProposals(proposals) {
  return post('/api/ai/proposals', { proposals });
}

export async function getMarketContext() {
  return get('/api/ai/market-context');
}

export async function getModelConfig(modelName = 'engagement_v1') {
  const params = new URLSearchParams({ modelName });
  return get(`/api/ai/model-config?${params.toString()}`);
}

export async function updateModelConfig({ modelName = 'engagement_v1', weights, thresholds, metadata = {} }) {
  return post('/api/ai/model-config', {
    modelName,
    weights,
    thresholds,
    metadata
  });
}

export async function getPerformanceContext(lookbackHours = 72) {
  const params = new URLSearchParams({ lookbackHours: String(lookbackHours) });
  return get(`/api/ai/performance-context?${params.toString()}`);
}

export async function submitFeedbackEvents(events) {
  return post('/api/ai/feedback', { events });
}

export async function isPipelineEnabled() {
  try {
    const apiBase = process.env.RITUAL_API_BASE_URL;
    if (!apiBase) return true; // no API configured, default to enabled

    const response = await fetch(`${apiBase}/api/admin/settings`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return true;

    const { settings } = await response.json();
    const value = settings?.ai_pipeline_enabled;
    // If setting doesn't exist yet, default to enabled
    if (value === undefined || value === null) return true;
    // Handle various stored formats
    if (value === false || value === 'false' || value === '"false"') return false;
    return true;
  } catch {
    console.warn('Could not check pipeline enabled status, defaulting to enabled');
    return true;
  }
}

export async function getTelegramCommandState() {
  return get('/api/ai/telegram');
}

export async function setTelegramListening(chatId, enabled) {
  return post('/api/ai/telegram', {
    action: 'set_listening',
    chatId: String(chatId),
    enabled: Boolean(enabled)
  });
}

export async function setTelegramUpdateOffset(offset) {
  return post('/api/ai/telegram', {
    action: 'set_offset',
    offset: Number(offset)
  });
}

export async function createTelegramMarket({ question, description, outcomes, closeTime, makeLive, requestedBy }) {
  return post('/api/ai/telegram', {
    action: 'create_market',
    question,
    description,
    outcomes,
    closeTime,
    makeLive,
    requestedBy
  });
}
