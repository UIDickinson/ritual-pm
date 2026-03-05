import { getServiceSupabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await requireAdmin();
    const supabase = getServiceSupabase();

    const [
      proposalsResult,
      topicsResult,
      feedbackResult,
      policyResult,
      modelResult
    ] = await Promise.all([
      supabase.from('market_proposals').select('id, status, created_at, ai_confidence, engagement_score'),
      supabase.from('ai_topics').select('id, status, engagement_score, created_at, last_seen'),
      supabase.from('ai_feedback_events').select('id, event_type, event_timestamp'),
      supabase.from('ai_policy_events').select('id, event_type, reason_code, created_at'),
      supabase
        .from('ai_model_configs')
        .select('model_name, version, is_active, weights, thresholds, metadata, updated_at')
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    if (proposalsResult.error || topicsResult.error || feedbackResult.error || policyResult.error || modelResult.error) {
      throw proposalsResult.error || topicsResult.error || feedbackResult.error || policyResult.error || modelResult.error;
    }

    const proposals = proposalsResult.data || [];
    const topics = topicsResult.data || [];
    const feedbackEvents = feedbackResult.data || [];
    const policyEvents = policyResult.data || [];
    const activeModel = modelResult.data || null;

    const proposalStats = {
      total: proposals.length,
      pending: proposals.filter((proposal) => proposal.status === 'pending').length,
      approved: proposals.filter((proposal) => proposal.status === 'approved').length,
      edited: proposals.filter((proposal) => proposal.status === 'edited').length,
      rejected: proposals.filter((proposal) => proposal.status === 'rejected').length,
      avgConfidence: proposals.length
        ? proposals.reduce((sum, proposal) => sum + Number(proposal.ai_confidence || 0), 0) / proposals.length
        : 0,
      avgEngagementScore: proposals.length
        ? proposals.reduce((sum, proposal) => sum + Number(proposal.engagement_score || 0), 0) / proposals.length
        : 0
    };

    const topicStats = {
      total: topics.length,
      detected: topics.filter((topic) => topic.status === 'detected').length,
      scored: topics.filter((topic) => topic.status === 'scored').length,
      filtered: topics.filter((topic) => topic.status === 'filtered').length,
      proposed: topics.filter((topic) => topic.status === 'proposed').length,
      approved: topics.filter((topic) => topic.status === 'approved').length,
      rejected: topics.filter((topic) => topic.status === 'rejected').length
    };

    return NextResponse.json({
      proposalStats,
      topicStats,
      feedbackEventCount: feedbackEvents.length,
      feedbackEventBreakdown: {
        aggregationRuns: feedbackEvents.filter((event) => event.event_type === 'feedback_aggregation_run').length,
        modelUpdates: feedbackEvents.filter((event) => event.event_type === 'model_weights_updated').length
      },
      policyEventCount: policyEvents.length,
      policyReasonCodes: policyEvents.reduce((acc, event) => {
        const key = event.reason_code || 'unspecified';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
      activeModel
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('AI dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI dashboard metrics' },
      { status: 500 }
    );
  }
}
