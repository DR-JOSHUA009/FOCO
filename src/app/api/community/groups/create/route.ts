import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, duration_months, member_ids } = body;

    if (!name || !duration_months || !Array.isArray(member_ids)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { data: friendships, error: friendsError } = await supabaseAdmin
      .from('friend_requests')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .eq('status', 'accepted');

    if (friendsError) return NextResponse.json({ error: friendsError.message }, { status: 500 });

    const friendIds = friendships.map((f: any) => f.sender_id === user.id ? f.receiver_id : f.sender_id);
    const allFriends = member_ids.every((id: string) => friendIds.includes(id));

    if (!allFriends) {
      return NextResponse.json({ error: 'All members must be your friends' }, { status: 403 });
    }

    const { data: group, error: groupError } = await supabaseAdmin
      .from('competition_groups')
      .insert({ name, duration_months, creator_id: user.id })
      .select('id')
      .single();

    if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 });

    const group_id = group.id;

    const allMemberIds = [user.id, ...member_ids];
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name')
      .in('id', allMemberIds);

    if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 });

    const membersData = allMemberIds.map((id: string) => {
      const p = profiles.find((pr: any) => pr.id === id);
      return {
        group_id,
        user_id: id,
        display_name: p?.display_name || 'Unknown'
      };
    });

    const { error: membersError } = await supabaseAdmin
      .from('group_members')
      .insert(membersData);

    if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 });

    return NextResponse.json({ group_id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
