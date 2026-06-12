import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: friendships, error: friendsError } = await supabaseAdmin
      .from('friend_requests')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (friendsError) {
      return NextResponse.json({ error: friendsError.message }, { status: 500 });
    }

    if (!friendships || friendships.length === 0) {
      return NextResponse.json({ friends: [] });
    }

    const friendIds = friendships.map(f => f.sender_id === user.id ? f.receiver_id : f.sender_id);

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', friendIds);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const { data: stats } = await supabaseAdmin
      .from('user_stats')
      .select('user_id, racha_actual')
      .in('user_id', friendIds);

    const friends = profiles.map((p: any) => {
      const s = stats?.find((st: any) => st.user_id === p.id);
      return {
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        streak: s?.racha_actual || 0,
        xp_level: 1 // Default until xp_total is fully mapped
      };
    });

    return NextResponse.json({ friends });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
