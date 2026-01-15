import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const { disputeId } = await params;
    const { userId, decision, adminDecision, newWinningOutcomeId } = await request.json();

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

    // Get dispute
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select('*, market:markets!disputes_market_id_fkey(*)')
      .eq('id', disputeId)
      .single();

    if (disputeError || !dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      );
    }

    if (dispute.status !== 'pending') {
      return NextResponse.json(
        { error: 'Dispute has already been decided' },
        { status: 400 }
      );
    }

    // Validate decision
    if (!['upheld', 'overturned', 'invalidated'].includes(decision)) {
      return NextResponse.json(
        { error: 'Invalid decision' },
        { status: 400 }
      );
    }

    // Update dispute
    await supabase
      .from('disputes')
      .update({
        status: decision,
        admin_decision: adminDecision,
        decided_by: userId,
        resolved_at: new Date().toISOString()
      })
      .eq('id', disputeId);

    // Handle different decisions
    if (decision === 'upheld') {
      // Keep original resolution, move to final
      await supabase
        .from('markets')
        .update({ status: 'final' })
        .eq('id', dispute.market_id);
    } else if (decision === 'overturned' && newWinningOutcomeId) {
      // Change winning outcome and recalculate payouts
      // First, reverse original payouts
      await reversePreviousPayouts(dispute.market_id);
      
      // Update market with new winning outcome
      await supabase
        .from('markets')
        .update({
          winning_outcome_id: newWinningOutcomeId,
          status: 'resolved'
        })
        .eq('id', dispute.market_id);

      // Recalculate with new winner
      await recalculatePayouts(dispute.market_id, newWinningOutcomeId);
      
      // Move to final
      await supabase
        .from('markets')
        .update({ status: 'final' })
        .eq('id', dispute.market_id);
    } else if (decision === 'invalidated') {
      // Refund all predictions
      await refundAllPredictions(dispute.market_id);
      
      await supabase
        .from('markets')
        .update({ status: 'final' })
        .eq('id', dispute.market_id);
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'dispute_decided',
      p_target_id: disputeId,
      p_details: { decision, market_id: dispute.market_id }
    });

    return NextResponse.json({
      success: true,
      message: `Dispute ${decision}`
    });

  } catch (error) {
    console.error('Decide dispute error:', error);
    return NextResponse.json(
      { error: 'Failed to decide dispute' },
      { status: 500 }
    );
  }
}

async function reversePreviousPayouts(marketId) {
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('market_id', marketId)
    .eq('paid_out', true);

  for (const prediction of predictions) {
    // Subtract payout from user balance
    const { data: currentUser } = await supabase
      .from('users')
      .select('points_balance')
      .eq('id', prediction.user_id)
      .single();

    await supabase
      .from('users')
      .update({
        points_balance: parseFloat(currentUser.points_balance) - parseFloat(prediction.payout_amount || 0)
      })
      .eq('id', prediction.user_id);

    // Reset prediction
    await supabase
      .from('predictions')
      .update({
        payout_amount: null,
        paid_out: false
      })
      .eq('id', prediction.id);
  }
}

async function recalculatePayouts(marketId, winningOutcomeId) {
  // Get all outcomes
  const { data: outcomes } = await supabase
    .from('outcomes')
    .select('id, total_staked')
    .eq('market_id', marketId);

  const winningOutcome = outcomes.find(o => o.id === winningOutcomeId);
  const winningPool = parseFloat(winningOutcome.total_staked);

  const losingPool = outcomes
    .filter(o => o.id !== winningOutcomeId)
    .reduce((sum, o) => sum + parseFloat(o.total_staked), 0);

  if (winningPool === 0) {
    await refundAllPredictions(marketId);
    return;
  }

  // Get winning predictions
  const { data: winningPredictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('market_id', marketId)
    .eq('outcome_id', winningOutcomeId);

  // Calculate payouts
  for (const prediction of winningPredictions) {
    const userStake = parseFloat(prediction.stake_amount);
    const userShare = userStake / winningPool;
    const winnings = userShare * losingPool;
    const totalPayout = userStake + winnings;

    await supabase
      .from('predictions')
      .update({
        payout_amount: totalPayout,
        paid_out: true
      })
      .eq('id', prediction.id);

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

  // Mark losers
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

    await supabase
      .from('predictions')
      .update({
        payout_amount: prediction.stake_amount,
        paid_out: true
      })
      .eq('id', prediction.id);
  }
}
