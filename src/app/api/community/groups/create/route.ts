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
      return NextResponse.json({ error: 'Nombre y duración son requeridos.' }, { status: 400 });
    }

    // Only validate friendships if member_ids is non-empty
    if (member_ids.length > 0) {
      const { data: friendships, error: friendsError } = await supabaseAdmin
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (friendsError) {
        console.error('[groups/create] friendsError:', friendsError);
        return NextResponse.json({ error: friendsError.message }, { status: 500 });
      }

      const friendIds = friendships.map((f: any) =>
        f.sender_id === user.id ? f.receiver_id : f.sender_id
      );
      const allFriends = member_ids.every((id: string) => friendIds.includes(id));

      if (!allFriends) {
        return NextResponse.json({ error: 'Todos los miembros deben ser tus amigos.' }, { status: 403 });
      }
    }

    // Create the group
    const { data: group, error: groupError } = await supabaseAdmin
      .from('competition_groups')
      .insert({ name, duration_months, creator_id: user.id })
      .select('id')
      .single();

    if (groupError) {
      console.error('[groups/create] groupError:', groupError);
      return NextResponse.json({ error: groupError.message }, { status: 500 });
    }

    const group_id = group.id;
    const allMemberIds = [user.id, ...member_ids];

    // Get display_name for each member — COALESCE so null never crashes
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, username')
      .in('id', allMemberIds);

    if (profilesError) {
      console.error('[groups/create] profilesError:', profilesError);
      // Rollback group creation
      await supabaseAdmin.from('competition_groups').delete().eq('id', group_id);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const membersData = allMemberIds.map((id: string) => {
      const p = profiles?.find((pr: any) => pr.id === id);
      return {
        group_id,
        user_id: id,
        display_name: p?.display_name || p?.username || 'Usuario',
        total_points: 0,
        weeks_won: 0
      };
    });

    const { error: membersError } = await supabaseAdmin
      .from('group_members')
      .insert(membersData);

    if (membersError) {
      console.error('[groups/create] membersError:', membersError);
      // Rollback group creation
      await supabaseAdmin.from('competition_groups').delete().eq('id', group_id);
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    return NextResponse.json({ group_id });
  } catch (err: any) {
    console.error('[groups/create] unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
