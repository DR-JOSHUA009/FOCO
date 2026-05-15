import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NotebooksList from "@/components/notebooks/NotebooksList";

export default async function CuadernosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: notebooks } = await supabase
    .from("notebooks")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return <NotebooksList initialNotebooks={notebooks || []} />;
}
