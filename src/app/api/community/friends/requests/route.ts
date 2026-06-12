import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('friend_requests')
      .select('id, sender_id, created_at')
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (requestsError) {
      return NextResponse.json({ error: requestsError.message }, { status: 500 });
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({ requests: [] });
    }

    const senderIds = requests.map(r => r.sender_id);

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', senderIds);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const mappedRequests = requests.map(req => {
      const senderProfile = profiles.find((p: any) => p.id === req.sender_id);
      return {
        id: req.id,
        created_at: req.created_at,
        sender: senderProfile || { id: req.sender_id, username: 'Unknown' }
      };
    });

    return NextResponse.json({ requests: mappedRequests });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
