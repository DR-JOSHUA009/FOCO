import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action; // 'accept' | 'reject'

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Verify current user is receiver
    const { data: request, error: requestError } = await supabaseAdmin
      .from('friend_requests')
      .select('receiver_id, status')
      .eq('id', id)
      .single();

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 404 });
    }

    if (request.receiver_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (request.status !== 'pending') {
      return NextResponse.json({ error: 'Request is not pending' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('friend_requests')
      .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
