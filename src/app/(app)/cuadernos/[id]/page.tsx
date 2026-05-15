import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NotebookClient from "@/components/notebooks/NotebookClient";

export default async function NotebookPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: notebook } = await supabase
    .from("notebooks")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!notebook) {
    redirect("/cuadernos");
  }

  return <NotebookClient notebook={notebook} />;
}
