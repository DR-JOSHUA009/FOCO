import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET /api/community/friends/search?q=searchQuery
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

    // Search display_name OR username with ILIKE wildcards via supabaseAdmin (bypasses RLS)
    // Use separate .or() filter for the text search
    const { data: byDisplayName, error: e1 } = await supabaseAdmin
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .ilike('display_name', `%${q}%`)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .limit(10);

    if (e1) {
      console.error('[friends/search] display_name search error:', e1);
      return NextResponse.json({ error: e1.message }, { status: 500 });
    }

    const { data: byUsername, error: e2 } = await supabaseAdmin
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${q}%`)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .limit(10);

    if (e2) {
      console.error('[friends/search] username search error:', e2);
      return NextResponse.json({ error: e2.message }, { status: 500 });
    }

    // Merge and deduplicate by id
    const allResults = [...(byDisplayName || []), ...(byUsername || [])];
    const seen = new Set<string>();
    const unique = allResults.filter((p: any) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    }).slice(0, 10);

    // Normalize: never return null values to client
    const users = unique.map((p: any) => ({
      id: p.id,
      display_name: p.display_name || p.username || 'Usuario',
      username: p.username || '',
      avatar_url: p.avatar_url || null
    }));

    console.log(`[friends/search] query="${q}" found ${users.length} results`);
    return NextResponse.json({ users });
  } catch (err: any) {
    console.error('[friends/search] unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
