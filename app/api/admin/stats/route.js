import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Check if user is admin
    if (userId) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError || !user || user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized. Admin access required.' },
          { status: 403 }
        );
      }
    }

    // Get market statistics
    const { data: markets, error: marketsError } = await supabase
      .from('markets')
      .select('*');

    const { data: predictions, error: predictionsError } = await supabase
      .from('predictions')
      .select('*');

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');

    if (marketsError || predictionsError || usersError) {
      console.error('Stats error:', marketsError || predictionsError || usersError);
      return NextResponse.json(
        { error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = {
      markets: {
        total: markets.length,
        proposed: markets.filter(m => m.status === 'proposed').length,
        approved: markets.filter(m => m.status === 'approved').length,
        live: markets.filter(m => m.status === 'live').length,
        closed: markets.filter(m => m.status === 'closed').length,
        resolved: markets.filter(m => m.status === 'resolved').length,
        disputed: markets.filter(m => m.status === 'disputed').length,
        final: markets.filter(m => m.status === 'final').length,
        dissolved: markets.filter(m => m.status === 'dissolved').length
      },
      predictions: {
        total: predictions.length,
        active: predictions.filter(p => !p.paid_out).length,
        paid: predictions.filter(p => p.paid_out).length,
        totalStaked: predictions.reduce((sum, p) => sum + parseFloat(p.stake_amount || 0), 0),
        totalPaidOut: predictions.reduce((sum, p) => sum + parseFloat(p.payout_amount || 0), 0),
        averageStake: predictions.length > 0 
          ? predictions.reduce((sum, p) => sum + parseFloat(p.stake_amount || 0), 0) / predictions.length 
          : 0
      },
      users: {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        members: users.filter(u => u.role === 'member').length,
        viewers: users.filter(u => u.role === 'viewer').length,
        totalBalance: users.reduce((sum, u) => sum + parseFloat(u.points_balance || 0), 0),
        averageBalance: users.length > 0 
          ? users.reduce((sum, u) => sum + parseFloat(u.points_balance || 0), 0) / users.length 
          : 0
      },
      activity: {
        activeToday: users.filter(u => {
          if (!u.last_active) return false;
          const lastActive = new Date(u.last_active);
          const now = new Date();
          const diffHours = (now - lastActive) / (1000 * 60 * 60);
          return diffHours < 24;
        }).length,
        activeThisWeek: users.filter(u => {
          if (!u.last_active) return false;
          const lastActive = new Date(u.last_active);
          const now = new Date();
          const diffDays = (now - lastActive) / (1000 * 60 * 60 * 24);
          return diffDays < 7;
        }).length
      }
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Get statistics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
