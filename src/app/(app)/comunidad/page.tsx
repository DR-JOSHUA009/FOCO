import SocialClient from "@/components/social/SocialClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ComunidadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // [NEEDS BACKEND] In a real app we would fetch friends, rooms, and groups here.
  // For the UI demonstration, we will use mock data in the Client component.

  return <SocialClient currentUserId={user.id} />;
}
