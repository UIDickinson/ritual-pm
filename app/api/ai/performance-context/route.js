import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAiServiceAuth } from '@/lib/aiServiceAuth';

const LOOKBACK_HOURS_DEFAULT = 72;

export async function GET(request) {
  const auth = requireAiServiceAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const lookbackHours = Number(searchParams.get('lookbackHours') || LOOKBACK_HOURS_DEFAULT);
    const cutoff = new Date(Date.now() - (lookbackHours * 60 * 60 * 1000)).toISOString();

    const { data: proposals, error: proposalsError } = await supabase
      .from('market_proposals')
      .select('id, topic_id, market_id, title, engagement_score, ai_confidence, status, created_at')
      .not('market_id', 'is', null)
      .lte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(500);

    if (proposalsError) throw proposalsError;

    const marketIds = (proposals || []).map((proposal) => proposal.market_id).filter(Boolean);

    let predictions = [];
    if (marketIds.length > 0) {
      const { data: predictionRows, error: predictionError } = await supabase
        .from('predictions')
        .select('market_id, user_id, stake_amount, created_at')
        .in('market_id', marketIds);

      if (predictionError) throw predictionError;
      predictions = predictionRows || [];
    }

    const predictionsByMarket = predictions.reduce((acc, row) => {
      const marketId = row.market_id;
      if (!acc[marketId]) {
        acc[marketId] = {
          totalTrades: 0,
          totalVolume: 0,
          uniqueUsers: new Set(),
          firstTradeAt: null
        };
      }

      const entry = acc[marketId];
      entry.totalTrades += 1;
      entry.totalVolume += Number(row.stake_amount || 0);
      entry.uniqueUsers.add(row.user_id);

      const createdAt = row.created_at;
      if (!entry.firstTradeAt || new Date(createdAt) < new Date(entry.firstTradeAt)) {
        entry.firstTradeAt = createdAt;
      }

      return acc;
    }, {});

    const proposalPerformance = (proposals || []).map((proposal) => {
      const metrics = predictionsByMarket[proposal.market_id] || {
        totalTrades: 0,
        totalVolume: 0,
        uniqueUsers: new Set(),
        firstTradeAt: null
      };

      const timeToFirstTradeHours = metrics.firstTradeAt
        ? (new Date(metrics.firstTradeAt).getTime() - new Date(proposal.created_at).getTime()) / (1000 * 60 * 60)
        : null;

      return {
        proposalId: proposal.id,
        marketId: proposal.market_id,
        predictedEngagementScore: Number(proposal.engagement_score || 0),
        aiConfidence: Number(proposal.ai_confidence || 0),
        status: proposal.status,
        createdAt: proposal.created_at,
        actual: {
          totalTrades: metrics.totalTrades,
          totalVolume: Number(metrics.totalVolume.toFixed(2)),
          uniqueTraders: metrics.uniqueUsers.size,
          timeToFirstTradeHours: timeToFirstTradeHours !== null ? Number(timeToFirstTradeHours.toFixed(2)) : null
        }
      };
    });

    return NextResponse.json({
      lookbackHours,
      proposalCount: proposalPerformance.length,
      proposalPerformance
    });
  } catch (error) {
    console.error('Performance context error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance context' },
      { status: 500 }
    );
  }
}
