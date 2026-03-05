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

    const invalid = events.find((event) => !event.eventType || !event.payload);
    if (invalid) {
      return NextResponse.json(
        { error: 'each event requires eventType and payload' },
        { status: 400 }
      );
    }

    const payload = events.map((event) => ({
      market_id: event.marketId || null,
      proposal_id: event.proposalId || null,
      event_type: event.eventType,
      payload: event.payload,
      event_timestamp: event.eventTimestamp || new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('ai_feedback_events')
      .insert(payload)
      .select('id, event_type, event_timestamp');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      events: data || []
    });
  } catch (error) {
    console.error('AI feedback ingest error:', error);
    return NextResponse.json(
      { error: 'Failed to ingest feedback events' },
      { status: 500 }
    );
  }
}
