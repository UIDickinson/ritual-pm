import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { userId, amount } = await request.json();

    // Validate input
    if (!userId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid request. Amount must be greater than 0.' },
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

    // Get market and verify status
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('id, status, question')
      .eq('id', id)
      .single();

    if (marketError || !market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    if (!['approved', 'live'].includes(market.status)) {
      return NextResponse.json(
        { error: 'Can only add bonus to approved or live markets' },
        { status: 400 }
      );
    }

    // Get the first outcome to add the bonus to
    // This distributes evenly across all outcomes
    const { data: outcomes, error: outcomesError } = await supabase
      .from('outcomes')
      .select('id, total_staked')
      .eq('market_id', id)
      .order('order_index', { ascending: true });

    if (outcomesError || !outcomes || outcomes.length === 0) {
      return NextResponse.json(
        { error: 'No outcomes found for this market' },
        { status: 404 }
      );
    }

    // Distribute bonus evenly across all outcomes
    const bonusPerOutcome = amount / outcomes.length;
    
    for (const outcome of outcomes) {
      const newTotal = parseFloat(outcome.total_staked) + bonusPerOutcome;
      await supabase
        .from('outcomes')
        .update({ total_staked: newTotal })
        .eq('id', outcome.id);
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'admin_bonus_added',
      p_target_id: id,
      p_details: { amount, market_question: market.question }
    });

    return NextResponse.json({
      success: true,
      message: `Added ${amount} pts bonus to market pool`,
      amount
    });

  } catch (error) {
    console.error('Add bonus error:', error);
    return NextResponse.json(
      { error: 'Failed to add bonus to market' },
      { status: 500 }
    );
  }
}
