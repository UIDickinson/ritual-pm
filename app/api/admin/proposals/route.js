import { getServiceSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const supabase = getServiceSupabase();

    let query = supabase
      .from('market_proposals')
      .select(`
        *,
        topic:ai_topics!market_proposals_topic_id_fkey(id, label, summary, status, engagement_score, source_breakdown),
        reviewer:users!market_proposals_reviewed_by_fkey(id, username, role),
        market:markets(id, question, status)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: proposals, error } = await query;

    if (error) throw error;

    return NextResponse.json({ proposals: proposals || [] });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Get proposals error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market proposals' },
      { status: 500 }
    );
  }
}
