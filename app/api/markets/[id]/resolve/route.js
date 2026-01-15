import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { userId, winningOutcomeId, resolutionReason } = await request.json();

    // Validate input
    if (!userId || !winningOutcomeId || !resolutionReason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user is admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Check market status
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('id, status, close_time')
      .eq('id', id)
      .single();

    if (marketError || !market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    if (market.status !== 'closed') {
      return NextResponse.json(
        { error: 'Market must be closed before resolution' },
        { status: 400 }
      );
    }

    // Verify outcome belongs to market
    const { data: outcome, error: outcomeError } = await supabase
      .from('outcomes')
      .select('id, market_id')
      .eq('id', winningOutcomeId)
      .eq('market_id', id)
      .single();

    if (outcomeError || !outcome) {
      return NextResponse.json(
        { error: 'Invalid outcome for this market' },
        { status: 400 }
      );
    }

    // Update market to resolved
    const { error: updateError } = await supabase
      .from('markets')
      .update({
        status: 'resolved',
        winning_outcome_id: winningOutcomeId,
        resolution_reason: resolutionReason,
        resolution_time: new Date().toISOString(),
        resolved_by: userId
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Calculate and distribute payouts
    await calculatePayouts(id, winningOutcomeId);

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'market_resolved',
      p_target_id: id,
      p_details: { winning_outcome_id: winningOutcomeId, reason: resolutionReason }
    });

    return NextResponse.json({
      success: true,
      message: 'Market resolved successfully'
    });

  } catch (error) {
    console.error('Resolve market error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve market' },
      { status: 500 }
    );
  }
}

async function calculatePayouts(marketId, winningOutcomeId) {
  // Get all outcomes and their totals
  const { data: outcomes } = await supabase
    .from('outcomes')
    .select('id, total_staked')
    .eq('market_id', marketId);

  const winningOutcome = outcomes.find(o => o.id === winningOutcomeId);
  const winningPool = parseFloat(winningOutcome.total_staked);

  // Calculate total losing pool
  const losingPool = outcomes
    .filter(o => o.id !== winningOutcomeId)
    .reduce((sum, o) => sum + parseFloat(o.total_staked), 0);

  // If no one bet on winning outcome, refund all
  if (winningPool === 0) {
    await refundAllPredictions(marketId);
    return;
  }

  // Get all winning predictions
  const { data: winningPredictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('market_id', marketId)
    .eq('outcome_id', winningOutcomeId);

  // Calculate and update payouts for winners
  for (const prediction of winningPredictions) {
    const userStake = parseFloat(prediction.stake_amount);
    const userShare = userStake / winningPool;
    const winnings = userShare * losingPool;
    const totalPayout = userStake + winnings;

    // Update prediction with payout
    await supabase
      .from('predictions')
      .update({
        payout_amount: totalPayout,
        paid_out: true
      })
      .eq('id', prediction.id);

    // Add payout to user balance
    const { data: currentUser } = await supabase
      .from('users')
      .select('points_balance')
      .eq('id', prediction.user_id)
      .single();

    await supabase
      .from('users')
      .update({
        points_balance: parseFloat(currentUser.points_balance) + totalPayout
      })
      .eq('id', prediction.user_id);
  }

  // Mark losing predictions as paid out with 0 payout
  const losingOutcomeIds = outcomes
    .filter(o => o.id !== winningOutcomeId)
    .map(o => o.id);

  if (losingOutcomeIds.length > 0) {
    await supabase
      .from('predictions')
      .update({
        payout_amount: 0,
        paid_out: true
      })
      .eq('market_id', marketId)
      .in('outcome_id', losingOutcomeIds);
  }
}

async function refundAllPredictions(marketId) {
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('market_id', marketId);

  for (const prediction of predictions) {
    // Refund stake to user
    const { data: currentUser } = await supabase
      .from('users')
      .select('points_balance')
      .eq('id', prediction.user_id)
      .single();

    await supabase
      .from('users')
      .update({
        points_balance: parseFloat(currentUser.points_balance) + parseFloat(prediction.stake_amount)
      })
      .eq('id', prediction.user_id);

    // Mark as paid out
    await supabase
      .from('predictions')
      .update({
        payout_amount: prediction.stake_amount,
        paid_out: true
      })
      .eq('id', prediction.id);
  }
}
