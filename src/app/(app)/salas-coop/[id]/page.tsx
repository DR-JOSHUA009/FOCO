import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LiveRoomClient from "@/components/salas-coop/LiveRoomClient";

export const metadata = {
  title: "Sala en Vivo | FOCOI",
};

export const dynamic = "force-dynamic";

export default async function LiveRoomPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Fetch room data
  const { data: room, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !room) {
    redirect("/salas-coop");
  }

  if (room.status !== "active") {
    // If closed, redirect to saved rooms or just back
    redirect("/salas-coop");
  }

  // Check if user is participant
  const { data: participant } = await supabase
    .from("room_participants")
    .select("id")
    .eq("room_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!participant) {
    // User is not in the room. They must join through the modal or code.
    redirect("/salas-coop");
  }

  // Get user profile for presence
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <LiveRoomClient 
      room={room} 
      currentUser={{
        id: user.id,
        nombre: profile?.nombre || "Usuario",
        avatar_url: profile?.avatar_url || ""
      }} 
    />
  );
}
