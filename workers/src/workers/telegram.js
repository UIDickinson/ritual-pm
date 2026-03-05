import {
  createTelegramMarket,
  getMarketContext,
  getModelConfig,
  getTelegramCommandState,
  ingestMessages,
  isPipelineEnabled,
  setTelegramListening,
  setTelegramUpdateOffset,
  submitPolicyEvents,
  submitProposals,
  upsertTopics
} from '../client/ritualApi.js';
import { enqueueRawMessages } from '../queue/rawQueue.js';
import { computeEngagementScore } from '../pipeline/engagementScorer.js';
import { generateMarketProposal } from '../pipeline/marketGenerator.js';
import { normalizeMessage } from '../pipeline/normalize.js';
import { evaluateSuitability } from '../pipeline/suitabilityFilter.js';
import { buildTopicCandidates } from '../pipeline/topicBuilder.js';

let inMemoryUpdateOffset = 0;
const processedUpdateIds = new Set();
const MAX_TRACKED_UPDATE_IDS = 2000;

function markUpdateProcessed(updateId) {
  if (!Number.isFinite(updateId) || updateId <= 0) return;
  processedUpdateIds.add(updateId);

  if (processedUpdateIds.size > MAX_TRACKED_UPDATE_IDS) {
    const toRemove = processedUpdateIds.size - MAX_TRACKED_UPDATE_IDS;
    let removed = 0;
    for (const id of processedUpdateIds) {
      processedUpdateIds.delete(id);
      removed += 1;
      if (removed >= toRemove) break;
    }
  }
}

