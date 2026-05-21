import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Groq from "groq-sdk";
import { checkRateLimit } from "@/lib/rate-limit";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { messages, subject_id } = await req.json();
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Rate Limiting (20 msgs per hour = 3600000 ms)
    const { allowed } = await checkRateLimit(`lumos:${user.id}`, 20, 3600000);
    if (!allowed) {
      return new Response("Has alcanzado el límite de mensajes por hora.", { status: 429 });
    }

    // Recopilar contexto del usuario
    let notebookMateria = null;
    if (subject_id) {
      const { data } = await supabase.from("notebooks").select("materia").eq("id", subject_id).single();
      if (data) notebookMateria = data.materia;
    }

    let tasksQuery = supabase.from("tasks").select("*").eq("user_id", user.id).eq("completada", false).order("prioridad", { ascending: true });
    if (notebookMateria) {
      tasksQuery = tasksQuery.eq("materia", notebookMateria);
    }

    const [
      { data: profile }, 
      { data: stats }, 
      { data: tasks }, 
      { data: sessions }, 
      { data: userAchievements }
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("user_stats").select("*").eq("user_id", user.id).single(),
      tasksQuery,
      supabase.from("focus_sessions").select("*").eq("user_id", user.id).gte("created_at", new Date().toISOString().split('T')[0]),
      supabase.from("user_achievements").select(`achievement_id, achievements(titulo)`).eq("user_id", user.id)
    ]);

    const taskList = tasks && tasks.length > 0 
      ? tasks.map(t => `- ${t.titulo} (Prioridad: ${t.prioridad}, Fecha: ${new Date(t.fecha_entrega).toLocaleDateString()})`).join("\n") 
      : (notebookMateria ? `No hay tareas pendientes para ${notebookMateria}.` : "No hay tareas pendientes.");
      
    const totalFocusMinutes = sessions?.reduce((sum, s) => sum + s.duracion_minutos, 0) || 0;
    
    // El query de achievements hace un join con la tabla achievements, así que (a as any).achievements.titulo es el valor
    const achievementsList = userAchievements && userAchievements.length > 0 
      ? userAchievements.map(a => (a as any).achievements?.titulo).filter(Boolean).join(", ") 
      : "Ninguno aún.";

    const systemPrompt = `Eres Lumos, el asistente académico de FOCOI. Conoces perfectamente a este estudiante:
- Nombre: ${profile?.nombre || "Estudiante"}
- Nivel: ${stats?.nivel || "Bronce"} con ${stats?.xp_total || 0} XP
- Racha actual: ${stats?.racha_actual || 0} días
${notebookMateria ? `- **ESTÁS EN LA MATERIA: ${notebookMateria}**. Limita tu enfoque y respuestas exclusivamente a esta materia y sus tareas. No menciones tareas de otras materias.` : ''}
- Tareas pendientes ${notebookMateria ? `de ${notebookMateria}` : ''}:
${taskList}
- Sesiones de foco hoy: ${sessions?.length || 0} sesiones, ${totalFocusMinutes} minutos
- Logros desbloqueados: ${achievementsList}

Tu tono es motivador, directo y amigable. Hablas en español. Das consejos prácticos y específicos basados en la situación real del estudiante. Cuando el estudiante pregunte qué estudiar o qué hacer, prioriza según urgencia y XP de sus tareas reales. Máximo 3 párrafos por respuesta.`;

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    const completion = await groq.chat.completions.create({
      messages: groqMessages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      stream: true,
      max_tokens: 1024,
    });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            controller.enqueue(new TextEncoder().encode(text));
          }
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream" }
    });

  } catch (error: any) {
    console.error("Lumos API Error:", error);
    return new Response("Error procesando solicitud", { status: 500 });
  }
}
