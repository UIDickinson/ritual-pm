import { getServiceSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const { winningOutcomeId, resolutionReason } = await request.json();

    // Validate input
    if (!winningOutcomeId || !resolutionReason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

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
        resolved_by: session.userId
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Calculate and distribute payouts
    await calculatePayouts(supabase, id, winningOutcomeId);

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: session.userId,
      p_action_type: 'market_resolved',
      p_target_id: id,
      p_details: { winning_outcome_id: winningOutcomeId, reason: resolutionReason }
    });

    return NextResponse.json({
      success: true,
      message: 'Market resolved successfully'
    });

  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Resolve market error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve market' },
      { status: 500 }
    );
  }
}

async function calculatePayouts(supabase, marketId, winningOutcomeId) {
  // Get market bonus pool
  const { data: market } = await supabase
    .from('markets')
    .select('bonus_pool')
    .eq('id', marketId)
    .single();

  const bonusPool = parseFloat(market?.bonus_pool || 0);

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
    await refundAllPredictions(supabase, marketId);
    return;
  }

  // Get all winning predictions
  const { data: winningPredictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('market_id', marketId)
    .eq('outcome_id', winningOutcomeId);

  // Calculate and update payouts for winners
  // Bonus pool is added to losers' stakes as extra winnings for winners
  for (const prediction of winningPredictions) {
    const userStake = parseFloat(prediction.stake_amount);
    const userShare = userStake / winningPool;
    const winnings = userShare * (losingPool + bonusPool);
    const totalPayout = userStake + winnings;

    // Update prediction with payout
    await supabase
      .from('predictions')
      .update({
        payout_amount: totalPayout,
        paid_out: true
      })
      .eq('id', prediction.id);

    // Atomically credit payout
    await supabase.rpc('credit_balance', {
      p_user_id: prediction.user_id,
      p_amount: totalPayout
    });
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

async function refundAllPredictions(supabase, marketId) {
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('market_id', marketId);

  for (const prediction of predictions) {
    // Atomically refund stake
    await supabase.rpc('credit_balance', {
      p_user_id: prediction.user_id,
      p_amount: parseFloat(prediction.stake_amount)
    });

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
