import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { userId, action } = await request.json();

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

    // Get market
    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select('*')
      .eq('id', id)
      .single();

    if (marketError || !market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    let newStatus = null;
    let activityType = '';

    switch (action) {
      case 'approve':
        if (market.status !== 'proposed') {
          return NextResponse.json(
            { error: 'Only proposed markets can be approved' },
            { status: 400 }
          );
        }
        newStatus = 'approved';
        activityType = 'market_approved';
        break;

      case 'activate':
        if (market.status !== 'approved') {
          return NextResponse.json(
            { error: 'Only approved markets can be activated' },
            { status: 400 }
          );
        }
        newStatus = 'live';
        activityType = 'market_activated';
        break;

      case 'close':
        if (market.status !== 'live') {
          return NextResponse.json(
            { error: 'Only live markets can be closed' },
            { status: 400 }
          );
        }
        newStatus = 'closed';
        activityType = 'market_closed';
        break;

      case 'dissolve':
        if (!['proposed', 'approved'].includes(market.status)) {
          return NextResponse.json(
            { error: 'Only proposed or approved markets can be dissolved' },
            { status: 400 }
          );
        }
        newStatus = 'dissolved';
        activityType = 'market_dissolved';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update market status
    const { error: updateError } = await supabase
      .from('markets')
      .update({ status: newStatus })
      .eq('id', id);

    if (updateError) throw updateError;

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: activityType,
      p_target_id: id,
      p_details: { action, old_status: market.status, new_status: newStatus }
    });

    return NextResponse.json({
      success: true,
      newStatus,
      message: `Market ${action}d successfully`
    });

  } catch (error) {
    console.error('Update market status error:', error);
    return NextResponse.json(
      { error: 'Failed to update market status' },
      { status: 500 }
    );
  }
}
