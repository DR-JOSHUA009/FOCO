"use client";

import { useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { Camera, Edit2, Check, Flame, CheckSquare, Timer, Sparkles, Medal, TrendingUp, Clock, BookOpen, Lock, Unlock, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { format, subDays, startOfWeek, addDays, getHours } from "date-fns";
import { es } from "date-fns/locale";

interface ProfileClientProps {
  profile: any;
  stats: any;
  tasks: any[];
  sessions: any[];
  allAchievements: any[];
  unlockedAchievements: any[];
}

const LEVELS = [
  { name: "Bronce", xpRequired: 0, icon: "🥉" },
  { name: "Plata", xpRequired: 800, icon: "🥈" },
  { name: "Oro", xpRequired: 2000, icon: "🥇" },
  { name: "Legendario", xpRequired: 4000, icon: "👑" },
];

export default function ProfileClient({ profile, stats, tasks, sessions, allAchievements, unlockedAchievements }: ProfileClientProps) {
  const supabase = createClient();
  const { user, setUser } = useAppStore();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(profile.nombre || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveName = async () => {
    setIsEditingName(false);
    if (!name.trim() || name === profile.nombre) return;
    const { error } = await supabase.from("profiles").update({ nombre: name.trim() }).eq("id", profile.id);
    if (!error && user) {
      setUser({ ...user, nombre: name.trim() });
      toast.success("Nombre actualizado");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("La imagen debe pesar menos de 2MB");
    if (!file.type.startsWith("image/")) return toast.error("Solo se permiten imágenes");

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${profile.id}-${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
    if (uploadError) {
      toast.error("Error al subir imagen");
      setIsUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", profile.id);
    if (!updateError && user) {
      setUser({ ...user, avatar_url: data.publicUrl });
      toast.success("Avatar actualizado");
    }
    setIsUploading(false);
  };

  // Nivel logic
  const currentLevelIndex = LEVELS.findIndex(l => l.name.toLowerCase() === stats.nivel?.toLowerCase()) || 0;
  const currentLevel = LEVELS[currentLevelIndex !== -1 ? currentLevelIndex : 0];
  const nextLevel = LEVELS[currentLevelIndex + 1] || LEVELS[LEVELS.length - 1];
  const progressPercent = currentLevel.name === "Legendario" ? 100 : Math.min(100, Math.max(0, ((stats.xp_total - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired)) * 100));

  // Insights
  const insights = useMemo(() => {
    // XP This week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentTasks = tasks.filter(t => new Date(t.updated_at) >= oneWeekAgo);
    const recentSessions = sessions.filter(s => new Date(s.created_at) >= oneWeekAgo);
    
    const xpTasks = recentTasks.reduce((sum, t) => sum + (t.xp_reward || 0), 0);
    const xpSessions = recentSessions.reduce((sum, s) => sum + (s.tipo === 'profundo' ? 50 : 10), 0);
    
    // Top hour
    const hours = sessions.map(s => getHours(new Date(s.created_at)));
    const hourCounts = hours.reduce((acc, h) => { acc[h] = (acc[h] || 0) + 1; return acc; }, {} as Record<number, number>);
    const topHour = Object.keys(hourCounts).length > 0 ? parseInt(Object.keys(hourCounts).reduce((a, b) => hourCounts[parseInt(a)] > hourCounts[parseInt(b)] ? a : b)) : null;

    // Top subject
    const subjects = tasks.map(t => t.materia).filter(Boolean);
    const subCounts = subjects.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {} as Record<string, number>);
    const topSub = Object.keys(subCounts).length > 0 ? Object.keys(subCounts).reduce((a, b) => subCounts[a] > subCounts[b] ? a : b) : "N/A";

    return {
      xpThisWeek: xpTasks + xpSessions,
      bestStreak: stats.racha_maxima || 0,
      topHour: topHour !== null ? `${topHour}:00` : "N/A",
      topSubject: topSub
    };
  }, [tasks, sessions, stats.racha_maxima]);

  // Calendar Grid (35 days)
  const calendarDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 34; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const hasTask = tasks.some(t => t.updated_at.startsWith(dateStr));
      const hasSession = sessions.some(s => s.created_at.startsWith(dateStr));
      
      let level = 0; // 0: gris, 1: verde claro, 2: verde oscuro
      if (hasTask && hasSession) level = 2;
      else if (hasTask || hasSession) level = 1;
      
      days.push({ date: d, level });
    }
    return days;
  }, [tasks, sessions]);

  const unlockedIds = new Set(unlockedAchievements.map(a => a.achievement_id));

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 animate-fade-in pb-12">
      {/* Columna Izquierda (Perfil Corto) */}
      <div className="w-full lg:w-[320px] shrink-0 space-y-6">
        <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col items-center pt-8 pb-6 px-6 text-center">
          <div className="relative group mb-4">
            <div className="w-28 h-28 rounded-full border-4 border-primary-container bg-surface-container flex items-center justify-center text-4xl font-bold text-primary overflow-hidden shadow-inner">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.nombre?.charAt(0).toUpperCase()
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute inset-0 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm"
            >
              {isUploading ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleAvatarUpload} />
          </div>

          <div className="flex items-center justify-center gap-2 group/name w-full mb-1">
            {isEditingName ? (
              <input 
                autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
                onBlur={saveName} onKeyDown={e => e.key === 'Enter' && saveName()}
                className="font-bold text-xl text-center bg-surface-container-lowest border-b-2 border-primary outline-none px-2 w-full max-w-[200px]"
              />
            ) : (
              <h2 className="font-bold text-2xl text-on-surface truncate">{user?.nombre}</h2>
            )}
            {!isEditingName && (
              <button onClick={() => setIsEditingName(true)} className="text-outline-variant hover:text-primary opacity-0 group-hover/name:opacity-100 transition-opacity">
                <Edit2 size={14} />
              </button>
            )}
          </div>
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-highest text-on-surface-variant rounded-full text-sm font-semibold mb-6">
            <span className="text-lg">{currentLevel.icon}</span> {stats.nivel || "Bronce"}
          </div>

          <div className="w-full space-y-2 text-left mb-8">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-on-surface-variant">XP Total</span>
              <span className="text-primary">{stats.xp_total} <span className="text-outline-variant font-normal">/ {currentLevel.name === "Legendario" ? "Max" : nextLevel.xpRequired}</span></span>
            </div>
            <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>

          <div className="grid grid-cols-3 w-full gap-2 pt-6 border-t border-outline-variant/30">
            <div className="flex flex-col items-center">
              <span className="text-warning mb-1"><Flame size={20}/></span>
              <span className="font-bold text-on-surface">{stats.racha_actual}</span>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Días</span>
            </div>
            <div className="flex flex-col items-center border-x border-outline-variant/30">
              <span className="text-success mb-1"><CheckSquare size={20}/></span>
              <span className="font-bold text-on-surface">{stats.tareas_completadas}</span>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Tareas</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-secondary mb-1"><Timer size={20}/></span>
              <span className="font-bold text-on-surface">{Math.floor((stats.minutos_foco_total||0)/60)}</span>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Horas</span>
            </div>
          </div>
        </div>

        {/* Nivel Progression */}
        <div className="bg-white rounded-3xl border border-outline-variant/30 shadow-sm p-6">
          <h3 className="font-bold text-on-surface mb-4">Progresión</h3>
          <div className="space-y-4 relative before:absolute before:inset-y-2 before:left-4 before:w-0.5 before:bg-surface-container-high">
            {LEVELS.map((lvl, i) => {
              const isPast = stats.xp_total >= lvl.xpRequired;
              const isCurrent = lvl.name === currentLevel.name;
              return (
                <div key={lvl.name} className="relative flex items-center gap-4 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isPast ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-surface-container text-outline-variant'}`}>
                    {isPast ? <Check size={16}/> : <Lock size={14}/>}
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${isPast ? 'text-on-surface' : 'text-on-surface-variant'}`}>{lvl.icon} {lvl.name}</p>
                    <p className="text-[10px] text-outline-variant font-medium uppercase tracking-wider">{lvl.xpRequired} XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Columna Derecha */}
      <div className="flex-1 space-y-6">
        
        {/* Insights Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
            <span className="text-primary mb-2"><Sparkles size={20}/></span>
            <span className="text-2xl font-bold text-on-surface mb-1">+{insights.xpThisWeek}</span>
            <span className="text-xs text-on-surface-variant font-medium">XP esta semana</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
            <span className="text-warning mb-2"><TrendingUp size={20}/></span>
            <span className="text-2xl font-bold text-on-surface mb-1">{insights.bestStreak}</span>
            <span className="text-xs text-on-surface-variant font-medium">Mejor racha (días)</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
            <span className="text-secondary-dark mb-2"><Clock size={20}/></span>
            <span className="text-2xl font-bold text-on-surface mb-1">{insights.topHour}</span>
            <span className="text-xs text-on-surface-variant font-medium">Hora más productiva</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
            <span className="text-success mb-2"><BookOpen size={20}/></span>
            <span className="text-xl font-bold text-on-surface mb-1 truncate">{insights.topSubject}</span>
            <span className="text-xs text-on-surface-variant font-medium">Materia Top</span>
          </div>
        </div>

        {/* Mapa de Actividad */}
        <div className="bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-on-surface">Mapa de Actividad (Últimas 5 sem)</h3>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
              Menos
              <div className="w-3 h-3 rounded bg-surface-container-high"></div>
              <div className="w-3 h-3 rounded bg-[#a2cbf0]"></div>
              <div className="w-3 h-3 rounded bg-primary"></div>
              Más
            </div>
          </div>
          <div className="flex gap-2 w-full overflow-x-auto pb-2">
            {/* Split calendarDays into weeks (chunks of 7) */}
            {Array.from({length: 5}).map((_, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-2">
                {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, i) => (
                  <div 
                    key={i} 
                    title={format(day.date, "d MMM", { locale: es })}
                    className={`w-4 h-4 rounded-sm transition-colors ${
                      day.level === 0 ? 'bg-surface-container-high' : 
                      day.level === 1 ? 'bg-[#a2cbf0]' : 
                      'bg-primary shadow-sm shadow-primary/20'
                    }`}
                  ></div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Logros Grid */}
        <div className="bg-white p-6 rounded-3xl border border-outline-variant/30 shadow-sm">
          <h3 className="font-bold text-on-surface mb-6 flex items-center gap-2">
            <Medal className="text-warning"/> Mis Logros
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allAchievements.map(ach => {
              const unlocked = unlockedIds.has(ach.id);
              const Icon = unlocked ? Unlock : Lock;
              return (
                <div key={ach.id} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                  unlocked 
                    ? 'border-primary/30 bg-primary-container/10 shadow-sm' 
                    : 'border-outline-variant/20 bg-surface-container-lowest opacity-60'
                }`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-2xl ${
                    unlocked ? 'bg-white shadow-sm' : 'bg-surface-container-high grayscale'
                  }`}>
                    {ach.icon}
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${unlocked ? 'text-on-surface' : 'text-on-surface-variant'}`}>{ach.titulo}</h4>
                    <p className="text-xs text-on-surface-variant mt-1 leading-snug">{ach.descripcion}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-warning/10 text-warning px-1.5 py-0.5 rounded">+{ach.xp_reward} XP</span>
                      {unlocked && <span className="text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success px-1.5 py-0.5 rounded">Desbloqueado</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
