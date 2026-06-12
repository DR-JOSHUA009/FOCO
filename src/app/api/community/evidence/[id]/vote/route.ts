import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { VOTE_POINTS_PER_VOTE } from '@/lib/competition-config';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: evidence, error: evidenceError } = await supabaseAdmin
      .from('mission_evidence')
      .select('user_id, mission_id, group_id, vote_points')
      .eq('id', id)
      .single();

    if (evidenceError || !evidence) return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    if (evidence.user_id === user.id) return NextResponse.json({ error: 'Cannot vote for your own evidence' }, { status: 400 });

    const { data: mission, error: missionError } = await supabaseAdmin
      .from('group_missions')
      .select('status')
      .eq('id', evidence.mission_id)
      .single();

    if (missionError || !mission) return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    if (mission.status !== 'voting') return NextResponse.json({ error: 'Voting is not active for this mission' }, { status: 400 });

    const { data: member, error: memberError } = await supabaseAdmin
      .from('group_members')
      .select('id')
      .eq('group_id', evidence.group_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { error: insertError } = await supabaseAdmin
      .from('evidence_votes')
      .insert({ evidence_id: id, voter_id: user.id });

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    await supabaseAdmin
      .from('mission_evidence')
      .update({ vote_points: evidence.vote_points + VOTE_POINTS_PER_VOTE })
      .eq('id', id);

    const { data: currentMemberData, error: currentMemberError } = await supabaseAdmin
      .from('group_members')
      .select('total_points')
      .eq('group_id', evidence.group_id)
      .eq('user_id', evidence.user_id)
      .single();

    if (!currentMemberError && currentMemberData) {
      await supabaseAdmin.from('group_members').update({
        total_points: currentMemberData.total_points + VOTE_POINTS_PER_VOTE
      }).eq('group_id', evidence.group_id).eq('user_id', evidence.user_id);
    }

    const { count: voteCount } = await supabaseAdmin
      .from('evidence_votes')
      .select('id', { count: 'exact', head: true })
      .in('evidence_id', (await supabaseAdmin.from('mission_evidence').select('id').eq('mission_id', evidence.mission_id)).data?.map((e: any) => e.id) || []);

    const { count: memberCount } = await supabaseAdmin
      .from('group_members')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', evidence.group_id);

    // If all members voted (each member casts 1 vote)
    if (voteCount === memberCount) {
      // Trigger tally - could be an internal fetch or direct call
      const host = req.headers.get('host');
      const protocol = req.headers.get('x-forwarded-proto') || 'http';
      fetch(`${protocol}://${host}/api/community/missions/${evidence.mission_id}/tally`, {
        method: 'POST',
        headers: {
          'Cookie': req.headers.get('cookie') || ''
        }
      }).catch(console.error);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
