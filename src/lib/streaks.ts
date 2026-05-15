import { SupabaseClient } from "@supabase/supabase-js";

export async function checkAndUpdateStreak(supabase: SupabaseClient, userId: string, stats: any) {
  if (!stats) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let lastLogin = stats.ultimo_login ? new Date(stats.ultimo_login) : null;
  
  // Convert DB date (YYYY-MM-DD) to local date at midnight to avoid timezone shift issues
  if (stats.ultimo_login) {
    const parts = stats.ultimo_login.split('-');
    if (parts.length === 3) {
      lastLogin = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
  }

  const todayStr = today.toISOString().split('T')[0];

  if (!lastLogin) {
    const { data, error } = await supabase.from("user_stats").update({
      ultimo_login: todayStr,
      racha_actual: 1,
      racha_maxima: Math.max(1, stats.racha_maxima || 1)
    }).eq("user_id", userId).select().single();
    
    if (error) console.error("Error setting first login:", error);
    return data;
  }

  const diffTime = today.getTime() - lastLogin.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Mismo día
    return null;
  }

  let newRacha = stats.racha_actual;
  let newRachaMaxima = stats.racha_maxima;

  if (diffDays === 1) {
    // Fue ayer
    newRacha += 1;
  } else {
    // Fue antes de ayer
    newRacha = 1;
  }

  if (newRacha > newRachaMaxima) {
    newRachaMaxima = newRacha;
  }

  const { data, error } = await supabase.from("user_stats").update({
    ultimo_login: todayStr,
    racha_actual: newRacha,
    racha_maxima: newRachaMaxima
  }).eq("user_id", userId).select().single();

  if (error) console.error("Error updating streak:", error);
  return data;
}
