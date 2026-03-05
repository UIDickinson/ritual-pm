import { getServiceSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await requireAdmin();
    const supabase = getServiceSupabase();

    // Get all users — EXCLUDE password_hash
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, role, points_balance, created_at, last_active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get users error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    return NextResponse.json(users);

  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const session = await requireAdmin();
    const { targetUserId, action, value } = await request.json();

    const supabase = getServiceSupabase();

    // Handle different actions
    let updateData = {};
    
    if (action === 'update_balance') {
      updateData = { points_balance: value };
    } else if (action === 'update_role') {
      if (!['admin', 'member', 'viewer'].includes(value)) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        );
      }
      updateData = { role: value };
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', targetUserId);

    if (updateError) {
      console.error('Update user error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: session.userId,
      p_action_type: action,
      p_target_id: targetUserId,
      p_details: { value }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
