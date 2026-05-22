"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Need supabaseAdmin for writes that bypass RLS
async function getAdminClient() {
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function searchUsers(query: string) {
  if (!query || query.length < 3) return { error: "Mínimo 3 caracteres" };
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const supabaseAdmin = await getAdminClient();
  
  // Search profiles by username (ilike)
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, nombre, avatar_url")
    .ilike("nombre", `%${query}%`)
    .neq("id", user.id)
    .limit(5);

  if (error) {
    console.error("Error searching users:", error);
    return { error: "Error al buscar usuarios" };
  }

  return { users: data || [] };
}

export async function sendFriendRequest(receiverId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const supabaseAdmin = await getAdminClient();

  // Check if request already exists
  const { data: existing } = await supabaseAdmin
    .from("friend_requests")
    .select("id, status")
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
    .single();

  if (existing) {
    if (existing.status === "pending") return { error: "La solicitud ya fue enviada" };
    if (existing.status === "accepted") return { error: "Ya son amigos" };
    return { error: "No se puede enviar la solicitud" };
  }

  const { error } = await supabaseAdmin
    .from("friend_requests")
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      status: "pending",
    });

  if (error) {
    console.error("Error sending friend request:", error);
    return { error: "Error al enviar solicitud" };
  }

  revalidatePath("/comunidad");
  return { success: true };
}

export async function createRoom(name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const supabaseAdmin = await getAdminClient();
  
  // Generate random code for room (using a short unique string or UUID)
  const roomCode = crypto.randomUUID();

  const { error: insertError } = await supabaseAdmin
    .from("rooms")
    .insert({
      id: roomCode,
      name: name || "Nueva sala de estudio",
      host_id: user.id,
      status: "active",
    });

  if (insertError) {
    console.error("Error creating room:", insertError);
    return { error: "Error al crear la sala" };
  }

  // Also add host as participant
  await supabaseAdmin
    .from("room_participants")
    .insert({
      room_id: roomCode,
      user_id: user.id,
    }).catch(console.error);

  revalidatePath("/comunidad");
  return { success: true, roomCode };
}

export async function joinRoom(code: string) {
  if (!code) return { error: "Código vacío" };
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const supabaseAdmin = await getAdminClient();

  const { data: room, error: roomError } = await supabaseAdmin
    .from("rooms")
    .select("id, status")
    .eq("id", code)
    .single();

  if (roomError || !room) {
    return { error: "Código inválido o sala no encontrada" };
  }

  if (room.status !== "active") {
    return { error: "La sala ya no está activa" };
  }

  // Check participants count
  const { count } = await supabaseAdmin
    .from("room_participants")
    .select("id", { count: "exact" })
    .eq("room_id", code);

  if (count && count >= 10) {
    return { error: "La sala está llena" };
  }

  // Check if already in room
  const { data: existingParticipant } = await supabaseAdmin
    .from("room_participants")
    .select("id")
    .eq("room_id", code)
    .eq("user_id", user.id)
    .single();

  if (!existingParticipant) {
    const { error: joinError } = await supabaseAdmin
      .from("room_participants")
      .insert({
        room_id: code,
        user_id: user.id,
      });

    if (joinError) {
      console.error("Error joining room:", joinError);
      return { error: "Error al unirse a la sala" };
    }
  }

  revalidatePath("/comunidad");
  return { success: true, roomCode: code };
}

export async function getActiveRooms() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { rooms: [] };

  const supabaseAdmin = await getAdminClient();

  // For now, fetch all active public rooms (or mock the friend join logic if not built yet)
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select(`
      id,
      name,
      status,
      created_at,
      host:profiles!rooms_host_id_fkey(nombre),
      participants:room_participants(count)
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching rooms:", error);
    return { rooms: [] };
  }

  return { 
    rooms: data.map((r: any) => ({
      id: r.id,
      name: r.name,
      host: r.host?.nombre || "Host",
      username: r.host?.nombre?.toLowerCase().replace(/\s/g, '') || "host",
      participants: r.participants[0]?.count || 1,
      duration: "Activa" // Could calculate from created_at
    }))
  };
}
