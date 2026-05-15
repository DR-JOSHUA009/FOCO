import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FocusClient from "@/components/focus/FocusClient";

export default async function FocoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const today = new Date().toISOString().split('T')[0];
  const { data: pendingTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("completada", false)
    .gte("fecha_entrega", today)
    .order("fecha_entrega", { ascending: true });

  const { data: stats } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return <FocusClient pendingTasks={pendingTasks || []} stats={stats || {}} />;
}
