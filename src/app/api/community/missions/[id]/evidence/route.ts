import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getDeliveryPoints } from '@/lib/competition-config';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const photo = formData.get('photo') as File;

    if (!photo) return NextResponse.json({ error: 'Photo required' }, { status: 400 });
    if (!photo.type.startsWith('image/')) return NextResponse.json({ error: 'Must be an image' }, { status: 400 });
    if (photo.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });

    // Get mission info to get group_id
    const { data: mission, error: missionError } = await supabaseAdmin
      .from('group_missions')
      .select('group_id, status')
      .eq('id', id)
      .single();

    if (missionError || !mission) return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    if (mission.status !== 'active') return NextResponse.json({ error: 'Mission is not active' }, { status: 400 });

    const group_id = mission.group_id;

    const { data: member, error: memberError } = await supabaseAdmin
      .from('group_members')
      .select('display_name')
      .eq('group_id', group_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const ext = photo.name.split('.').pop();
    const storage_path = `${user.id}/${group_id}/${id}/${Date.now()}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('evidence-photos')
      .upload(storage_path, photo);

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: publicUrlData } = supabaseAdmin.storage.from('evidence-photos').getPublicUrl(storage_path);

    // Count existing submissions to determine rank
    const { count, error: countError } = await supabaseAdmin
      .from('mission_evidence')
      .select('*', { count: 'exact', head: true })
      .eq('mission_id', id);

    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

    const rank = (count || 0) + 1;
    const delivery_points = getDeliveryPoints(rank);

    const { data: evidence, error: insertError } = await supabaseAdmin
      .from('mission_evidence')
      .insert({
        mission_id: id,
        group_id,
        user_id: user.id,
        display_name: member.display_name,
        photo_url: publicUrlData.publicUrl,
        storage_path,
        delivery_points
      })
      .select('id')
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    // Update group_members total points
    const { data: currentMemberData, error: currentMemberError } = await supabaseAdmin
      .from('group_members')
      .select('total_points')
      .eq('group_id', group_id)
      .eq('user_id', user.id)
      .single();

    if (!currentMemberError && currentMemberData) {
      await supabaseAdmin.from('group_members').update({
        total_points: currentMemberData.total_points + delivery_points
      }).eq('group_id', group_id).eq('user_id', user.id);
    }

    return NextResponse.json({ evidence_id: evidence.id, delivery_points });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
