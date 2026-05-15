"use client";

import { useState } from "react";
import { User, UserStats, Task, Achievement, FocusSession } from "@/types";
import { Flame, CheckSquare, Clock, ListTodo, Plus, Award, ChevronRight, Target } from "lucide-react";
import TaskModal from "./TaskModal";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardClientProps {
  profile: any;
  stats: UserStats;
  tasks: Task[];
  achievements: Achievement[];
  userAchievements: any[];
  recentSessions: FocusSession[];
}

export default function DashboardClient({
  profile,
  stats,
  tasks,
  achievements,
  userAchievements,
  recentSessions,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"pendientes" | "todas" | "completadas">("pendientes");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Lógica de niveles
  const getLevelInfo = (xp: number) => {
    if (xp >= 4000) return { name: "Legendario", min: 4000, max: 8000, color: "text-purple-500", bg: "bg-purple-100", bar: "bg-purple-500", icon: "👑" };
    if (xp >= 2000) return { name: "Oro", min: 2000, max: 4000, color: "text-yellow-500", bg: "bg-yellow-100", bar: "bg-yellow-500", icon: "🏆" };
    if (xp >= 800) return { name: "Plata", min: 800, max: 2000, color: "text-gray-400", bg: "bg-gray-100", bar: "bg-gray-400", icon: "🥈" };
    return { name: "Bronce", min: 0, max: 800, color: "text-amber-700", bg: "bg-amber-100", bar: "bg-amber-700", icon: "🥉" };
  };

  const levelInfo = getLevelInfo(stats?.xp_total || 0);
  const xpProgress = ((stats?.xp_total || 0) - levelInfo.min) / (levelInfo.max - levelInfo.min) * 100;

  // Filtrado de tareas
  const filteredTasks = tasks.filter((t) => {
    if (activeTab === "pendientes") return !t.completada;
    if (activeTab === "completadas") return t.completada;
    return true;
  });

  // Actividad Semanal (últimos 14 días)
  const getActivityDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const hasActivity = recentSessions.some(s => s.created_at.startsWith(dateStr));
      days.push({ date: dateStr, active: hasActivity });
    }
    return days;
  };

  const activityDays = getActivityDays();
  const unlockedAchievementIds = userAchievements.map(ua => ua.achievement_id);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in flex flex-col xl:flex-row gap-8">
      {/* Columna Principal */}
      <div className="flex-1 space-y-8">
        <header className="mb-6">
          <p className="text-sm font-bold text-outline uppercase tracking-widest mb-1">// DASHBOARD</p>
          <h1 className="text-4xl font-bold text-on-surface">Hola, {profile?.nombre?.split(" ")[0] || "Estudiante"}</h1>
        </header>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 text-warning font-medium">
              <Flame size={18} /><span>Racha</span>
            </div>
            <span className="text-2xl font-bold">{stats?.racha_actual || 0} días</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 text-success font-medium text-green-500">
              <CheckSquare size={18} /><span>Completadas</span>
            </div>
            <span className="text-2xl font-bold">{stats?.tareas_completadas || 0}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Clock size={18} /><span>Foco Total</span>
            </div>
            <span className="text-2xl font-bold">
              {Math.floor((stats?.minutos_foco_total || 0) / 60)}h {(stats?.minutos_foco_total || 0) % 60}m
            </span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 text-error font-medium">
              <ListTodo size={18} /><span>Pendientes</span>
            </div>
            <span className="text-2xl font-bold">{tasks.filter(t => !t.completada).length}</span>
          </div>
        </div>

        {/* Card de Nivel y XP */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`text-4xl ${levelInfo.bg} w-16 h-16 rounded-full flex items-center justify-center`}>
                {levelInfo.icon}
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface">Nivel {levelInfo.name}</h2>
                <p className="text-sm text-on-surface-variant">{stats?.xp_total || 0} / {levelInfo.max} XP</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-primary bg-primary-container/30 px-3 py-1 rounded-full">
                Siguiente Nivel: {levelInfo.max - (stats?.xp_total || 0)} XP restantes
              </span>
            </div>
          </div>
          <div className="w-full bg-surface-container h-3 rounded-full overflow-hidden">
            <div 
              className={`h-full ${levelInfo.bar} transition-all duration-1000 ease-out`} 
              style={{ width: `${Math.min(100, Math.max(0, xpProgress))}%` }}
            ></div>
          </div>
        </div>

        {/* Mis Tareas */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <Target size={20} className="text-primary" /> Mis Tareas
            </h2>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary-dark transition-transform hover:scale-105 active:scale-95"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <div className="bg-white rounded-2xl border border-outline-variant/50 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            {/* Tabs */}
            <div className="flex border-b border-outline-variant/30">
              {(["pendientes", "todas", "completadas"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${
                    activeTab === tab ? "text-primary border-b-2 border-primary" : "text-on-surface-variant hover:bg-surface"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto">
              {filteredTasks.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant/50">
                  <ListTodo size={48} className="mb-4" />
                  <p>No hay tareas en esta categoría.</p>
                </div>
              ) : (
                <ul className="divide-y divide-outline-variant/30">
                  {filteredTasks.map(task => (
                    <li key={task.id} className="p-4 flex items-center gap-4 hover:bg-surface transition-colors group">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${task.completada ? 'bg-outline-variant' : task.prioridad === 'alta' ? 'bg-error' : task.prioridad === 'media' ? 'bg-warning' : 'bg-green-500'}`}></div>
                      <div className="flex-1">
                        <h3 className={`font-semibold text-on-surface ${task.completada ? 'line-through opacity-60' : ''}`}>{task.titulo}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant">{task.materia}</span>
                          <span className="text-xs text-on-surface-variant">
                            {format(new Date(task.fecha_entrega), "d MMM, yyyy", { locale: es })}
                          </span>
                        </div>
                      </div>
                      <div className="hidden sm:flex gap-1">
                        {task.tags && task.tags.map(tag => (
                          <span key={tag} className="text-[10px] uppercase font-bold tracking-wider bg-outline-variant/20 text-on-surface-variant px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                      <div className="font-bold text-sm text-primary">
                        +{task.xp_reward} XP
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Panel Derecho */}
      <div className="w-full xl:w-[320px] space-y-6">
        
        {/* Actividad Semanal */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant/50 shadow-sm">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Clock size={18} className="text-primary"/> Actividad Semanal</h3>
          <div className="grid grid-cols-7 gap-2">
            {activityDays.map((day, i) => (
              <div 
                key={day.date} 
                title={day.date}
                className={`aspect-square rounded-md ${day.active ? 'bg-primary' : 'bg-surface-container'} transition-colors hover:ring-2 ring-primary-container`}
              ></div>
            ))}
          </div>
          <div className="flex justify-between items-center mt-3 text-xs text-on-surface-variant">
            <span>Hace 14 días</span>
            <span>Hoy</span>
          </div>
        </div>

        {/* Logros */}
        <div className="bg-white p-6 rounded-2xl border border-outline-variant/50 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold flex items-center gap-2"><Award size={18} className="text-warning"/> Logros Recientes</h3>
            <button className="text-xs text-primary font-bold hover:underline">Ver todos</button>
          </div>
          <div className="space-y-3">
            {achievements.slice(0, 6).map((ach) => {
              const unlocked = unlockedAchievementIds.includes(ach.id);
              return (
                <div key={ach.id} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${unlocked ? 'bg-surface' : 'opacity-60 grayscale'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${unlocked ? 'bg-warning/20' : 'bg-outline-variant/30'}`}>
                    {ach.icono}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold leading-none">{ach.nombre}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{ach.xp_reward} XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Modal de Nueva Tarea */}
      {isModalOpen && (
        <TaskModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
