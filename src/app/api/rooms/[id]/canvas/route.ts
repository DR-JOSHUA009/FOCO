import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roomId = params.id;
    const { canvas_state } = await request.json();

    if (!canvas_state) {
      return NextResponse.json({ error: "canvas_state is required" }, { status: 400 });
    }

    // Verify caller is a participant
    const { data: participantData, error: partError } = await supabaseAdmin
      .from("room_participants")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (partError || !participantData) {
      return NextResponse.json({ error: "You are not a participant in this room" }, { status: 403 });
    }

    // Update canvas_state in rooms table
    const { error: updateError } = await supabaseAdmin
      .from("rooms")
      .update({ canvas_state: canvas_state })
      .eq("id", roomId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
