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

    const { data: group, error: groupError } = await supabaseAdmin
      .from('competition_groups')
      .select('creator_id, status, duration_months')
      .eq('id', id)
      .single();

    if (groupError) return NextResponse.json({ error: groupError.message }, { status: 404 });
    if (group.creator_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (group.status !== 'waiting') return NextResponse.json({ error: 'Group is not waiting' }, { status: 400 });

    const { count: missionsCount, error: missionsError } = await supabaseAdmin
      .from('group_missions')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', id);

    if (missionsError) return NextResponse.json({ error: missionsError.message }, { status: 500 });

    const expectedMissions = group.duration_months * 4 * 2; // 2 missions/week * 4 weeks/month
    const missingMissions = expectedMissions - (missionsCount || 0);

    if (missingMissions > 0) {
      // TODO: Call Lumos to generate coherent missions to fill the gap
      // This is a placeholder for Lumos integration.
      console.log(`Need to generate ${missingMissions} missions using Lumos.`);
    }

    const started_at = new Date();
    const ends_at = new Date(started_at);
    ends_at.setMonth(ends_at.getMonth() + group.duration_months);

    const { error: updateError } = await supabaseAdmin
      .from('competition_groups')
      .update({
        status: 'active',
        started_at: started_at.toISOString(),
        ends_at: ends_at.toISOString()
      })
      .eq('id', id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
