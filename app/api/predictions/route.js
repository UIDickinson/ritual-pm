import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId, marketId, outcomeId, stakeAmount } = await request.json();

    // Validate input
    if (!userId || !marketId || !outcomeId || !stakeAmount) {
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

    // Get user balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('points_balance')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.points_balance < stake) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      );
    }

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

    // Start transaction-like operations
    // 1. Deduct points from user
    const { error: balanceError } = await supabase
      .from('users')
      .update({ points_balance: user.points_balance - stake })
      .eq('id', userId);

    if (balanceError) throw balanceError;

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
      // Rollback: restore user balance
      await supabase
        .from('users')
        .update({ points_balance: user.points_balance })
        .eq('id', userId);
      throw predictionError;
    }

    // 3. Update outcome total_staked
    const { data: currentOutcome } = await supabase
      .from('outcomes')
      .select('total_staked')
      .eq('id', outcomeId)
      .single();

    const newTotal = parseFloat(currentOutcome.total_staked) + netStake;
    
    const { error: outcomeUpdateError } = await supabase
      .from('outcomes')
      .update({ total_staked: newTotal })
      .eq('id', outcomeId);

    if (outcomeUpdateError) throw outcomeUpdateError;

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
      newBalance: user.points_balance - stake
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

    let query = supabase
      .from('predictions')
      .select(`
        *,
        user:users!predictions_user_id_fkey(id, username),
        market:markets!predictions_market_id_fkey(id, question, status),
        outcome:outcomes!predictions_outcome_id_fkey(id, outcome_text)
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (marketId) {
      query = query.eq('market_id', marketId);
    }

    const { data: predictions, error } = await query;

    if (error) throw error;

    return NextResponse.json({ predictions });

  } catch (error) {
    console.error('Get predictions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}
