import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: missions, error: missionsError } = await supabaseAdmin
      .from('group_missions')
      .select('*, mission_evidence(count)')
      .eq('group_id', id)
      .order('due_date', { ascending: true });

    if (missionsError) return NextResponse.json({ error: missionsError.message }, { status: 500 });

    const mappedMissions = missions.map(m => ({
      ...m,
      evidence_count: m.mission_evidence[0]?.count || 0
    }));

    return NextResponse.json({ missions: mappedMissions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
