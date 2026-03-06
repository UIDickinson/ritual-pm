import {
  castTelegramVote,
  createTelegramMarket,
  getMarketContext,
  getModelConfig,
  getTelegramBalance,
  getTelegramCommandState,
  getTelegramProposals,
  ingestMessages,
  isPipelineEnabled,
  linkTelegramAccount,
  resolveTelegramUser,
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

async function deleteMessage(botToken, chatId, messageId) {
  try {
    await telegramApiCall(botToken, 'deleteMessage', {
      chat_id: chatId,
      message_id: messageId
    });
  } catch {
    // Message may already be deleted or too old
  }
}

async function editMessageReplyMarkup(botToken, chatId, messageId, replyMarkup) {
  try {
    await telegramApiCall(botToken, 'editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup || { inline_keyboard: [] }
    });
  } catch {
    // Message may have been deleted or markup unchanged
  }
}

function scheduleDelete(botToken, chatId, messageId, delayMs = 60000) {
  setTimeout(() => deleteMessage(botToken, chatId, messageId), delayMs);
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
  const outcomesText = parts[3] || null;

  if (!question) return null;

  let closeTime = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
  if (closeDateText) {
    const parsed = new Date(closeDateText);
    if (!Number.isNaN(parsed.getTime())) {
      closeTime = parsed;
    }
  }

  let outcomes = ['Yes', 'No'];
  if (outcomesText) {
    const custom = outcomesText.split(',').map((o) => o.trim()).filter(Boolean);
    if (custom.length >= 2 && custom.length <= 5) {
      outcomes = custom;
    } else {
      return { error: 'outcomes_invalid' };
    }
  }

  return {
    question,
    description,
    closeTime: closeTime.toISOString(),
    outcomes
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
  const msgChatId = callbackQuery.message?.chat?.id;
  const msgId = callbackQuery.message?.message_id;

  // Remove the selection buttons immediately
  await editMessageReplyMarkup(botToken, msgChatId, msgId, { inline_keyboard: [] });

  try {
    const markets = await listMarketsForStatus(status);
    const text = formatMarketList(status, markets);
    await sendMessage(botToken, msgChatId, text);
    await answerCallback(botToken, callbackQuery.id, `Loaded ${status} markets`);
  } catch (error) {
    await answerCallback(botToken, callbackQuery.id, 'Failed to load markets');
    await sendMessage(botToken, msgChatId, `Failed to list markets: ${error.message}`);
  }
}

async function handleVoteCallback(botToken, callbackQuery) {
  const callbackData = String(callbackQuery.data || '');
  const [, vote, marketId] = callbackData.split(':');
  const telegramUserId = callbackQuery.from?.id;
  const msgChatId = callbackQuery.message?.chat?.id;
  const msgId = callbackQuery.message?.message_id;

  if (!telegramUserId || !marketId || !['approve', 'reject'].includes(vote)) {
    await answerCallback(botToken, callbackQuery.id, 'Invalid vote action');
    return;
  }

  // Remove buttons immediately
  await editMessageReplyMarkup(botToken, msgChatId, msgId, { inline_keyboard: [] });

  try {
    const result = await castTelegramVote({ telegramUserId, marketId, vote });

    if (result.error === 'not_linked') {
      await answerCallback(botToken, callbackQuery.id, 'Link your account first with /link');
      return;
    }

    let text = `✅ Vote recorded: *${vote}*`;
    if (result.approved) {
      text += '\n🎉 Market has been approved!';
    }
    text += `\nTotal approvals: ${result.approvals || 0}`;

    await answerCallback(botToken, callbackQuery.id, `Voted: ${vote}`);
    await sendMessage(botToken, msgChatId, text);
  } catch (error) {
    const errMsg = error.message || '';
    if (errMsg.includes('already_voted')) {
      await answerCallback(botToken, callbackQuery.id, 'You already voted on this market');
    } else if (errMsg.includes('not_linked')) {
      await answerCallback(botToken, callbackQuery.id, 'Link your account first with /link');
    } else {
      await answerCallback(botToken, callbackQuery.id, 'Vote failed');
      await sendMessage(botToken, msgChatId, `Vote failed: ${error.message}`);
    }
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
  const isDM = chatType === 'private';
  const websiteUrl = process.env.RITUAL_WEBSITE_URL || process.env.RITUAL_API_BASE_URL || 'https://ritual-market.vercel.app';

  if (command === '/start') {
    await sendMessage(
      botToken,
      chatId,
      [
        '*Welcome to Ritual Bot* 🎯',
        '',
        'Your gateway to the Ritual prediction market ecosystem.',
        '',
        '*Getting started*',
        `1. Register at ${websiteUrl}/register if you don't have an account yet.`,
        '2. DM me /link username password to connect your account.',
        '3. Use the commands below to participate!',
        '',
        '*Account (DM only)*',
        '/link - Connect your Ritual account',
        '/balance - Check your balance & stats',
        '/create - Submit a market proposal',
        '',
        '*Markets (anywhere)*',
        '/vote - Vote on proposed markets',
        '/list - Browse Proposed or Live markets',
        '',
        '*Group tools*',
        '/listen - Start message ingestion',
        '/stop - Stop message ingestion',
        '/peek - Analyze recent chat for market ideas',
        '',
        'Tap an option below or type a command anytime.'
      ].join('\n'),
      {
        reply_markup: {
          keyboard: [
            [{ text: '/Link' }, { text: '/Balance' }],
            [{ text: '/Vote' }, { text: '/List' }],
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
        '*Account (DM only)*',
        '/link username password - Connect your Ritual account',
        '/balance - View balance, predictions & stats',
        '',
        '*Markets*',
        '/vote - Vote on proposed markets (approve/reject)',
        '/create question | description | date | options - Submit a market proposal (DM only)',
        '/list - Choose between Proposed and Live markets',
        '',
        '*Group tools*',
        '/listen - Start ingestion for this group/channel',
        '/stop - Stop ingestion for this group/channel',
        '/peek - Quick analysis of recent messages',
        '',
        '*Examples*',
        '_Yes/No:_ /create Will ETH ETF be approved? | SEC decision tracker | 2026-04-01',
        '_Multichoice:_ /create Who wins the election? | 2026 race | 2026-11-05 | Alice, Bob, Charlie',
        '',
        `Don't have an account? Register at ${websiteUrl}/register`
      ].join('\n')
    );
    return;
  }

  if (command === '/link') {
    if (!isDM) {
      await sendMessage(botToken, chatId, '🔒 For security, use /link in a *direct message* with me.');
      return;
    }

    // Delete the user's message containing credentials
    await deleteMessage(botToken, chatId, message.message_id);

    const parts = args.split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      await sendMessage(botToken, chatId, 'Usage: /link username password\n\nYour message has been deleted for security.');
      return;
    }

    const [username, password] = parts;

    try {
      const result = await linkTelegramAccount({
        username,
        password,
        telegramUserId: userId
      });

      if (result.success) {
        await sendMessage(
          botToken,
          chatId,
          `✅ Account linked successfully!\n\nWelcome, *${result.user.username}*\nBalance: *${Number(result.user.points_balance).toFixed(2)} pts*\nRole: ${result.user.role}\n\nYour credentials have been deleted from chat.`
        );
      } else {
        await sendMessage(botToken, chatId, '❌ Linking failed. Please check your credentials and try again.');
      }
    } catch (error) {
      const errMsg = error.message || '';
      if (errMsg.includes('invalid_credentials')) {
        await sendMessage(
          botToken,
          chatId,
          `❌ Invalid username or password.\n\nDon't have an account? Register at ${websiteUrl}/register`
        );
      } else if (errMsg.includes('telegram_already_linked')) {
        await sendMessage(botToken, chatId, '❌ This Telegram account is already linked to another Ritual account.');
      } else {
        await sendMessage(botToken, chatId, `❌ Linking failed: ${error.message}`);
      }
    }
    return;
  }

  if (command === '/balance') {
    if (!isDM) {
      await sendMessage(botToken, chatId, '🔒 Use /balance in a *direct message* with me.');
      return;
    }

    try {
      const result = await getTelegramBalance(userId);

      if (result.error === 'not_linked') {
        await sendMessage(
          botToken,
          chatId,
          `Your Telegram account is not linked to a Ritual account.\n\nUse /link username password to connect.\nOr register at ${websiteUrl}/register`
        );
        return;
      }

      const { user, stats } = result;
      await sendMessage(
        botToken,
        chatId,
        [
          `*${user.username}* — Account Summary`,
          '',
          `💰 Balance: *${Number(user.points_balance).toFixed(2)} pts*`,
          `📊 Predictions: ${stats.total_predictions}`,
          `✅ Wins: ${stats.wins}`,
          `❌ Losses: ${stats.losses}`,
          `🗳️ Votes cast: ${stats.total_votes}`,
          `👤 Role: ${user.role}`
        ].join('\n')
      );
    } catch (error) {
      const errMsg = error.message || '';
      if (errMsg.includes('not_linked')) {
        await sendMessage(
          botToken,
          chatId,
          `Your Telegram account is not linked.\nUse /link username password to connect.\nOr register at ${websiteUrl}/register`
        );
      } else {
        await sendMessage(botToken, chatId, `Failed to fetch balance: ${error.message}`);
      }
    }
    return;
  }

  if (command === '/vote') {
    try {
      // Check if user is linked
      let linked = false;
      try {
        const userResult = await resolveTelegramUser(userId);
        linked = userResult.success;
      } catch {
        linked = false;
      }

      if (!linked) {
        await sendMessage(
          botToken,
          chatId,
          `You need to link your Ritual account first.\nDM me /link username password\nOr register at ${websiteUrl}/register`
        );
        return;
      }

      const result = await getTelegramProposals(userId);
      const proposals = result.proposals || [];

      if (!proposals.length) {
        await sendMessage(botToken, chatId, 'No proposed markets to vote on right now.');
        return;
      }

      for (const proposal of proposals) {
        if (proposal.already_voted) continue;

        const closeDate = proposal.close_time ? new Date(proposal.close_time).toISOString().slice(0, 10) : 'n/a';
        const text = `🗳️ *${proposal.question}*\nCloses: ${closeDate}`;

        const sent = await sendMessage(botToken, chatId, text, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Approve', callback_data: `vote:approve:${proposal.id}` },
                { text: '❌ Reject', callback_data: `vote:reject:${proposal.id}` }
              ]
            ]
          }
        });

        // Auto-delete vote messages after 1 minute
        if (sent?.message_id) {
          scheduleDelete(botToken, chatId, sent.message_id, 60000);
        }
      }

      const votableCount = proposals.filter((p) => !p.already_voted).length;
      if (votableCount === 0) {
        await sendMessage(botToken, chatId, "You've already voted on all current proposals. Check back later!");
      }
    } catch (error) {
      await sendMessage(botToken, chatId, `Failed to load proposals: ${error.message}`);
    }
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
    if (!isDM) {
      await sendMessage(botToken, chatId, '🔒 Use /create in a *direct message* with me to take your time composing the market.');
      return;
    }

    const parsed = parseCreateArgs(args);
    if (!parsed) {
      await sendMessage(botToken, chatId, 'Usage: /create question | description | YYYY-MM-DD | options\n\n_Yes/No (default):_\n/create Will ETH ETF be approved? | SEC decision | 2026-04-01\n\n_Multichoice (2-5 options):_\n/create Who wins? | Election race | 2026-11-05 | Alice, Bob, Charlie');
      return;
    }

    if (parsed.error === 'outcomes_invalid') {
      await sendMessage(botToken, chatId, '❌ Multichoice markets need 2 to 5 comma-separated options.\n\nExample: /create Who wins? | desc | 2026-12-01 | Option A, Option B, Option C');
      return;
    }

    // Require linked account for /create
    let linkedUser = null;
    try {
      const userResult = await resolveTelegramUser(userId);
      if (userResult.success) linkedUser = userResult.user;
    } catch {
      // not linked
    }

    if (!linkedUser) {
      await sendMessage(
        botToken,
        chatId,
        `You need to link your Ritual account before creating markets.\nUse /link username password\nOr register at ${websiteUrl}/register`
      );
      return;
    }

    const result = await createTelegramMarket({
      ...parsed,
      makeLive: false,
      requestedBy: {
        telegramUserId: userId || null,
        telegramUsername: message.from?.username || null,
        chatId,
        chatType,
        command: '/create',
        linkedUserId: linkedUser.id
      }
    });

    await sendMessage(
      botToken,
      chatId,
      `✅ Market proposal submitted: *${result.market?.question || parsed.question}*\n\nIt will go through community voting before going live.`
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

    if (update.callback_query?.data?.startsWith('vote:')) {
      await handleVoteCallback(botToken, update.callback_query);
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
