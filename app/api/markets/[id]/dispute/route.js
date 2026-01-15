import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { userId, reason } = await request.json();

    // Validate input
    if (!userId || !reason || reason.length < 10) {
      return NextResponse.json(
        { error: 'Dispute reason must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Get market
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('status, resolution_time')
      .eq('id', id)
      .single();

    if (marketError || !market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    if (market.status !== 'resolved') {
      return NextResponse.json(
        { error: 'Market must be resolved to file a dispute' },
        { status: 400 }
      );
    }

    // Check if within 24-hour dispute window
    const resolutionTime = new Date(market.resolution_time);
    const now = new Date();
    const hoursSinceResolution = (now - resolutionTime) / (1000 * 60 * 60);

    if (hoursSinceResolution > 24) {
      return NextResponse.json(
        { error: 'Dispute window has closed (24 hours after resolution)' },
        { status: 400 }
      );
    }

    // Check if user already filed a dispute
    const { data: existingDispute } = await supabase
      .from('disputes')
      .select('id')
      .eq('market_id', id)
      .eq('initiated_by', userId)
      .single();

    if (existingDispute) {
      return NextResponse.json(
        { error: 'You have already filed a dispute for this market' },
        { status: 409 }
      );
    }

    // Create dispute
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .insert([
        {
          market_id: id,
          initiated_by: userId,
          reason,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (disputeError) throw disputeError;

    // Update market to disputed
    await supabase
      .from('markets')
      .update({ status: 'disputed' })
      .eq('id', id);

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'dispute_initiated',
      p_target_id: dispute.id,
      p_details: { market_id: id }
    });

    return NextResponse.json({
      success: true,
      dispute
    }, { status: 201 });

  } catch (error) {
    console.error('Create dispute error:', error);
    return NextResponse.json(
      { error: 'Failed to create dispute' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const { data: disputes, error } = await supabase
      .from('disputes')
      .select(`
        *,
        initiator:users!disputes_initiated_by_fkey(id, username),
        decider:users!disputes_decided_by_fkey(id, username)
      `)
      .eq('market_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ disputes });

  } catch (error) {
    console.error('Get disputes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch disputes' },
      { status: 500 }
    );
  }
}
