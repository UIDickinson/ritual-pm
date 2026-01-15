import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    let query = supabase
      .from('markets')
      .select(`
        *,
        creator:users!markets_creator_id_fkey(id, username, role),
        outcomes:outcomes!outcomes_market_id_fkey(id, outcome_text, total_staked, order_index)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (userId) {
      query = query.eq('creator_id', userId);
    }

    const { data: markets, error } = await query;

    if (error) throw error;

    // Get approval votes count for proposed markets
    const proposedMarkets = markets.filter(m => m.status === 'proposed');
    if (proposedMarkets.length > 0) {
      const marketIds = proposedMarkets.map(m => m.id);
      const { data: votes } = await supabase
        .from('approval_votes')
        .select('market_id, vote')
        .in('market_id', marketIds);

      const votesByMarket = {};
      votes?.forEach(vote => {
        if (!votesByMarket[vote.market_id]) {
          votesByMarket[vote.market_id] = { approve: 0, reject: 0 };
        }
        votesByMarket[vote.market_id][vote.vote]++;
      });

      markets.forEach(market => {
        if (market.status === 'proposed') {
          market.approval_votes = votesByMarket[market.id] || { approve: 0, reject: 0 };
        }
      });
    }

    // Calculate total pool for each market
    markets.forEach(market => {
      market.total_pool = market.outcomes.reduce((sum, outcome) => 
        sum + parseFloat(outcome.total_staked), 0
      );
    });

    return NextResponse.json({ markets });

  } catch (error) {
    console.error('Get markets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { userId, question, description, outcomes, closeTime } = await request.json();

    // Validate input
    if (!userId || !question || !outcomes || !closeTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (outcomes.length < 2 || outcomes.length > 5) {
      return NextResponse.json(
        { error: 'Markets must have between 2 and 5 outcomes' },
        { status: 400 }
      );
    }

    // Validate close time is in the future
    const closeDate = new Date(closeTime);
    if (closeDate <= new Date()) {
      return NextResponse.json(
        { error: 'Close time must be in the future' },
        { status: 400 }
      );
    }

    // Create market
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .insert([
        {
          creator_id: userId,
          question,
          description: description || null,
          status: 'proposed',
          close_time: closeTime
        }
      ])
      .select()
      .single();

    if (marketError) throw marketError;

    // Create outcomes
    const outcomeInserts = outcomes.map((text, index) => ({
      market_id: market.id,
      outcome_text: text,
      order_index: index
    }));

    const { error: outcomesError } = await supabase
      .from('outcomes')
      .insert(outcomeInserts);

    if (outcomesError) throw outcomesError;

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'market_created',
      p_target_id: market.id,
      p_details: { question }
    });

    // Fetch complete market with outcomes
    const { data: completeMarket } = await supabase
      .from('markets')
      .select(`
        *,
        creator:users!markets_creator_id_fkey(id, username, role),
        outcomes:outcomes!outcomes_market_id_fkey(id, outcome_text, total_staked, order_index)
      `)
      .eq('id', market.id)
      .single();

    return NextResponse.json(
      { market: completeMarket },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create market error:', error);
    return NextResponse.json(
      { error: 'Failed to create market' },
      { status: 500 }
    );
  }
}
