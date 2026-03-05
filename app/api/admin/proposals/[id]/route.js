import { getServiceSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { action, edits, rejectionReason } = body;

    if (!['approve', 'edit_approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Expected approve, edit_approve, or reject.' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const { data: proposal, error: proposalError } = await supabase
      .from('market_proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    let updatePayload = {
      reviewed_by: session.userId,
      updated_at: new Date().toISOString()
    };

    if (action === 'approve') {
      updatePayload.status = 'approved';
      updatePayload.rejection_reason = null;
    }

    if (action === 'edit_approve') {
      updatePayload = {
        ...updatePayload,
        status: 'edited',
        rejection_reason: null,
        title: edits?.title || proposal.title,
        description: edits?.description || proposal.description,
        outcomes: edits?.outcomes || proposal.outcomes,
        resolution_criteria: edits?.resolutionCriteria || proposal.resolution_criteria,
        resolution_date: edits?.resolutionDate || proposal.resolution_date,
        categories: edits?.categories || proposal.categories
      };
    }

    if (action === 'reject') {
      if (!rejectionReason || rejectionReason.trim().length < 3) {
        return NextResponse.json(
          { error: 'rejectionReason is required when rejecting' },
          { status: 400 }
        );
      }
      updatePayload.status = 'rejected';
      updatePayload.rejection_reason = rejectionReason.trim();
    }

    const { data: updatedProposal, error: updateError } = await supabase
      .from('market_proposals')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    if (action === 'reject') {
      await supabase
        .from('ai_topics')
        .update({ status: 'rejected' })
        .eq('id', proposal.topic_id);
    }

    if (action === 'approve' || action === 'edit_approve') {
      await supabase
        .from('ai_topics')
        .update({ status: 'approved' })
        .eq('id', proposal.topic_id);
    }

    await supabase.rpc('log_activity', {
      p_user_id: session.userId,
      p_action_type: `proposal_${action}`,
      p_target_id: id,
      p_details: {
        topic_id: proposal.topic_id,
        previous_status: proposal.status,
        new_status: updatePayload.status,
        rejection_reason: updatePayload.rejection_reason || null
      }
    });

    return NextResponse.json({
      success: true,
      proposal: updatedProposal
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Update proposal error:', error);
    return NextResponse.json(
      { error: 'Failed to update proposal' },
      { status: 500 }
    );
  }
}
