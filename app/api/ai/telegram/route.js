import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { requireAiServiceAuth } from '@/lib/aiServiceAuth';
import bcrypt from 'bcryptjs';

const LISTEN_KEY = 'telegram_listen_chat_ids';
const OFFSET_KEY = 'telegram_update_offset';
const CREATOR_KEY = 'telegram_market_creator_user_id';

function normalizeSettingValue(value) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function normalizeListenChatIds(value) {
  const normalized = normalizeSettingValue(value);
  if (Array.isArray(normalized)) {
    return normalized.map((chatId) => String(chatId));
  }
  return [];
}

async function getSetting(supabase, key) {
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .single();

  return data?.value;
}

async function upsertSetting(supabase, key, value) {
  const { error } = await supabase
    .from('platform_settings')
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

  if (error) throw error;
}

async function resolveCreatorId(supabase) {
  const envCreator = process.env.TELEGRAM_MARKET_CREATOR_USER_ID;
  if (envCreator) return envCreator;

  const configuredCreator = await getSetting(supabase, CREATOR_KEY);
  if (configuredCreator) {
    return String(normalizeSettingValue(configuredCreator));
  }

  const { data: adminUser } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  return adminUser?.id || null;
}

export async function GET(request) {
  const auth = requireAiServiceAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const [listenValue, offsetValue] = await Promise.all([
      getSetting(supabase, LISTEN_KEY),
      getSetting(supabase, OFFSET_KEY)
    ]);

    return NextResponse.json({
      listenChatIds: normalizeListenChatIds(listenValue),
      updateOffset: Number(normalizeSettingValue(offsetValue) || 0)
    });
  } catch (error) {
    console.error('AI telegram state get error:', error);
    return NextResponse.json({ error: 'Failed to fetch Telegram state' }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = requireAiServiceAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { action } = body || {};
    const supabase = getServiceSupabase();

    if (action === 'set_listening') {
      const chatId = String(body.chatId || '').trim();
      const enabled = Boolean(body.enabled);

      if (!chatId) {
        return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
      }

      const existing = normalizeListenChatIds(await getSetting(supabase, LISTEN_KEY));
      const next = new Set(existing);
      if (enabled) next.add(chatId);
      else next.delete(chatId);

      const listenChatIds = Array.from(next);
      await upsertSetting(supabase, LISTEN_KEY, listenChatIds);

      return NextResponse.json({ success: true, listenChatIds });
    }

    if (action === 'set_offset') {
      const offset = Number(body.offset || 0);
      if (!Number.isFinite(offset) || offset < 0) {
        return NextResponse.json({ error: 'offset must be a non-negative number' }, { status: 400 });
      }

      await upsertSetting(supabase, OFFSET_KEY, offset);
      return NextResponse.json({ success: true, updateOffset: offset });
    }

    if (action === 'create_market') {
      const question = String(body.question || '').trim();
      const description = body.description ? String(body.description).trim() : null;
      const outcomes = Array.isArray(body.outcomes) ? body.outcomes.map((o) => String(o).trim()).filter(Boolean) : ['Yes', 'No'];
      const closeTime = String(body.closeTime || '').trim();
      const makeLive = Boolean(body.makeLive);
      const requestedBy = body.requestedBy || null;

      if (!question || !closeTime) {
        return NextResponse.json({ error: 'question and closeTime are required' }, { status: 400 });
      }

      if (outcomes.length < 2 || outcomes.length > 5) {
        return NextResponse.json({ error: 'outcomes must contain between 2 and 5 options' }, { status: 400 });
      }

      const closeDate = new Date(closeTime);
      if (Number.isNaN(closeDate.getTime()) || closeDate <= new Date()) {
        return NextResponse.json({ error: 'closeTime must be a valid future timestamp' }, { status: 400 });
      }

      const creatorId = await resolveCreatorId(supabase);
      if (!creatorId) {
        return NextResponse.json(
          { error: 'No market creator user configured. Set TELEGRAM_MARKET_CREATOR_USER_ID or create an admin user.' },
          { status: 500 }
        );
      }

      const status = makeLive ? 'live' : 'proposed';
      const metadataSuffix = requestedBy
        ? `\n\n[telegram_request]\nrequested_by=${JSON.stringify(requestedBy)}`
        : '';

      const { data: market, error: marketError } = await supabase
        .from('markets')
        .insert([
          {
            creator_id: creatorId,
            question,
            description: `${description || ''}${metadataSuffix}`.trim() || null,
            status,
            close_time: closeDate.toISOString(),
            approval_deadline: status === 'live' ? null : undefined
          }
        ])
        .select('id, question, status, close_time, created_at')
        .single();

      if (marketError) throw marketError;

      const outcomeRows = outcomes.map((outcomeText, index) => ({
        market_id: market.id,
        outcome_text: outcomeText,
        order_index: index
      }));

      const { error: outcomesError } = await supabase
        .from('outcomes')
        .insert(outcomeRows);

      if (outcomesError) throw outcomesError;

      await supabase.rpc('log_activity', {
        p_user_id: creatorId,
        p_action_type: 'telegram_market_create',
        p_target_id: market.id,
        p_details: {
          status,
          outcomes,
          requested_by: requestedBy
        }
      });

      return NextResponse.json({
        success: true,
        market: {
          ...market,
          outcomes
        }
      });
    }

    if (action === 'link_account') {
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const telegramUserId = Number(body.telegramUserId);

      if (!username || !password || !Number.isFinite(telegramUserId)) {
        return NextResponse.json({ error: 'username, password, and telegramUserId are required' }, { status: 400 });
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, username, password_hash, role, points_balance')
        .eq('username', username)
        .single();

      if (userError || !user) {
        return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
      }

      const { data: existing } = await supabase
        .from('users')
        .select('id, username')
        .eq('telegram_user_id', telegramUserId)
        .single();

      if (existing && existing.id !== user.id) {
        return NextResponse.json({ error: 'telegram_already_linked', linkedUsername: existing.username }, { status: 409 });
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ telegram_user_id: telegramUserId })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        user: { id: user.id, username: user.username, role: user.role, points_balance: user.points_balance }
      });
    }

    if (action === 'get_balance') {
      const telegramUserId = Number(body.telegramUserId);
      if (!Number.isFinite(telegramUserId)) {
        return NextResponse.json({ error: 'telegramUserId is required' }, { status: 400 });
      }

      const { data: user } = await supabase
        .from('users')
        .select('id, username, role, points_balance')
        .eq('telegram_user_id', telegramUserId)
        .single();

      if (!user) {
        return NextResponse.json({ error: 'not_linked' }, { status: 404 });
      }

      const { count: totalPredictions } = await supabase
        .from('predictions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: wins } = await supabase
        .from('predictions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('payout_amount', 0);

      const { count: totalVotes } = await supabase
        .from('approval_votes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      return NextResponse.json({
        success: true,
        user: {
          username: user.username,
          role: user.role,
          points_balance: user.points_balance
        },
        stats: {
          total_predictions: totalPredictions || 0,
          wins: wins || 0,
          losses: (totalPredictions || 0) - (wins || 0),
          total_votes: totalVotes || 0
        }
      });
    }

    if (action === 'get_proposals') {
      const { data: proposals } = await supabase
        .from('markets')
        .select('id, question, status, close_time, created_at')
        .eq('status', 'proposed')
        .order('created_at', { ascending: false })
        .limit(5);

      const telegramUserId = Number(body.telegramUserId);
      let votedMarketIds = [];
      if (Number.isFinite(telegramUserId)) {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_user_id', telegramUserId)
          .single();

        if (user && proposals?.length) {
          const { data: votes } = await supabase
            .from('approval_votes')
            .select('market_id')
            .eq('user_id', user.id)
            .in('market_id', proposals.map((p) => p.id));

          votedMarketIds = (votes || []).map((v) => v.market_id);
        }
      }

      return NextResponse.json({
        success: true,
        proposals: (proposals || []).map((p) => ({
          ...p,
          already_voted: votedMarketIds.includes(p.id)
        }))
      });
    }

    if (action === 'cast_vote') {
      const telegramUserId = Number(body.telegramUserId);
      const marketId = String(body.marketId || '').trim();
      const vote = String(body.vote || '').trim();

      if (!Number.isFinite(telegramUserId) || !marketId || !['approve', 'reject'].includes(vote)) {
        return NextResponse.json({ error: 'telegramUserId, marketId, and vote (approve|reject) are required' }, { status: 400 });
      }

      const { data: user } = await supabase
        .from('users')
        .select('id, username')
        .eq('telegram_user_id', telegramUserId)
        .single();

      if (!user) {
        return NextResponse.json({ error: 'not_linked' }, { status: 404 });
      }

      const { data: market } = await supabase
        .from('markets')
        .select('id, status, creator_id, approval_deadline')
        .eq('id', marketId)
        .single();

      if (!market) {
        return NextResponse.json({ error: 'Market not found' }, { status: 404 });
      }

      if (market.status !== 'proposed') {
        return NextResponse.json({ error: 'Market is not in proposed status' }, { status: 400 });
      }

      if (market.creator_id === user.id) {
        return NextResponse.json({ error: 'Cannot vote on your own market' }, { status: 403 });
      }

      if (market.approval_deadline && new Date(market.approval_deadline) < new Date()) {
        return NextResponse.json({ error: 'Voting deadline has passed' }, { status: 400 });
      }

      const { error: voteError } = await supabase
        .from('approval_votes')
        .insert({ market_id: marketId, user_id: user.id, vote });

      if (voteError) {
        if (voteError.code === '23505') {
          return NextResponse.json({ error: 'already_voted' }, { status: 409 });
        }
        throw voteError;
      }

      const { count: approvals } = await supabase
        .from('approval_votes')
        .select('id', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('vote', 'approve');

      let approved = false;
      const settingValue = await getSetting(supabase, 'min_approval_votes');
      const minVotes = Number(normalizeSettingValue(settingValue) || 10);

      if ((approvals || 0) >= minVotes) {
        await supabase
          .from('markets')
          .update({ status: 'approved' })
          .eq('id', marketId);
        approved = true;
      }

      await supabase.rpc('log_activity', {
        p_user_id: user.id,
        p_action_type: 'approval_vote_cast',
        p_target_id: marketId,
        p_details: { vote, via: 'telegram', telegram_user_id: telegramUserId }
      });

      return NextResponse.json({ success: true, vote, approved, approvals: approvals || 0 });
    }

    if (action === 'resolve_user') {
      const telegramUserId = Number(body.telegramUserId);
      if (!Number.isFinite(telegramUserId)) {
        return NextResponse.json({ error: 'telegramUserId is required' }, { status: 400 });
      }

      const { data: user } = await supabase
        .from('users')
        .select('id, username, role, points_balance')
        .eq('telegram_user_id', telegramUserId)
        .single();

      if (!user) {
        return NextResponse.json({ error: 'not_linked' }, { status: 404 });
      }

      return NextResponse.json({ success: true, user });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('AI telegram action error:', error);
    return NextResponse.json({ error: 'Failed to process Telegram action' }, { status: 500 });
  }
}
