import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Cargar todos los datos necesarios para el dashboard
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: stats } = await supabase.from("user_stats").select("*").eq("user_id", user.id).single();
  const { data: tasks } = await supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  const { data: achievements } = await supabase.from("achievements").select("*");
  const { data: userAchievements } = await supabase.from("user_achievements").select("*").eq("user_id", user.id);
  const { data: recentSessions } = await supabase.from("focus_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(14);

  return (
    <DashboardClient 
      profile={profile} 
      stats={stats} 
      tasks={tasks || []} 
      achievements={achievements || []} 
      userAchievements={userAchievements || []}
      recentSessions={recentSessions || []}
    />
  );
}
