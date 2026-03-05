import { getSession } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  // Fetch fresh user data from DB
  const supabase = getServiceSupabase();
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, role, points_balance, created_at, last_active')
    .eq('id', session.userId)
    .single();

  if (error || !user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user });
}
