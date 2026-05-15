import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TasksClient from "@/components/tasks/TasksClient";

export default async function TareasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const subjects = Array.from(new Set((tasks || []).map(t => t.materia))).filter(Boolean);

  return <TasksClient initialTasks={tasks || []} userSubjects={subjects} />;
}
