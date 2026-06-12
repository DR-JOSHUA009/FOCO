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
    const { vote_type, target_user_id } = body;

    if (vote_type !== 'add_member' && vote_type !== 'remove_member') {
      return NextResponse.json({ error: 'Invalid vote_type' }, { status: 400 });
    }
    if (!target_user_id) return NextResponse.json({ error: 'Missing target_user_id' }, { status: 400 });

    // Verify caller is a member
    const { data: member, error: memberError } = await supabaseAdmin
      .from('group_members')
      .select('id')
      .eq('group_id', id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const closes_at = new Date();
    closes_at.setHours(closes_at.getHours() + 24);

    const { data: vote, error: insertError } = await supabaseAdmin
      .from('group_votes')
      .insert({
        group_id: id,
        vote_type,
        target_user_id,
        initiated_by: user.id,
        status: 'open',
        closes_at: closes_at.toISOString()
      })
      .select('id')
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json({ vote_id: vote.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
