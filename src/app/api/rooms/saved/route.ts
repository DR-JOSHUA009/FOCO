import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // The RLS policy on saved_rooms allows users to select if they are saved_by or if they are in saved_room_members
    const { data: savedRooms, error: roomsError } = await supabase
      .from("saved_rooms")
      .select(`
        id,
        name,
        saved_at,
        saved_by,
        saved_room_members (
          user_id,
          display_name
        )
      `)
      .order("saved_at", { ascending: false });

    if (roomsError) {
      return NextResponse.json({ error: roomsError.message }, { status: 500 });
    }

    return NextResponse.json({ saved_rooms: savedRooms || [] }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
