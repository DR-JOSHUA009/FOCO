import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Brain, CheckSquare, Clock, Flame, BookOpen, Timer } from "lucide-react";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: stats } = await supabase.from("user_stats").select("*").eq("user_id", user.id).single();

  const today = new Date().toISOString().split('T')[0];
  const { data: pendingTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("completada", false)
    .gte("fecha_entrega", today)
    .order("fecha_entrega", { ascending: true })
    .limit(3);

  const hour = new Date().getHours();
  let greetingMsg = "¡A darle con todo!";
  if (hour < 12) greetingMsg = "Una mañana productiva te espera.";
  else if (hour < 18) greetingMsg = "Mantén el ritmo, vas muy bien.";
  else greetingMsg = "Un último esfuerzo antes de descansar.";

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-on-surface mb-2">Hola, {profile?.nombre?.split(" ")[0] || "Estudiante"} 👋</h1>
        <p className="text-lg text-on-surface-variant">{greetingMsg}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-secondary font-medium">
            <Brain size={18} />
            <span>XP Total</span>
          </div>
          <span className="text-3xl font-bold">{stats?.xp_total || 0}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-500 font-medium">
            <Flame size={18} />
            <span>Racha Actual</span>
          </div>
          <span className="text-3xl font-bold">{stats?.racha_actual || 0} días</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-error font-medium">
            <CheckSquare size={18} />
            <span>Tareas Hoy</span>
          </div>
          <span className="text-3xl font-bold">{pendingTasks?.length || 0} pdts.</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Clock size={18} />
            <span>Foco Hoy</span>
          </div>
          <span className="text-3xl font-bold">{stats?.minutos_foco_total || 0} min</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Tus tareas de hoy</h2>
          <div className="bg-white rounded-2xl border border-outline-variant/50 shadow-sm overflow-hidden">
            {pendingTasks && pendingTasks.length > 0 ? (
              <ul className="divide-y divide-outline-variant/30">
                {pendingTasks.map((task) => (
                  <li key={task.id} className="p-4 flex items-center gap-4 hover:bg-surface-container-lowest transition-colors">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${task.prioridad === 'alta' ? 'bg-error' : task.prioridad === 'media' ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{task.titulo}</h3>
                      <p className="text-sm text-on-surface-variant">{task.materia}</p>
                    </div>
                    <div className="text-sm font-medium text-primary bg-primary-container/20 px-2 py-1 rounded-md">
                      +{task.xp_reward} XP
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-on-surface-variant flex flex-col items-center gap-2">
                <CheckSquare size={32} className="opacity-50" />
                <p>No tienes tareas pendientes para hoy. ¡A descansar!</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Acceso rápido</h2>
          <div className="flex flex-col gap-3">
            <Link href="/dashboard" className="flex items-center gap-3 bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:border-primary transition-all group">
              <div className="bg-primary-container/30 text-primary p-2 rounded-lg group-hover:scale-110 transition-transform"><Brain size={20} /></div>
              <span className="font-medium text-sm">Ir al Dashboard</span>
            </Link>
            <Link href="/foco" className="flex items-center gap-3 bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:border-primary transition-all group">
              <div className="bg-primary-container/30 text-primary p-2 rounded-lg group-hover:scale-110 transition-transform"><Timer size={20} /></div>
              <span className="font-medium text-sm">Zona de Foco</span>
            </Link>
            <Link href="/cuadernos" className="flex items-center gap-3 bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:border-primary transition-all group">
              <div className="bg-primary-container/30 text-primary p-2 rounded-lg group-hover:scale-110 transition-transform"><BookOpen size={20} /></div>
              <span className="font-medium text-sm">Nuevo cuaderno</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
