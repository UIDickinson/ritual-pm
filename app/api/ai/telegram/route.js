import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { requireAiServiceAuth } from '@/lib/aiServiceAuth';

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

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('AI telegram action error:', error);
    return NextResponse.json({ error: 'Failed to process Telegram action' }, { status: 500 });
  }
}
