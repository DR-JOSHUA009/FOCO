import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || code.trim() === "") {
      return NextResponse.json({ error: "Código es requerido" }, { status: 400 });
    }

    // Find active room by code
    const { data: roomData, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("id, name, status")
      .eq("code", code.trim().toUpperCase())
      .single();

    if (roomError || !roomData) {
      return NextResponse.json({ error: "Código inválido o sala no encontrada" }, { status: 404 });
    }

    if (roomData.status !== "active") {
      return NextResponse.json({ error: "Esta sala ya está cerrada" }, { status: 400 });
    }

    // Check participants
    const { data: participants, error: partError } = await supabaseAdmin
      .from("room_participants")
      .select("user_id")
      .eq("room_id", roomData.id);

    if (partError) {
      return NextResponse.json({ error: partError.message }, { status: 500 });
    }

    if (participants.length >= 8) {
      return NextResponse.json({ error: "La sala está llena" }, { status: 400 });
    }

    const alreadyJoined = participants.some((p) => p.user_id === user.id);
    if (alreadyJoined) {
      return NextResponse.json({ error: "Ya estás en esta sala" }, { status: 400 });
    }

    // Get user display name
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("nombre")
      .eq("id", user.id)
      .single();
      
    const displayName = profileData?.nombre || "Usuario";

    // Insert participant
    const { error: insertError } = await supabaseAdmin
      .from("room_participants")
      .insert({
        room_id: roomData.id,
        user_id: user.id,
        display_name: displayName,
        join_order: participants.length + 1
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ room_id: roomData.id, name: roomData.name }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
