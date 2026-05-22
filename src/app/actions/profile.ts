"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAdminClient() {
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function updateProfile(data: { nombre?: string; avatar_url?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const supabaseAdmin = await getAdminClient();
  const { error } = await supabaseAdmin
    .from("profiles")
    .update(data)
    .eq("id", user.id);

  if (error) {
    console.error("Error updating profile:", error);
    return { error: "Error al actualizar perfil" };
  }

  revalidatePath("/perfil");
  return { success: true };
}

export async function uploadAvatar(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) return { error: "No se seleccionó archivo" };
  if (file.size > 5 * 1024 * 1024) return { error: "El archivo excede 5MB" };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { error: "Formato no soportado (JPG, PNG, WEBP)" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado" };

  const supabaseAdmin = await getAdminClient();
  const fileExt = file.name.split('.').pop();
  const filePath = `${user.id}/profile_${Date.now()}.${fileExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabaseAdmin.storage
    .from("avatars")
    .upload(filePath, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("Avatar upload error:", uploadError);
    return { error: "Error al subir foto" };
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("avatars")
    .getPublicUrl(filePath);

  // Update profile
  await updateProfile({ avatar_url: publicUrl });

  return { success: true, avatar_url: publicUrl };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { success: true };
}
