import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAiServiceAuth } from '@/lib/aiServiceAuth';

export async function POST(request) {
  const auth = requireAiServiceAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages must be a non-empty array' },
        { status: 400 }
      );
    }

    const payload = messages.map((message) => ({
      source: message.source,
      source_message_id: message.sourceMessageId,
      source_chat_id: message.sourceChatId || null,
      author_hash: message.authorHash,
      text: message.text,
      message_timestamp: message.timestamp,
      engagement: message.engagement || {},
      metadata: message.metadata || {}
    }));

    const invalid = payload.find((message) => {
      return !message.source || !message.source_message_id || !message.author_hash || !message.text || !message.message_timestamp;
    });

    if (invalid) {
      return NextResponse.json(
        { error: 'each message requires source, sourceMessageId, authorHash, text, and timestamp' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('ai_messages')
      .upsert(payload, { onConflict: 'source,source_message_id' })
      .select('id, source, source_message_id, source_chat_id, message_timestamp');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      messages: data || []
    });
  } catch (error) {
    console.error('AI messages upsert error:', error);
    return NextResponse.json(
      { error: 'Failed to upsert AI messages' },
      { status: 500 }
    );
  }
}
