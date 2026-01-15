import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { userId, vote } = await request.json();

    // Validate input
    if (!userId || !vote) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(vote)) {
      return NextResponse.json(
        { error: 'Vote must be approve or reject' },
        { status: 400 }
      );
    }

    // Check if market exists and is in proposed status
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('id, status, creator_id, approval_deadline')
      .eq('id', id)
      .single();

    if (marketError || !market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    if (market.status !== 'proposed') {
      return NextResponse.json(
        { error: 'Market is not in proposed status' },
        { status: 400 }
      );
    }

    // Check if user is the creator (can't vote on own market)
    if (market.creator_id === userId) {
      return NextResponse.json(
        { error: 'Cannot vote on your own market' },
        { status: 403 }
      );
    }

    // Check if approval deadline has passed
    if (market.approval_deadline && new Date(market.approval_deadline) < new Date()) {
      return NextResponse.json(
        { error: 'Approval deadline has passed' },
        { status: 400 }
      );
    }

    // Check if user has already voted
    const { data: existingVote } = await supabase
      .from('approval_votes')
      .select('id')
      .eq('market_id', id)
      .eq('user_id', userId)
      .single();

    if (existingVote) {
      return NextResponse.json(
        { error: 'You have already voted on this market' },
        { status: 409 }
      );
    }

    // Insert vote
    const { data: newVote, error: voteError } = await supabase
      .from('approval_votes')
      .insert([
        {
          market_id: id,
          user_id: userId,
          vote
        }
      ])
      .select()
      .single();

    if (voteError) throw voteError;

    // Count approval votes
    const { data: votes } = await supabase
      .from('approval_votes')
      .select('vote')
      .eq('market_id', id);

    const approvals = votes?.filter(v => v.vote === 'approve').length || 0;
    const rejections = votes?.filter(v => v.vote === 'reject').length || 0;

    // Check if market should be approved (10+ approvals)
    let statusUpdate = null;
    if (approvals >= 10) {
      const { error: updateError } = await supabase
        .from('markets')
        .update({ status: 'approved' })
        .eq('id', id);

      if (!updateError) {
        statusUpdate = 'approved';
        
        // Log activity
        await supabase.rpc('log_activity', {
          p_user_id: userId,
          p_action_type: 'market_approved',
          p_target_id: id,
          p_details: { approvals, rejections }
        });
      }
    }

    // Log vote activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'approval_vote_cast',
      p_target_id: id,
      p_details: { vote }
    });

    return NextResponse.json({
      success: true,
      vote: newVote,
      approvals,
      rejections,
      statusUpdate
    });

  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Failed to cast vote' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const { data: votes, error } = await supabase
      .from('approval_votes')
      .select(`
        id,
        vote,
        created_at,
        user:users!approval_votes_user_id_fkey(id, username)
      `)
      .eq('market_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const approvals = votes?.filter(v => v.vote === 'approve').length || 0;
    const rejections = votes?.filter(v => v.vote === 'reject').length || 0;

    return NextResponse.json({
      votes,
      summary: {
        approvals,
        rejections,
        total: votes?.length || 0
      }
    });

  } catch (error) {
    console.error('Get votes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    );
  }
}
