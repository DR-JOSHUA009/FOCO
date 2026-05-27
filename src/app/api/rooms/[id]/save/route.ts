import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roomId = params.id;

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

    // Get room details
    const { data: roomData, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("name, canvas_state")
      .eq("id", roomId)
      .single();

    if (roomError || !roomData) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Get all current participants
    const { data: participants, error: partsError } = await supabaseAdmin
      .from("room_participants")
      .select("user_id, display_name")
      .eq("room_id", roomId);

    if (partsError || !participants) {
      return NextResponse.json({ error: "Could not fetch participants" }, { status: 500 });
    }

    // Insert into saved_rooms
    const { data: savedRoom, error: saveError } = await supabaseAdmin
      .from("saved_rooms")
      .insert({
        original_room_id: roomId,
        name: roomData.name,
        canvas_state: roomData.canvas_state || {},
        saved_by: user.id
      })
      .select()
      .single();

    if (saveError || !savedRoom) {
      return NextResponse.json({ error: saveError?.message || "Failed to save room" }, { status: 500 });
    }

    // Insert all participants into saved_room_members
    const membersToInsert = participants.map((p) => ({
      saved_room_id: savedRoom.id,
      user_id: p.user_id,
      display_name: p.display_name
    }));

    if (membersToInsert.length > 0) {
      const { error: membersError } = await supabaseAdmin
        .from("saved_room_members")
        .insert(membersToInsert);

      if (membersError) {
        // Rollback saved room if members fail
        await supabaseAdmin.from("saved_rooms").delete().eq("id", savedRoom.id);
        return NextResponse.json({ error: membersError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ saved_room_id: savedRoom.id }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
