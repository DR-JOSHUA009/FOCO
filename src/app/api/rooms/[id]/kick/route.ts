import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roomId = params.id;
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    if (user_id === user.id) {
      return NextResponse.json({ error: "You cannot kick yourself" }, { status: 400 });
    }

    // Verify caller is host
    const { data: roomData, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("host_id")
      .eq("id", roomId)
      .single();

    if (roomError || !roomData) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (roomData.host_id !== user.id) {
      return NextResponse.json({ error: "Only the host can kick participants" }, { status: 403 });
    }

    // Delete participant record
    const { error: deleteError } = await supabaseAdmin
      .from("room_participants")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", user_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
