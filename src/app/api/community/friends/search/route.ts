import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const username = body.username;

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Valid username required' }, { status: 400 });
    }

    const { data: friendships, error: friendsError } = await supabaseAdmin
      .from('friend_requests')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .in('status', ['accepted', 'pending']);

    if (friendsError) {
      return NextResponse.json({ error: friendsError.message }, { status: 500 });
    }

    const friendIds = friendships.map(f => f.sender_id === user.id ? f.receiver_id : f.sender_id);
    const excludeIds = [user.id, ...friendIds];

    let query = supabaseAdmin
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${username}%`)
      .limit(20);

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data: profiles, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profiles });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
