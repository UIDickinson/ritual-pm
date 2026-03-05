import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAiServiceAuth } from '@/lib/aiServiceAuth';

export async function POST(request) {
  const auth = requireAiServiceAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { topics } = await request.json();

    if (!Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json(
        { error: 'topics must be a non-empty array' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const payload = topics.map((topic) => ({
      id: topic.id,
      label: topic.label,
      summary: topic.summary,
      entities: topic.entities || [],
      first_seen: topic.firstSeen || now,
      last_seen: topic.lastSeen || now,
      source_breakdown: topic.sourceBreakdown || {},
      message_count: topic.messageCount || 0,
      engagement_score: topic.engagementScore ?? null,
      status: topic.status || 'detected'
    }));

    const invalid = payload.find((topic) => !topic.id || !topic.label || !topic.summary);
    if (invalid) {
      return NextResponse.json(
        { error: 'each topic requires id, label, and summary' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('ai_topics')
      .upsert(payload, { onConflict: 'id' })
      .select('id, status, engagement_score');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      topics: data || []
    });
  } catch (error) {
    console.error('AI topics upsert error:', error);
    return NextResponse.json(
      { error: 'Failed to upsert AI topics' },
      { status: 500 }
    );
  }
}
