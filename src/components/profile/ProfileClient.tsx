"use client";

import { useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { Camera, Edit2, Check, Flame, CheckSquare, Timer, Sparkles, Medal, TrendingUp, Clock, BookOpen, Lock, Unlock, Loader2, Calendar, Crown, CheckCircle, List, Zap, Award, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { format, subDays, startOfWeek, addDays, getHours } from "date-fns";
import { es } from "date-fns/locale";

const getAchievementIcon = (iconName: string) => {
  switch (iconName) {
    case 'flame': return <Flame size={20} />;
    case 'calendar': return <Calendar size={20} />;
    case 'crown': return <Crown size={20} />;
    case 'check-circle': return <CheckCircle size={20} />;
    case 'list': return <List size={20} />;
    case 'zap': return <Zap size={20} />;
    default: return <Award size={20} />;
  }
};

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

/**
 * ProfileClient — Perfil Público y Privado
 * 
 * DESIGN: Academic Clarity, Mobile Native UX
 * SECURITY: Avatar MIME check, read-only on public view (future)
 */
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
    
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedMimeTypes.includes(file.type)) {
      return toast.error("Tipo de archivo no permitido. Solo imágenes.");
    }

    setIsUploading(true);
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    // Use an opaque token/random string for path to prevent enumeration
    const filePath = `${profile.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

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

  const handleShare = () => {
    // Generaría URL pública como /p/usuario-slug
    navigator.clipboard.writeText(`${window.location.origin}/perfil`);
    toast.success("¡Link copiado al portapapeles!");
  };

  // Nivel logic
  const currentLevelIndex = LEVELS.findIndex(l => l.name.toLowerCase() === stats.nivel?.toLowerCase()) || 0;
  const currentLevel = LEVELS[currentLevelIndex !== -1 ? currentLevelIndex : 0];
  const nextLevel = LEVELS[currentLevelIndex + 1] || LEVELS[LEVELS.length - 1];
  const progressPercent = currentLevel.name === "Legendario" ? 100 : Math.min(100, Math.max(0, ((stats.xp_total - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired)) * 100));

  // Insights
  const insights = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentTasks = tasks.filter(t => new Date(t.updated_at) >= oneWeekAgo);
    const recentSessions = sessions.filter(s => new Date(s.created_at) >= oneWeekAgo);
    
    const xpTasks = recentTasks.reduce((sum, t) => sum + (t.xp_reward || 0), 0);
    const xpSessions = recentSessions.reduce((sum, s) => sum + (s.tipo === 'profundo' ? 50 : 10), 0);
    
    const hours = sessions.map(s => getHours(new Date(s.created_at)));
    const hourCounts = hours.reduce((acc, h) => { acc[h] = (acc[h] || 0) + 1; return acc; }, {} as Record<number, number>);
    const topHour = Object.keys(hourCounts).length > 0 ? parseInt(Object.keys(hourCounts).reduce((a, b) => hourCounts[parseInt(a)] > hourCounts[parseInt(b)] ? a : b)) : null;

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

  // Subject Calendar Grid (35 days per subject)
  // [NEEDS BACKEND] Map tasks explicitly by subject. For now using global.
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
      
      let level = 0;
      if (hasTask && hasSession) level = 2; // primary
      else if (hasTask || hasSession) level = 1; // primary/40
      
      days.push({ date: d, level });
    }
    return days;
  }, [tasks, sessions]);

  const unlockedIds = new Set(unlockedAchievements.map(a => a.achievement_id));

  // Sort achievements: unlocked first
  const sortedAchievements = [...allAchievements].sort((a, b) => {
    const aUnlocked = unlockedIds.has(a.id);
    const bUnlocked = unlockedIds.has(b.id);
    if (aUnlocked && !bUnlocked) return -1;
    if (!aUnlocked && bUnlocked) return 1;
    return b.xp_reward - a.xp_reward;
  });

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 animate-fade-in pb-32 transition-screen">
      
      {/* ── Columna Izquierda (Perfil Corto) ── */}
      <div className="w-full lg:w-[320px] shrink-0 space-y-6">
        
        {/* Profile Card — Gradient Header */}
        <div className="card-ac !p-0 overflow-hidden text-center relative border-none">
          {/* Gradient background Academic Clarity */}
          <div className="h-32 bg-gradient-to-b from-primary to-secondary w-full absolute top-0 left-0"></div>
          
          <div className="pt-16 pb-6 px-6 relative z-10 flex flex-col items-center">
            {/* Avatar */}
            <div className="relative group mb-4">
              <div className="w-28 h-28 rounded-full border-4 border-surface bg-surface-container-highest flex items-center justify-center text-4xl font-bold text-neutral overflow-hidden shadow-card">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.nombre?.charAt(0).toUpperCase()
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 bg-neutral/60 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm touch-target"
                aria-label="Cambiar foto de perfil"
              >
                {isUploading ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleAvatarUpload} />
            </div>

            {/* Name */}
            <div className="flex items-center justify-center gap-2 group/name w-full mb-1">
              {isEditingName ? (
                <input 
                  autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
                  onBlur={saveName} onKeyDown={e => e.key === 'Enter' && saveName()}
                  className="font-bold text-xl text-center bg-surface-container-highest border-b-2 border-primary outline-none px-2 w-full max-w-[200px]"
                />
              ) : (
                <h2 className="font-bold text-2xl text-neutral truncate">{user?.nombre}</h2>
              )}
              {!isEditingName && (
                <button onClick={() => setIsEditingName(true)} className="text-outline-variant hover:text-primary opacity-0 group-hover/name:opacity-100 transition-opacity touch-target">
                  <Edit2 size={14} />
                </button>
              )}
            </div>
            
            {/* Level Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-highest text-neutral rounded-ac-chip text-sm font-semibold mb-6 shadow-sm">
              <span className="text-lg">{currentLevel.icon}</span> Nivel {stats.nivel || "Bronce"}
            </div>

            {/* XP Bar */}
            <div className="w-full space-y-2 text-left mb-6">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-on-surface-variant">XP Total</span>
                <span className="text-neutral">{stats.xp_total} <span className="text-outline-variant font-normal">/ {currentLevel.name === "Legendario" ? "Max" : nextLevel.xpRequired}</span></span>
              </div>
              <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div 
                  className="h-full bg-tertiary rounded-full transition-all duration-1000 shadow-[inset_0_-2px_0_rgba(0,0,0,0.1)]" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 w-full gap-2 pt-6 border-t border-outline-variant/30">
              <div className="flex flex-col items-center">
                <span className="text-tertiary mb-1"><Flame size={20} className="fill-tertiary"/></span>
                <span className="font-bold text-neutral">{stats.racha_actual}</span>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Días</span>
              </div>
              <div className="flex flex-col items-center border-x border-outline-variant/30">
                <span className="text-secondary-dark mb-1"><CheckSquare size={20}/></span>
                <span className="font-bold text-neutral">{stats.tareas_completadas}</span>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Tareas</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-primary-dark mb-1"><Timer size={20}/></span>
                <span className="font-bold text-neutral">{Math.floor((stats.minutos_foco_total||0)/60)}</span>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Horas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nivel Progression */}
        <div className="card-ac p-6">
          <h3 className="font-bold text-neutral mb-4">Progresión</h3>
          <div className="space-y-4 relative before:absolute before:inset-y-2 before:left-4 before:w-[2px] before:bg-surface-container-high">
            {LEVELS.map((lvl, i) => {
              const isPast = stats.xp_total >= lvl.xpRequired;
              const isCurrent = lvl.name === currentLevel.name;
              return (
                <div key={lvl.name} className="relative flex items-center gap-4 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    isPast 
                      ? 'bg-primary text-neutral shadow-soft' 
                      : 'bg-surface-container-highest text-outline-variant'
                  }`}>
                    {isPast ? <Check size={16}/> : <Lock size={14}/>}
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${isPast ? 'text-neutral' : 'text-on-surface-variant'}`}>{lvl.icon} {lvl.name}</p>
                    <p className="text-[10px] text-outline-variant font-medium uppercase tracking-wider">{lvl.xpRequired} XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Columna Derecha ── */}
      <div className="flex-1 space-y-6">
        
        {/* Horizontal scrollable Badges Row */}
        <div>
          <h3 className="font-bold text-neutral mb-3 flex items-center gap-2 px-2">
            <Medal className="text-tertiary" size={20}/> Medallas Recientes
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-4 px-2 snap-x">
            {sortedAchievements.filter(a => unlockedIds.has(a.id)).map(ach => (
              <div key={ach.id} className="snap-start shrink-0 flex items-center gap-3 bg-surface border border-outline-variant/30 p-3 rounded-ac-btn shadow-card touch-target">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0
                  ${ach.xp_reward >= 500 ? 'bg-tertiary text-neutral' : 'bg-primary/30 text-primary-dark'}
                `}>
                  {getAchievementIcon(ach.icon || ach.icono)}
                </div>
                <div className="pr-2">
                  <h4 className="font-bold text-sm text-neutral whitespace-nowrap">{ach.titulo}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-outline-variant">{ach.xp_reward} XP</span>
                </div>
              </div>
            ))}
            {unlockedAchievements.length === 0 && (
              <p className="text-sm text-on-surface-variant">Aún no has desbloqueado medallas. ¡Sigue estudiando!</p>
            )}
          </div>
        </div>

        {/* Mapa de Actividad (GitHub style) */}
        <div className="card-ac">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-neutral">Mapa de Actividad (Últimas 5 sem)</h3>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
              Menos
              <div className="w-3 h-3 rounded-sm bg-surface-container-high"></div>
              <div className="w-3 h-3 rounded-sm bg-primary/40"></div>
              <div className="w-3 h-3 rounded-sm bg-primary"></div>
              Más
            </div>
          </div>
          <div className="flex gap-2 w-full overflow-x-auto pb-2">
            {Array.from({length: 5}).map((_, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-2">
                {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, i) => (
                  <div 
                    key={i} 
                    title={format(day.date, "d MMM", { locale: es })}
                    className={`w-[18px] h-[18px] rounded-[4px] transition-colors ${
                      day.level === 0 ? 'bg-surface-container-high' : 
                      day.level === 1 ? 'bg-primary/40' : 
                      'bg-primary shadow-sm'
                    }`}
                  ></div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Logros (Vertical List) */}
        <div className="card-ac">
          <h3 className="font-bold text-neutral mb-6 flex items-center gap-2">
            <Sparkles className="text-secondary-dark"/> Logros Disponibles
          </h3>
          <div className="flex flex-col gap-3">
            {sortedAchievements.filter(a => !unlockedIds.has(a.id)).map(ach => (
              <div key={ach.id} className="flex items-center gap-4 p-4 rounded-ac-btn border border-outline-variant/20 bg-surface-container-lowest opacity-70">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-2xl bg-surface-container-high grayscale">
                  {getAchievementIcon(ach.icon || ach.icono)}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-on-surface-variant">{ach.titulo}</h4>
                  <p className="text-xs text-outline-variant mt-0.5 leading-snug">{ach.descripcion}</p>
                </div>
                <span className="text-xs font-bold bg-surface-container px-2 py-1 rounded-ac-chip text-on-surface-variant">
                  {ach.xp_reward} XP
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Fixed Bottom Actions (Mobile UX) ── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-outline-variant/30 flex justify-center pb-safe z-40 lg:hidden">
        <button onClick={handleShare} className="btn-primary w-full max-w-sm flex items-center justify-center gap-2">
          <Share2 size={18} />
          Compartir perfil
        </button>
      </div>

      {/* Desktop Share Button */}
      <div className="hidden lg:block fixed bottom-8 right-8 z-40">
        <button onClick={handleShare} className="btn-primary flex items-center justify-center gap-2 shadow-card">
          <Share2 size={18} />
          Compartir perfil
        </button>
      </div>
    </div>
  );
}
