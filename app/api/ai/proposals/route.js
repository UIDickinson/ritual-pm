import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAiServiceAuth } from '@/lib/aiServiceAuth';

export async function POST(request) {
  const auth = requireAiServiceAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { proposals } = await request.json();

    if (!Array.isArray(proposals) || proposals.length === 0) {
      return NextResponse.json(
        { error: 'proposals must be a non-empty array' },
        { status: 400 }
      );
    }

    const invalid = proposals.find((proposal) => {
      return !proposal.topicId || !proposal.title || !proposal.description ||
        !Array.isArray(proposal.outcomes) || proposal.outcomes.length < 2 || proposal.outcomes.length > 5 ||
        !proposal.resolutionCriteria || !proposal.resolutionDate;
    });

    if (invalid) {
      return NextResponse.json(
        { error: 'each proposal must include topicId, title, description, 2-5 outcomes, resolutionCriteria, and resolutionDate' },
        { status: 400 }
      );
    }

    const payload = proposals.map((proposal) => ({
      topic_id: proposal.topicId,
      source_topic_id: proposal.topicId,
      title: proposal.title,
      description: proposal.description,
      outcomes: proposal.outcomes,
      resolution_criteria: proposal.resolutionCriteria,
      resolution_date: proposal.resolutionDate,
      categories: proposal.categories || [],
      ai_confidence: proposal.aiConfidence ?? null,
      engagement_score: proposal.engagementScore ?? null,
      status: 'pending'
    }));

    const { data, error } = await supabase
      .from('market_proposals')
      .insert(payload)
      .select('id, topic_id, status, ai_confidence, engagement_score, created_at');

    if (error) throw error;

    const topicIds = [...new Set(payload.map((proposal) => proposal.topic_id))];
    if (topicIds.length > 0) {
      await supabase
        .from('ai_topics')
        .update({ status: 'proposed' })
        .in('id', topicIds);
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      proposals: data || []
    });
  } catch (error) {
    console.error('AI proposals create error:', error);
    return NextResponse.json(
      { error: 'Failed to create market proposals' },
      { status: 500 }
    );
  }
}
