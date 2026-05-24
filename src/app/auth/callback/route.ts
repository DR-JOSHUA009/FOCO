import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  // Redirigimos al dashboard por defecto
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
    
    // Si falla el intercambio del código, redirigimos a una ruta segura
    console.error("[Auth Callback] Error exchanging code for session:", error.message);
  }

  // Fallback a login en caso de error o código inválido
  return NextResponse.redirect(new URL("/auth?error=No_se_pudo_verificar_la_cuenta", request.url));
}
