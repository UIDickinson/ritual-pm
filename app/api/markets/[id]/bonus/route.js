import { getServiceSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const { amount } = await request.json();

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid request. Amount must be greater than 0.' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

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

    // Add bonus to the market's bonus_pool (not to outcome stakes)
    // This prevents inflation of total_staked which distorts odds display
    await supabase.rpc('increment_bonus_pool', {
      p_market_id: id,
      p_amount: amount
    });

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: session.userId,
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
    if (error instanceof Response) return error;
    console.error('Add bonus error:', error);
    return NextResponse.json(
      { error: 'Failed to add bonus to market' },
      { status: 500 }
    );
  }
}
