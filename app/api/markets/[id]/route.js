import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const { data: market, error } = await supabase
      .from('markets')
      .select(`
        *,
        creator:users!markets_creator_id_fkey(id, username, role),
        outcomes:outcomes!outcomes_market_id_fkey(id, outcome_text, total_staked, order_index)
      `)
      .eq('id', id)
      .single();

    if (error || !market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    // Get approval votes if proposed
    if (market.status === 'proposed') {
      const { data: votes } = await supabase
        .from('approval_votes')
        .select('id, user_id, vote, created_at, users(username)')
        .eq('market_id', id);

      market.approval_votes = {
        approve: votes?.filter(v => v.vote === 'approve').length || 0,
        reject: votes?.filter(v => v.vote === 'reject').length || 0,
        votes: votes || []
      };
    }

    // Get predictions count
    const { count: predictionsCount } = await supabase
      .from('predictions')
      .select('*', { count: 'exact', head: true })
      .eq('market_id', id);

    market.predictions_count = predictionsCount || 0;

    // Calculate total pool
    market.total_pool = market.outcomes.reduce((sum, outcome) => 
      sum + parseFloat(outcome.total_staked), 0
    );

    return NextResponse.json({ market });

  } catch (error) {
    console.error('Get market error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market' },
      { status: 500 }
    );
  }
}
