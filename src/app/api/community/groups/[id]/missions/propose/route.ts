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
    const { title, description, suggested_due_date } = body;

    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    // Verify caller is a member
    const { data: member, error: memberError } = await supabaseAdmin
      .from('group_members')
      .select('id')
      .eq('group_id', id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: proposal, error: insertError } = await supabaseAdmin
      .from('mission_proposals')
      .insert({
        group_id: id,
        proposed_by: user.id,
        title,
        description,
        suggested_due_date,
        status: 'pending'
      })
      .select('id')
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    // [NEEDS BACKEND: push notification]
    // Here we would trigger a push notification to group members.

    return NextResponse.json({ proposal_id: proposal.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
