import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAiServiceAuth } from '@/lib/aiServiceAuth';

const DEFAULT_MODEL_NAME = 'engagement_v1';

export async function GET(request) {
  const auth = requireAiServiceAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const modelName = searchParams.get('modelName') || DEFAULT_MODEL_NAME;

    const { data: model, error } = await supabase
      .from('ai_model_configs')
      .select('*')
      .eq('model_name', modelName)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!model) {
      return NextResponse.json(
        { error: `No active model config found for ${modelName}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ model });
  } catch (error) {
    console.error('Get model config error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model config' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = requireAiServiceAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { modelName = DEFAULT_MODEL_NAME, weights, thresholds, metadata = {} } = await request.json();

    if (!weights || !thresholds) {
      return NextResponse.json(
        { error: 'weights and thresholds are required' },
        { status: 400 }
      );
    }

    const { data: current, error: currentError } = await supabase
      .from('ai_model_configs')
      .select('id, version')
      .eq('model_name', modelName)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentError) throw currentError;

    const nextVersion = current ? Number(current.version) + 1 : 1;

    if (current) {
      const { error: deactivateError } = await supabase
        .from('ai_model_configs')
        .update({ is_active: false })
        .eq('id', current.id);

      if (deactivateError) throw deactivateError;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('ai_model_configs')
      .insert({
        model_name: modelName,
        version: nextVersion,
        is_active: true,
        weights,
        thresholds,
        metadata
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    await supabase
      .from('ai_feedback_events')
      .insert({
        event_type: 'model_weights_updated',
        payload: {
          model_name: modelName,
          version: nextVersion,
          weights,
          thresholds,
          metadata
        },
        event_timestamp: new Date().toISOString()
      });

    return NextResponse.json({ success: true, model: inserted });
  } catch (error) {
    console.error('Update model config error:', error);
    return NextResponse.json(
      { error: 'Failed to update model config' },
      { status: 500 }
    );
  }
}
