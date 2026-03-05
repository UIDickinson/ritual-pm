import { getServiceSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = getServiceSupabase();

    const { data: rows, error } = await supabase
      .from('platform_settings')
      .select('key, value');

    if (error) {
      console.error('Get settings error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    // Convert rows to flat object: { min_approval_votes: 10, ... }
    const settings = {};
    for (const row of rows || []) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ settings });

  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const session = await requireAdmin();
    const { settings } = await request.json();

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'settings object is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Update each setting individually by key
    const errors = [];
    for (const [key, value] of Object.entries(settings)) {
      const { error: updateError } = await supabase
        .from('platform_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);

      if (updateError) {
        errors.push({ key, error: updateError.message });
      }
    }

    if (errors.length > 0) {
      console.error('Update settings errors:', errors);
      return NextResponse.json(
        { error: 'Some settings failed to update', details: errors },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_user_id: session.userId,
      p_action_type: 'update_settings',
      p_target_id: session.userId,
      p_details: settings
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