function normalizeAllowedChatIds() {
  return new Set(
    (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function extractMessageFromUpdate(update) {
  return update.message || update.channel_post || null;
}

function extractCommand(message) {
  const text = String(message.text || '').trim();
  if (!text.startsWith('/')) return null;

  const [firstToken, ...rest] = text.split(' ');
  const [rawCommand] = firstToken.split('@');
  const command = rawCommand.toLowerCase();
  const args = rest.join(' ').trim();

  return { command, args };
}

function isWithinLastHour(message) {
  const timestampMs = Number(message.date || 0) * 1000;
  if (!timestampMs) return false;
  return timestampMs >= Date.now() - (60 * 60 * 1000);
}

function buildRawMessageFromTelegram(message) {
  const chatId = String(message.chat?.id || '');
  const text = message.text || message.caption || '';

  if (!chatId || !text) return null;

  return {
    source: 'telegram',
    sourceMessageId: `${chatId}:${message.message_id}`,
    sourceChatId: chatId,
    authorId: message.from?.id || message.sender_chat?.id || 'unknown',
    text,
    timestamp: new Date((message.date || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    engagement: {
      likes: 0,
      replies: 0,
      shares: 0,
      reactions: Array.isArray(message.reactions?.results) ? message.reactions.results.length : 0
    },
    metadata: {
      chat_title: message.chat?.title || null,
      chat_type: message.chat?.type || null,
      has_media: Boolean(message.photo || message.video || message.document),
      forward_date: message.forward_date || null
    }
  };
}

async function getTelegramUpdates(botToken, offset, limit) {
  const params = new URLSearchParams({
    timeout: '0',
    limit: String(limit),
    allowed_updates: JSON.stringify(['message', 'channel_post', 'callback_query'])
  });

  if (offset) {
    params.set('offset', String(offset));
  }

  const url = `https://api.telegram.org/bot${botToken}/getUpdates?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Telegram getUpdates failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(`Telegram getUpdates returned not-ok response: ${JSON.stringify(payload)}`);
  }

  return payload.result || [];
}

async function telegramApiCall(botToken, method, params = {}) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new Error(`Telegram API ${method} failed: ${response.status} ${JSON.stringify(payload || {})}`);
  }
  return payload.result;
}

async function sendMessage(botToken, chatId, text, extra = {}) {
  return telegramApiCall(botToken, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    ...extra
  });
}

async function answerCallback(botToken, callbackQueryId, text) {
  return telegramApiCall(botToken, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text
  });
}

async function isGroupAdmin(botToken, chatId, userId) {
  try {
    const member = await telegramApiCall(botToken, 'getChatMember', {
      chat_id: chatId,
      user_id: userId
    });
    return ['creator', 'administrator'].includes(member?.status);
  } catch {
    return false;
  }
}

function parseCreateArgs(args) {
  const parts = args.split('|').map((part) => part.trim()).filter(Boolean);
  const question = parts[0] || '';
  const description = parts[1] || null;
  const closeDateText = parts[2] || null;

  if (!question) return null;

  let closeTime = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
  if (closeDateText) {
    const parsed = new Date(closeDateText);
    if (!Number.isNaN(parsed.getTime())) {
      closeTime = parsed;
    }
  }

  return {
    question,
    description,
    closeTime: closeTime.toISOString(),
    outcomes: ['Yes', 'No']
  };
}

async function listMarketsForStatus(status) {
  const apiBaseUrl = process.env.RITUAL_API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error('RITUAL_API_BASE_URL not configured');
  }

  const response = await fetch(`${apiBaseUrl}/api/markets?status=${encodeURIComponent(status)}&page=1&limit=5`);
  if (!response.ok) {
    throw new Error(`Markets list failed (${response.status})`);
  }

  const payload = await response.json();
  return payload?.markets || [];
}

function formatMarketList(status, markets) {
  if (!markets.length) {
    return `No *${status}* markets found right now.`;
  }

  const lines = markets.map((market, index) => {
    const closeTime = market.close_time ? new Date(market.close_time).toISOString().slice(0, 10) : 'n/a';
    return `${index + 1}. ${market.question}\n   status: ${market.status} • closes: ${closeTime}`;
  });

  return `*${status.toUpperCase()} markets*\n\n${lines.join('\n\n')}`;
}

async function runPeakForChat(chatId, recentRawMessages) {
  if (!recentRawMessages.length) {
    return { topics: 0, proposals: 0, topTitle: null };
  }

  const normalizedMessages = recentRawMessages
    .map(normalizeMessage)
    .filter((message) => message.source && message.sourceMessageId && message.authorHash && message.text);

  if (!normalizedMessages.length) {
    return { topics: 0, proposals: 0, topTitle: null };
  }

  await ingestMessages(normalizedMessages);
  const topicCandidates = buildTopicCandidates(normalizedMessages);

  let reviewScoreThreshold = Number(process.env.TOPIC_SCORE_REVIEW_THRESHOLD || 0.5);
  let highScoreThreshold = Number(process.env.TOPIC_SCORE_HIGH_THRESHOLD || 0.75);
  let duplicateThreshold = Number(process.env.TOPIC_DUPLICATE_THRESHOLD || 0.85);
  let scoringWeights;

  try {
    const modelResponse = await getModelConfig('engagement_v1');
    const activeModel = modelResponse?.model;
    if (activeModel?.weights) scoringWeights = activeModel.weights;
    if (activeModel?.thresholds) {
      reviewScoreThreshold = Number(activeModel.thresholds.review ?? reviewScoreThreshold);
      highScoreThreshold = Number(activeModel.thresholds.high ?? highScoreThreshold);
      duplicateThreshold = Number(activeModel.thresholds.duplicate ?? duplicateThreshold);
    }
  } catch {
    // Keep defaults if model config is unavailable.
  }

  let context = { activeMarketTexts: [], proposalTexts: [] };
  try {
    context = await getMarketContext();
  } catch {
    // Keep empty context fallback.
  }

  const dedupTexts = [
    ...(context.activeMarketTexts || []),
    ...(context.proposalTexts || [])
  ];

  const scoredTopics = await Promise.all(topicCandidates.map(async (topic) => {
    const score = computeEngagementScore(topic, {
      activeSourceCount: 1,
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

    return {
      ...topic,
      engagementScore: score.finalScore,
      suitability,
      status: score.finalScore >= reviewScoreThreshold ? 'scored' : 'filtered'
    };
  }));

  await upsertTopics(scoredTopics);

  const proposalCandidates = scoredTopics
    .filter((topic) => topic.engagementScore >= highScoreThreshold && topic.suitability.suitable)
    .slice(0, 2);

  if (!proposalCandidates.length) {
    return { topics: scoredTopics.length, proposals: 0, topTitle: null };
  }

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

  return {
    topics: scoredTopics.length,
    proposals: proposals.length,
    topTitle: proposals[0]?.title || null
  };
}

async function handleListCallback(botToken, callbackQuery) {
  const callbackData = String(callbackQuery.data || '');
  const [, requestedStatus] = callbackData.split(':');
  const status = requestedStatus === 'proposed' ? 'proposed' : 'live';

  try {
    const markets = await listMarketsForStatus(status);
    const text = formatMarketList(status, markets);
    await sendMessage(botToken, callbackQuery.message?.chat?.id, text);
    await answerCallback(botToken, callbackQuery.id, `Loaded ${status} markets`);
  } catch (error) {
    await answerCallback(botToken, callbackQuery.id, 'Failed to load markets');
    await sendMessage(botToken, callbackQuery.message?.chat?.id, `Failed to list markets: ${error.message}`);
  }
}

async function handleCommand({
  botToken,
  command,
  args,
  message,
  allowedChatIds,
  listenChatIds,
  updates
}) {
  const chatId = String(message.chat?.id || '');
  const chatType = message.chat?.type || 'private';
  const userId = message.from?.id;

  if (command === '/start') {
    await sendMessage(
      botToken,
      chatId,
      [
        '*Welcome to Ritual Bot*',
        '',
        'I help your community discover and create prediction markets from group or channel conversations.',
        '',
        '*How to use*',
        '1. Use /Listen in a group or channel to start ingestion.',
        '2. Use /Peek to analyze recent discussion and generate proposal candidates.',
        '3. Use /Create to submit a market idea directly.',
        '4. Use /List to view Proposed or Live markets.',
        '',
        'Tap an option below or type a command anytime.'
      ].join('\n'),
      {
        reply_markup: {
          keyboard: [
            [{ text: '/Listen' }, { text: '/Stop' }],
            [{ text: '/Peek' }, { text: '/List' }],
            [{ text: '/Create' }, { text: '/Help' }]
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        }
      }
    );
    return;
  }

  if (command === '/help') {
    await sendMessage(
      botToken,
      chatId,
      [
        '*Ritual Bot Commands*',
        '',
        '/Listen - Start ingestion for this group/channel',
        '/Stop - Stop ingestion for this group/channel',
        '/Peek - Quick analysis of recent chat messages to generate proposal candidates',
        '/Create question | optional description | optional YYYY-MM-DD',
        '/List - Choose Proposed or Live markets',
        '/Help - Show this help message',
        '',
        '*Example*',
        '/Create Will ETH ETF be approved? | SEC decision tracker | 2026-04-01'
      ].join('\n')
    );
    return;
  }

  if (command === '/listen') {
    if (!['group', 'supergroup', 'channel'].includes(chatType)) {
      await sendMessage(botToken, chatId, 'Use /Listen inside a group or channel.');
      return;
    }

    if (allowedChatIds.size > 0 && !allowedChatIds.has(chatId)) {
      await sendMessage(botToken, chatId, 'This chat is not in TELEGRAM_ALLOWED_CHAT_IDS. Add it first, then retry /Listen.');
      return;
    }

    await setTelegramListening(chatId, true);
    listenChatIds.add(chatId);
    await sendMessage(botToken, chatId, '✅ Listening started. I will ingest messages from this chat.');
    return;
  }

  if (command === '/stop') {
    await setTelegramListening(chatId, false);
    listenChatIds.delete(chatId);
    await sendMessage(botToken, chatId, '🛑 Listening stopped for this chat.');
    return;
  }

  if (command === '/list') {
    await sendMessage(botToken, chatId, 'Choose which markets to show:', {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Proposed', callback_data: 'list:proposed' },
            { text: 'Live', callback_data: 'list:live' }
          ]
        ]
      }
    });
    return;
  }

  if (command === '/create') {
    const parsed = parseCreateArgs(args);
    if (!parsed) {
      await sendMessage(botToken, chatId, 'Usage: /Create question | optional description | optional YYYY-MM-DD\nExample: /Create Will ETH ETF be approved? | SEC decision tracker | 2026-04-01');
      return;
    }

    const adminInGroup = ['group', 'supergroup', 'channel'].includes(chatType)
      ? await isGroupAdmin(botToken, chatId, userId)
      : false;

    const makeLive = Boolean(adminInGroup);
    const result = await createTelegramMarket({
      ...parsed,
      makeLive,
      requestedBy: {
        telegramUserId: userId || null,
        telegramUsername: message.from?.username || null,
        chatId,
        chatType,
        command: '/create'
      }
    });

    await sendMessage(
      botToken,
      chatId,
      makeLive
        ? `✅ Live market created: *${result.market?.question || parsed.question}*`
        : `✅ Proposed market created: *${result.market?.question || parsed.question}*`
    );
    return;
  }

  if (command === '/peek') {
    const recentMessages = updates
      .map((update) => extractMessageFromUpdate(update))
      .filter(Boolean)
      .filter((candidate) => String(candidate.chat?.id || '') === chatId)
      .filter((candidate) => isWithinLastHour(candidate))
      .filter((candidate) => {
        const maybeCommand = extractCommand(candidate);
        return !maybeCommand;
      })
      .slice(0, 40)
      .map((candidate) => buildRawMessageFromTelegram(candidate))
      .filter(Boolean);

    const peakResult = await runPeakForChat(chatId, recentMessages);
    const topLine = peakResult.topTitle ? `\nTop proposal: ${peakResult.topTitle}` : '';
    await sendMessage(
      botToken,
      chatId,
      `⚡ Peek run complete.\nRecent msgs (1h): ${recentMessages.length}\nTopics: ${peakResult.topics}\nProposals: ${peakResult.proposals}${topLine}`
    );
    return;
  }
}

async function runTelegramWorkerCycle() {
  // Check if pipeline is enabled before running
  const enabled = await isPipelineEnabled();
  if (!enabled) {
    console.log('Telegram worker: AI pipeline is paused — skipping.');
    return;
  }

  const allowedChatIds = normalizeAllowedChatIds();
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const updateLimit = Number(process.env.TELEGRAM_UPDATE_LIMIT || 30);

  if (!botToken) {
    console.log('Telegram worker: TELEGRAM_BOT_TOKEN is not set — skipping Telegram ingestion.');
    return;
  }

  const commandState = await getTelegramCommandState().catch(() => ({ listenChatIds: [], updateOffset: 0 }));
  const listenChatIds = new Set((commandState.listenChatIds || []).map((value) => String(value)));
  const configuredOffset = Number(commandState.updateOffset || process.env.TELEGRAM_UPDATE_OFFSET || 0);
  const updateOffset = Math.max(
    Number.isFinite(configuredOffset) ? configuredOffset : 0,
    Number.isFinite(inMemoryUpdateOffset) ? inMemoryUpdateOffset : 0
  );

  const updates = await getTelegramUpdates(botToken, updateOffset, updateLimit);
  const rawMessages = [];
  let maxUpdateId = updateOffset ? Number(updateOffset) : 0;

  for (const update of updates) {
    const currentUpdateId = Number(update.update_id || 0);
    maxUpdateId = Math.max(maxUpdateId, currentUpdateId);

    if (processedUpdateIds.has(currentUpdateId)) {
      continue;
    }
    markUpdateProcessed(currentUpdateId);

    if (update.callback_query?.data?.startsWith('list:')) {
      await handleListCallback(botToken, update.callback_query);
      continue;
    }

    const message = extractMessageFromUpdate(update);
    if (!message) continue;

    const parsedCommand = extractCommand(message);
    if (parsedCommand) {
      try {
        await handleCommand({
          botToken,
          command: parsedCommand.command,
          args: parsedCommand.args,
          message,
          allowedChatIds,
          listenChatIds,
          updates
        });
      } catch (error) {
        const chatId = String(message.chat?.id || '');
        if (chatId) {
          await sendMessage(botToken, chatId, `Command failed: ${error.message}`);
        }
      }
      continue;
    }

    const rawMessage = buildRawMessageFromTelegram(message);
    if (!rawMessage) continue;

    if (!listenChatIds.has(rawMessage.sourceChatId)) continue;
    if (allowedChatIds.size > 0 && !allowedChatIds.has(rawMessage.sourceChatId)) continue;
    if (!['group', 'supergroup', 'channel'].includes(message.chat?.type || '')) continue;

    rawMessages.push(rawMessage);
  }

  if (maxUpdateId > 0) {
    inMemoryUpdateOffset = Math.max(inMemoryUpdateOffset, maxUpdateId + 1);
  }

  const enqueueResult = await enqueueRawMessages(rawMessages);

  try {
    await submitPolicyEvents([
      {
        source: 'telegram',
        eventType: 'ingestion_run',
        reasonCode: 'ok',
        details: {
          allowed_chat_ids: Array.from(allowedChatIds),
          mode: 'group_and_channel_supported',
          listening_chat_ids: Array.from(listenChatIds),
          updates_seen: updates.length,
          fetched_messages: rawMessages.length,
          enqueued_messages: enqueueResult.enqueued,
          next_offset_hint: maxUpdateId > 0 ? maxUpdateId + 1 : null
        }
      }
    ]);
  } catch (error) {
    console.warn('Telegram worker: failed to submit policy events:', error.message);
  }

  if (maxUpdateId > 0) {
    try {
      await setTelegramUpdateOffset(maxUpdateId + 1);
    } catch (error) {
      console.warn('Telegram worker: failed to persist update offset, using in-memory cursor:', error.message);
    }
  }

  console.log(`Telegram ingestion completed: updates=${updates.length}, fetched=${rawMessages.length}, enqueued=${enqueueResult.enqueued}, next_offset=${maxUpdateId > 0 ? maxUpdateId + 1 : 'n/a'}`);
}

export async function runTelegramWorker() {
  const continuous = (process.env.TELEGRAM_CONTINUOUS || 'true').toLowerCase() !== 'false';
  const pollIntervalMs = Math.max(2000, Number(process.env.TELEGRAM_POLL_INTERVAL_MS || 5000));

  if (!continuous) {
    await runTelegramWorkerCycle();
    return;
  }

  console.log(`Telegram worker running in continuous mode (poll every ${pollIntervalMs}ms)`);

  while (true) {
    try {
      await runTelegramWorkerCycle();
    } catch (error) {
      console.error('Telegram worker cycle failed:', error.message);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}
