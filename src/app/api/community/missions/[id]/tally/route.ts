import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { BEST_EVIDENCE_BONUS } from '@/lib/competition-config';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: mission, error: missionError } = await supabaseAdmin
      .from('group_missions')
      .select('group_id, status')
      .eq('id', id)
      .single();

    if (missionError || !mission) return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    
    // Fetch all evidence for mission
    const { data: evidences, error: evidenceError } = await supabaseAdmin
      .from('mission_evidence')
      .select('id, user_id, submitted_at')
      .eq('mission_id', id);

    if (evidenceError) return NextResponse.json({ error: evidenceError.message }, { status: 500 });

    if (!evidences || evidences.length === 0) {
      await supabaseAdmin.from('group_missions').update({ status: 'completed' }).eq('id', id);
      return NextResponse.json({ success: true, message: 'No evidence found to tally' });
    }

    // Tally votes
    const { data: votes, error: votesError } = await supabaseAdmin
      .from('evidence_votes')
      .select('evidence_id');

    if (votesError) return NextResponse.json({ error: votesError.message }, { status: 500 });

    const voteCounts: Record<string, number> = {};
    evidences.forEach((e: any) => { voteCounts[e.id] = 0; });
    votes.forEach((v: any) => {
      if (voteCounts[v.evidence_id] !== undefined) {
        voteCounts[v.evidence_id]++;
      }
    });

    let maxVotes = -1;
    let winners: any[] = [];

    evidences.forEach((e: any) => {
      const count = voteCounts[e.id];
      if (count > maxVotes) {
        maxVotes = count;
        winners = [e];
      } else if (count === maxVotes) {
        winners.push(e);
      }
    });

    if (winners.length > 1) {
      winners.sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
    }

    const winner = winners[0];
    if (winner) {
      const { data: currentMemberData } = await supabaseAdmin
        .from('group_members')
        .select('total_points')
        .eq('group_id', mission.group_id)
        .eq('user_id', winner.user_id)
        .single();

      if (currentMemberData) {
        await supabaseAdmin.from('group_members').update({
          total_points: currentMemberData.total_points + BEST_EVIDENCE_BONUS
        }).eq('group_id', mission.group_id).eq('user_id', winner.user_id);
      }
    }

    await supabaseAdmin.from('group_missions').update({ status: 'completed' }).eq('id', id);

    return NextResponse.json({ success: true, winner_id: winner?.user_id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
