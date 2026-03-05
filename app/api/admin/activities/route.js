import { getServiceSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const supabase = getServiceSupabase();

    // Get recent activities
    const { data: activities, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        user:users!activity_logs_user_id_fkey(id, username)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Get activities error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    return NextResponse.json(activities);

  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Get activities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}
