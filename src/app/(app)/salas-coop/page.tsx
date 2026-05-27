import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SalasCoopClient from "@/components/salas-coop/SalasCoopClient";

export const metadata = {
  title: "Salas Coop | FOCOI",
  description: "Salas de estudio colaborativas en tiempo real.",
};

export const dynamic = "force-dynamic";

export default async function SalasCoopPage() {
  const supabase = await createClient();

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user;
  } catch {
    redirect("/auth");
  }

  if (!user) {
    redirect("/auth");
  }

  // Gracefully handle missing tables (before SQL migration runs)
  let activeRoomsWithCounts: any[] = [];

  try {
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

    const rawActiveRooms = (participations ?? [])
      .map((p: any) => p.rooms)
      .filter((r: any) => r && !Array.isArray(r) && r.status === "active");

    activeRoomsWithCounts = await Promise.all(
      rawActiveRooms.map(async (room: any) => {
        const { count } = await supabase
          .from("room_participants")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id);
        return { ...room, participantCount: count || 0 };
      })
    );
  } catch {
    // Tables don't exist yet — show empty state
    activeRoomsWithCounts = [];
  }

  return <SalasCoopClient userId={user.id} initialActiveRooms={activeRoomsWithCounts} />;
}
