import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { vote: userVote } = body;

    if (typeof userVote !== 'boolean') return NextResponse.json({ error: 'Vote must be a boolean' }, { status: 400 });

    // Get vote details
    const { data: voteObj, error: voteError } = await supabaseAdmin
      .from('group_votes')
      .select('group_id, closes_at, status, vote_type, target_user_id')
      .eq('id', id)
      .single();

    if (voteError || !voteObj) return NextResponse.json({ error: 'Vote not found' }, { status: 404 });
    if (voteObj.status !== 'open' || new Date() > new Date(voteObj.closes_at)) {
      return NextResponse.json({ error: 'Vote is closed' }, { status: 400 });
    }

    // Verify caller is a group member
    const { data: member, error: memberError } = await supabaseAdmin
      .from('group_members')
      .select('id')
      .eq('group_id', voteObj.group_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Insert response
    const { error: responseError } = await supabaseAdmin
      .from('group_vote_responses')
      .insert({ vote_id: id, voter_id: user.id, vote: userVote });

    if (responseError) return NextResponse.json({ error: responseError.message }, { status: 500 });

    // Check majority
    const { data: allMembers, error: membersError } = await supabaseAdmin
      .from('group_members')
      .select('id')
      .eq('group_id', voteObj.group_id);

    if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 });

    const totalMembers = allMembers.length;

    const { data: responses, error: responsesError } = await supabaseAdmin
      .from('group_vote_responses')
      .select('vote')
      .eq('vote_id', id);

    if (responsesError) return NextResponse.json({ error: responsesError.message }, { status: 500 });

    const yesVotes = responses.filter(r => r.vote).length;
    const requiredMajority = Math.floor(totalMembers / 2) + 1;

    if (yesVotes >= requiredMajority) {
      // Majority reached
      if (voteObj.vote_type === 'add_member') {
        const { data: profile } = await supabaseAdmin.from('profiles').select('display_name').eq('id', voteObj.target_user_id).single();
        await supabaseAdmin.from('group_members').insert({
          group_id: voteObj.group_id,
          user_id: voteObj.target_user_id,
          display_name: profile?.display_name || 'Unknown'
        });
      } else if (voteObj.vote_type === 'remove_member') {
        await supabaseAdmin.from('group_members').delete().eq('group_id', voteObj.group_id).eq('user_id', voteObj.target_user_id);
      }
      
      await supabaseAdmin.from('group_votes').update({ status: 'approved' }).eq('id', id);
    } else if (responses.length === totalMembers) {
      // All voted but no majority
      await supabaseAdmin.from('group_votes').update({ status: 'rejected' }).eq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
