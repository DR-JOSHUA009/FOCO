import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const receiver_id = body.receiver_id;

    if (!receiver_id || typeof receiver_id !== 'string') {
      return NextResponse.json({ error: 'Valid receiver_id required' }, { status: 400 });
    }

    // Check if already friends or pending
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('friend_requests')
      .select('id')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${user.id})`)
      .in('status', ['accepted', 'pending'])
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: 'Friendship or request already exists' }, { status: 400 });
    }

    const { error: insertError } = await supabaseAdmin
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: receiver_id,
        status: 'pending'
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
