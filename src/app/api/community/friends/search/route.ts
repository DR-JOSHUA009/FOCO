import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// This route accepts GET requests with ?q=searchQuery
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();

    if (!q) {
      return NextResponse.json({ users: [] });
    }

    // Get all existing friend relationships (pending or accepted) to exclude them
    const { data: friendships, error: friendsError } = await supabaseAdmin
      .from('friend_requests')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .in('status', ['accepted', 'pending']);

    if (friendsError) {
      console.error('[friends/search] friendsError:', friendsError);
      return NextResponse.json({ error: friendsError.message }, { status: 500 });
    }

    const relatedIds = (friendships || []).map((f: any) =>
      f.sender_id === user.id ? f.receiver_id : f.sender_id
    );
    const excludeIds = [user.id, ...relatedIds];

    // Search by display_name OR username (ILIKE for case-insensitive)
    let query = supabaseAdmin
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
      .limit(10);

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data: profiles, error } = await query;

    if (error) {
      console.error('[friends/search] profilesError:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Normalize: never return null display_name to the client
    const users = (profiles || []).map((p: any) => ({
      id: p.id,
      display_name: p.display_name || p.username || 'Usuario',
      username: p.username || '',
      avatar_url: p.avatar_url || null
    }));

    return NextResponse.json({ users });
  } catch (err: any) {
    console.error('[friends/search] unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
