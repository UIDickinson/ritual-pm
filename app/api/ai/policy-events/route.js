import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAiServiceAuth } from '@/lib/aiServiceAuth';

export async function POST(request) {
  const auth = requireAiServiceAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { events } = await request.json();

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'events must be a non-empty array' },
        { status: 400 }
      );
    }

    const invalid = events.find((event) => !event.eventType);
    if (invalid) {
      return NextResponse.json(
        { error: 'each event requires eventType' },
        { status: 400 }
      );
    }

    const payload = events.map((event) => ({
      source: event.source || null,
      topic_id: event.topicId || null,
      proposal_id: event.proposalId || null,
      event_type: event.eventType,
      reason_code: event.reasonCode || null,
      details: event.details || {}
    }));

    const { data, error } = await supabase
      .from('ai_policy_events')
      .insert(payload)
      .select('id, event_type, reason_code, created_at');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      events: data || []
    });
  } catch (error) {
    console.error('AI policy events ingest error:', error);
    return NextResponse.json(
      { error: 'Failed to ingest policy events' },
      { status: 500 }
    );
  }
}
