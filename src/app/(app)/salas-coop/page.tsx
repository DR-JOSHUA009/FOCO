import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SalasCoopClient from "@/components/salas-coop/SalasCoopClient";

export const metadata = {
  title: "Salas Coop | FOCOI",
  description: "Salas de estudio colaborativas en tiempo real.",
};

export const dynamic = "force-dynamic";

export default async function SalasCoopPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Fetch active rooms the user is in
  const { data: participations } = await supabase
    .from("room_participants")
    .select(`
      room_id,
      rooms (
        id,
        name,
        code,
        status,
        host_id
      )
    `)
    .eq("user_id", user.id);

  const rawActiveRooms = participations
    ?.map(p => p.rooms)
    .filter(r => r && !Array.isArray(r) && r.status === "active") || [];

  // Filter out any array types safely, ensuring type matches expected
  const activeRooms = rawActiveRooms as any[];

  // Fetch participant counts for each active room
  const activeRoomsWithCounts = await Promise.all(
    activeRooms.map(async (room) => {
      const { count } = await supabase
        .from("room_participants")
        .select("*", { count: 'exact', head: true })
        .eq("room_id", room.id);
      return { ...room, participantCount: count || 0 };
    })
  );

  return <SalasCoopClient userId={user.id} initialActiveRooms={activeRoomsWithCounts} />;
}
