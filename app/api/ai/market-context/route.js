import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAiServiceAuth } from '@/lib/aiServiceAuth';

export async function GET(request) {
  const auth = requireAiServiceAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const [marketsResult, proposalsResult] = await Promise.all([
      supabase
        .from('markets')
        .select('id, question, description, status')
        .in('status', ['proposed', 'approved', 'live', 'closed'])
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('market_proposals')
        .select('id, title, description, status')
        .in('status', ['pending', 'approved', 'edited'])
        .order('created_at', { ascending: false })
        .limit(500)
    ]);

    if (marketsResult.error || proposalsResult.error) {
      throw marketsResult.error || proposalsResult.error;
    }

    const activeMarketTexts = (marketsResult.data || []).map((market) => {
      return [market.question, market.description].filter(Boolean).join(' ');
    });

    const proposalTexts = (proposalsResult.data || []).map((proposal) => {
      return [proposal.title, proposal.description].filter(Boolean).join(' ');
    });

    return NextResponse.json({
      activeMarketTexts,
      proposalTexts,
      activeMarketCount: activeMarketTexts.length,
      proposalCount: proposalTexts.length
    });
  } catch (error) {
    console.error('AI market context error:', error);
    return NextResponse.json(
      { error: 'Failed to load market context' },
      { status: 500 }
    );
  }
}
