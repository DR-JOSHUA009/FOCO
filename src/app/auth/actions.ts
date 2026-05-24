"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkLoginRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const reqHeaders = headers();
  const ip = reqHeaders.get("x-forwarded-for") || "unknown";

  // Validaciones del servidor
  if (!email || !password) {
    console.warn(`[Security Alert] Intento fallido de login por campos vacíos. IP: ${ip}`);
    return { error: "Email y contraseña son obligatorios." };
  }

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.warn(`[Security Alert] Intento fallido de login por email inválido. IP: ${ip}, Email provisto: ${email}`);
    return { error: "Email inválido." };
  }

  if (typeof password !== "string" || password.length < 8) {
    console.warn(`[Security Alert] Intento fallido de login por contraseña corta. IP: ${ip}, Email: ${email}`);
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  // Rate Limiting
  const rateCheck = await checkLoginRateLimit(email);
  if (!rateCheck.allowed) {
    console.warn(`[Security Alert] Intento fallido de login por exceso de intentos (Rate Limit). IP: ${ip}, Email: ${email}`);
    return { 
      error: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(rateCheck.retryAfter! / 60)} minutos.` 
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.warn(`[Security Alert] Intento fallido de login (credenciales incorrectas o Supabase error). IP: ${ip}, Email: ${email}, Error: ${error.message}`);
    
    let userMsg = "Error al iniciar sesión.";
    if (error.message.includes("Invalid login credentials")) {
      userMsg = "Correo o contraseña incorrectos.";
    } else if (error.message.includes("Email not confirmed")) {
      userMsg = "Confirma tu correo antes de iniciar sesión.";
    }
    return { error: userMsg };
  }

  // Redirigir al dashboard después de login exitoso
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function register(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const nombre = formData.get("nombre") as string;
  const reqHeaders = headers();
  const ip = reqHeaders.get("x-forwarded-for") || "unknown";

  if (!email || !password || !nombre) {
    console.warn(`[Security Alert] Intento fallido de registro por campos vacíos. IP: ${ip}`);
    return { error: "Todos los campos son obligatorios." };
  }

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.warn(`[Security Alert] Intento fallido de registro por email inválido. IP: ${ip}, Email provisto: ${email}`);
    return { error: "Email inválido." };
  }

  if (typeof password !== "string" || password.length < 8) {
    console.warn(`[Security Alert] Intento fallido de registro por contraseña corta. IP: ${ip}, Email: ${email}`);
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  if (typeof nombre !== "string" || nombre.trim().length < 2) {
    console.warn(`[Security Alert] Intento fallido de registro por nombre inválido. IP: ${ip}, Nombre provisto: ${nombre}`);
    return { error: "El nombre debe tener al menos 2 caracteres." };
  }

  // Sanitizar nombre de manera robusta contra inyecciones XSS y scripts codificados
  const nombreLimpio = nombre
    .trim()
    .replace(/<[^>]*>/g, "")             // Elimina etiquetas HTML
    .replace(/javascript:/gi, "")        // Elimina vectores del esquema "javascript:"
    .replace(/[<>'"\/]/g, "");           // Filtra caracteres especiales de HTML/citas que rompen plantillas

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: nombreLimpio, // Added display_name
        username: nombreLimpio,     // Added username to match SQL trigger
      },
    },
  });

  if (error) {
    console.warn(`[Security Alert] Intento fallido de registro (Supabase error). IP: ${ip}, Email: ${email}, Error: ${error.message}`);
    
    let userMsg = "Error al crear la cuenta.";
    if (error.message.includes("already registered") || error.message.includes("User already exists")) {
      userMsg = "Este correo ya está registrado.";
    } else if (error.message.includes("rate limit")) {
      userMsg = "Límite de registros excedido por Supabase. Intenta más tarde.";
    }
    return { error: userMsg };
  }

  // Since email confirmations are disabled, signUp logs them in automatically.
  // Redirect directly to dashboard.
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth");
}
