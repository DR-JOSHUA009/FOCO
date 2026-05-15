import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "@/components/profile/ProfileClient";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: stats } = await supabase.from("user_stats").select("*").eq("user_id", user.id).single();

  // Fecha de hace 35 días para el historial
  const d = new Date();
  d.setDate(d.getDate() - 35);
  const thirtyFiveDaysAgo = d.toISOString();
  
  const { data: tasks } = await supabase.from("tasks")
    .select("created_at, completada, materia, xp_reward, updated_at")
    .eq("user_id", user.id)
    .eq("completada", true)
    .gte("updated_at", thirtyFiveDaysAgo);

  const { data: sessions } = await supabase.from("focus_sessions")
    .select("created_at, duracion_minutos, tipo")
    .eq("user_id", user.id)
    .gte("created_at", thirtyFiveDaysAgo);

  const { data: achievementsList } = await supabase.from("achievements").select("*").order("xp_reward", { ascending: true });
  const { data: userAchievements } = await supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", user.id);

  return (
    <ProfileClient 
      profile={profile || {}} 
      stats={stats || {}} 
      tasks={tasks || []} 
      sessions={sessions || []} 
      allAchievements={achievementsList || []}
      unlockedAchievements={userAchievements || []}
    />
  );
}
