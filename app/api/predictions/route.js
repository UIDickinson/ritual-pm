import { getServiceSupabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { marketId, outcomeId, stakeAmount } = await request.json();
    const userId = session.userId;

    // Validate input
    if (!marketId || !outcomeId || !stakeAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake < 1) {
      return NextResponse.json(
        { error: 'Stake amount must be at least 1 point' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Check market status
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('id, status, close_time')
      .eq('id', marketId)
      .single();

    if (marketError || !market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    if (market.status !== 'live') {
      return NextResponse.json(
        { error: 'Market is not accepting predictions' },
        { status: 400 }
      );
    }

    if (new Date(market.close_time) <= new Date()) {
      return NextResponse.json(
        { error: 'Market has closed' },
        { status: 400 }
      );
    }

    // Verify outcome belongs to market
    const { data: outcome, error: outcomeError } = await supabase
      .from('outcomes')
      .select('id, market_id')
      .eq('id', outcomeId)
      .eq('market_id', marketId)
      .single();

    if (outcomeError || !outcome) {
      return NextResponse.json(
        { error: 'Invalid outcome for this market' },
        { status: 400 }
      );
    }

    // Calculate fee (1%)
    const fee = stake * 0.01;
    const netStake = stake - fee;

    // 1. Atomically deduct balance (prevents double-spend)
    const { data: newBalanceResult, error: deductError } = await supabase
      .rpc('deduct_balance', { p_user_id: userId, p_amount: stake });

    if (deductError) {
      // Could be insufficient balance or user not found
      const msg = deductError.message || '';
      if (msg.includes('Insufficient balance')) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }
      throw deductError;
    }

    const newBalance = newBalanceResult;

    // 2. Create prediction
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .insert([
        {
          user_id: userId,
          market_id: marketId,
          outcome_id: outcomeId,
          stake_amount: netStake,
          fee_paid: fee
        }
      ])
      .select()
      .single();

    if (predictionError) {
      // Rollback: restore balance atomically
      await supabase.rpc('credit_balance', { p_user_id: userId, p_amount: stake });
      throw predictionError;
    }

    // 3. Atomically increment outcome total_staked
    await supabase.rpc('increment_outcome_stake', { p_outcome_id: outcomeId, p_amount: netStake });

    // 4. Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'prediction_placed',
      p_target_id: prediction.id,
      p_details: { market_id: marketId, outcome_id: outcomeId, stake: netStake, fee }
    });

    return NextResponse.json({
      success: true,
      prediction,
      newBalance
    }, { status: 201 });

  } catch (error) {
    console.error('Place prediction error:', error);
    return NextResponse.json(
      { error: 'Failed to place prediction' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const marketId = searchParams.get('marketId');

    const supabase = getServiceSupabase();

    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')) || 50));
    const offset = (page - 1) * limit;

    // Get total count
    let countQuery = supabase.from('predictions').select('id', { count: 'exact', head: true });
    if (userId) countQuery = countQuery.eq('user_id', userId);
    if (marketId) countQuery = countQuery.eq('market_id', marketId);
    const { count: totalCount } = await countQuery;

    let query = supabase
      .from('predictions')
      .select(`
        *,
        user:users!predictions_user_id_fkey(id, username),
        market:markets!predictions_market_id_fkey(id, question, status),
        outcome:outcomes!predictions_outcome_id_fkey(id, outcome_text)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (marketId) {
      query = query.eq('market_id', marketId);
    }

    const { data: predictions, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      predictions,
      pagination: {
        page,
        limit,
        totalCount: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get predictions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}
