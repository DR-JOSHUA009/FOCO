import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function generateCode(name: string, attempt: number = 0): string {
  // Take first 3 letters, remove spaces/special chars, uppercase
  const cleanStr = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  let prefix = cleanStr.substring(0, 3);
  
  // Pad with X if fewer than 3 letters
  while (prefix.length < 3) {
    prefix += "X";
  }

  // Append random digits (3 digits, or 4 if attempts > 10)
  const numDigits = attempt < 10 ? 3 : 4;
  const max = Math.pow(10, numDigits) - 1;
  const digits = Math.floor(Math.random() * max).toString().padStart(numDigits, "0");

  return prefix + digits;
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    let code = "";
    let roomInserted = false;
    let roomData = null;
    let attempt = 0;

    while (!roomInserted) {
      code = generateCode(name, attempt);
      
      const { data, error } = await supabaseAdmin
        .from("rooms")
        .insert({
          name: name.trim(),
          code: code,
          host_id: user.id,
          status: "active"
        })
        .select()
        .single();

      if (error) {
        // If unique constraint violation (code already exists), retry
        if (error.code === "23505") {
          attempt++;
          continue;
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      roomData = data;
      roomInserted = true;
    }

    if (roomData) {
      // Get user display name
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("nombre")
        .eq("id", user.id)
        .single();
        
      const displayName = profileData?.nombre || "Usuario";

      // Insert host as first participant
      const { error: partError } = await supabaseAdmin
        .from("room_participants")
        .insert({
          room_id: roomData.id,
          user_id: user.id,
          display_name: displayName,
          join_order: 1
        });

      if (partError) {
         // In a robust system, we might delete the room here if participant insertion fails
         return NextResponse.json({ error: partError.message }, { status: 500 });
      }

      return NextResponse.json({ room_id: roomData.id, code: roomData.code, name: roomData.name }, { status: 201 });
    }
    
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
