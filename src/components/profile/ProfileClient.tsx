"use client";

import { useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { Camera, Edit2, Check, Flame, Trophy, Share2, Medal, Lock, Sparkles, TrendingUp, CheckSquare, Calendar, Award } from "lucide-react";
import toast from "react-hot-toast";

interface ProfileClientProps {
  profile: any;
  stats: any;
  tasks: any[];
  sessions: any[];
  allAchievements: any[];
  unlockedAchievements: any[];
}

const LEVELS = [
  { name: "Estudiante Novato", xpRequired: 0 },
  { name: "Estudiante Promedio", xpRequired: 800 },
  { name: "Estudiante Constante", xpRequired: 2000 },
  { name: "Estudiante Élite", xpRequired: 4000 },
];

const COLORS = ["bg-primary", "bg-secondary", "bg-tertiary"];

/**
 * ProfileClient — Perfil Académico Público (PRIORITY 5 Rebuild)
 * 
 * STRICT ACADEMIC CLARITY DESIGN
 * - Header gradient, 80px avatar, outlined share button
 * - Subjects grid with mini activity graphs
 * - Stats and recent achievements
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
    if (file.size > 2 * 1024 * 1024) return toast.error("Máximo 2MB");
    
    setIsUploading(true);
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${profile.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
    if (!uploadError) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", profile.id);
      if (user) setUser({ ...user, avatar_url: data.publicUrl });
      toast.success("Avatar actualizado");
    }
    setIsUploading(false);
  };

  const handleShare = () => {
    // Generate an opaque URL so we don't expose user IDs directly
    // [NEEDS BACKEND] Implement proper slug logic for users
    const opaqueToken = btoa(profile.id).replace(/=/g, "");
    navigator.clipboard.writeText(`${window.location.origin}/p/${opaqueToken}`);
    toast.success("¡Link copiado!");
  };

  // Nivel logic
  const currentLevelIndex = LEVELS.findIndex(l => l.name.toLowerCase() === (stats.nivel || "Estudiante Novato").toLowerCase()) || 0;
  const currentLevelName = stats.nivel || "Estudiante Novato";
  const levelNumber = currentLevelIndex + 1;
  const currentLvlConfig = LEVELS[currentLevelIndex !== -1 ? currentLevelIndex : 0];
  const nextLvlConfig = LEVELS[currentLevelIndex + 1] || LEVELS[LEVELS.length - 1];
  const isMaxLevel = currentLevelIndex === LEVELS.length - 1;
  const progressPercent = isMaxLevel ? 100 : Math.min(100, Math.max(0, ((stats.xp_total - currentLvlConfig.xpRequired) / (nextLvlConfig.xpRequired - currentLvlConfig.xpRequired)) * 100));

  // Subject Grid processing
  const subjectsData = useMemo(() => {
    const subs: Record<string, { lastAccess: Date, xp: number, history: boolean[] }> = {};
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    tasks.forEach(t => {
      if (!t.materia) return;
      if (!subs[t.materia]) subs[t.materia] = { lastAccess: new Date(t.updated_at), xp: 0, history: Array(28).fill(false) };
      
      const d = new Date(t.updated_at);
      if (d > subs[t.materia].lastAccess) subs[t.materia].lastAccess = d;
      if (d >= oneWeekAgo) subs[t.materia].xp += (t.xp_reward || 0);

      const daysDiff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff < 28) subs[t.materia].history[daysDiff] = true;
    });

    return Object.entries(subs).sort((a, b) => b[1].lastAccess.getTime() - a[1].lastAccess.getTime());
  }, [tasks]);

  const unlockedIds = new Set(unlockedAchievements.map(a => a.achievement_id));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32 animate-fade-in relative transition-screen">
      
      {/* ── HEADER (PRIORITY 5 FIX) ── */}
      <div className="relative overflow-hidden rounded-ac-card border-none shadow-card bg-surface">
        {/* Gradient Background */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-primary to-secondary z-0"></div>
        
        {/* Share Button (Outlined in Header) */}
        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={handleShare} 
            className="flex items-center gap-2 px-4 py-2 border-2 border-primary/50 text-neutral bg-white/80 hover:bg-white backdrop-blur-sm rounded-ac-btn font-bold text-sm shadow-sm transition-all touch-target"
          >
            <Share2 size={16} /> Compartir perfil
          </button>
        </div>

        <div className="relative z-10 pt-12 pb-6 px-6 sm:px-10 flex flex-col items-center">
          {/* Avatar (80px circle, white border 3px) */}
          <div className="relative group mb-3">
            <div className="w-[80px] h-[80px] rounded-full border-[3px] border-white bg-surface-container-highest shadow-soft flex items-center justify-center text-2xl font-bold text-neutral overflow-hidden shrink-0">
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
            >
              <Camera size={20} />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleAvatarUpload} />
          </div>

          {/* Username (Inter Headline 22px Neutral) */}
          <div className="flex items-center gap-2 group/name mb-1">
            {isEditingName ? (
              <input 
                autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
                onBlur={saveName} onKeyDown={e => e.key === 'Enter' && saveName()}
                className="font-bold text-[22px] leading-tight text-center bg-surface-container border-b-2 border-primary outline-none px-2 w-[200px]"
              />
            ) : (
              <h2 className="font-bold text-[22px] text-neutral">{user?.nombre}</h2>
            )}
            {!isEditingName && (
              <button onClick={() => setIsEditingName(true)} className="text-outline-variant hover:text-primary opacity-0 group-hover/name:opacity-100 transition-opacity touch-target">
                <Edit2 size={14} />
              </button>
            )}
          </div>

          {/* Level Label (Inter Label 14px Primary) */}
          <p className="text-[14px] font-bold text-primary mb-4">Nivel {levelNumber} · {currentLevelName}</p>

          {/* Streak Row */}
          <div className="flex items-center gap-2 mb-6">
            <Flame size={20} className="fill-tertiary text-tertiary" />
            <span className="font-bold text-[20px] text-neutral leading-none">{stats.racha_actual}</span>
            <span className="text-[12px] text-on-surface-variant leading-none ml-1">días seguidos</span>
          </div>

          {/* XP Progress Bar (Tertiary fill, Surface track, 8px height) */}
          <div className="w-full max-w-sm space-y-2">
            <div className="h-[8px] w-full bg-surface-container rounded-full overflow-hidden">
              <div 
                className="h-full bg-tertiary rounded-full transition-all duration-1000" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <p className="text-[12px] text-on-surface-variant text-center">
              {stats.xp_total} / {isMaxLevel ? "Máx" : nextLvlConfig.xpRequired} XP para Nivel {levelNumber + 1}
            </p>
          </div>
        </div>
      </div>

      {/* ── STATS CARD (3 Columns) ── */}
      <div className="card-ac !p-0 overflow-hidden flex border border-outline-variant/30 divide-x divide-outline-variant/30">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <span className="text-[24px] font-bold text-primary mb-1">{stats.tareas_completadas}</span>
          <span className="text-[12px] text-neutral/70 font-semibold tracking-wider uppercase text-center">Tareas Completadas</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <span className="text-[24px] font-bold text-primary mb-1">{stats.racha_maxima}</span>
          <span className="text-[12px] text-neutral/70 font-semibold tracking-wider uppercase text-center">Racha Récord</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <span className="text-[24px] font-bold text-primary mb-1">{unlockedAchievements.length}</span>
          <span className="text-[12px] text-neutral/70 font-semibold tracking-wider uppercase text-center">Logros Desbloqueados</span>
        </div>
      </div>

      {/* ── BADGES ROW (Horizontal Chips) ── */}
      <div>
        <h3 className="font-bold text-neutral text-[16px] mb-3 px-2">Logros</h3>
        <div className="flex gap-3 overflow-x-auto pb-4 px-2 snap-x hide-scrollbar">
          {allAchievements.map((ach) => {
            const isUnlocked = unlockedIds.has(ach.id);
            // Badges Auto-sync logic visually (Gold, Silver, Regular, Locked)
            let chipStyle = "";
            let iconStyle = "";
            
            if (!isUnlocked) {
              chipStyle = "bg-neutral/5 border border-outline-variant/30 opacity-60";
              iconStyle = "text-outline-variant";
            } else if (ach.titulo.includes("Rey") || ach.xp_reward >= 1000) {
              chipStyle = "bg-tertiary text-neutral font-bold border border-tertiary-dark shadow-sm";
              iconStyle = "text-neutral fill-neutral";
            } else if (ach.xp_reward >= 500) {
              chipStyle = "bg-primary/70 text-neutral font-bold border border-primary shadow-sm";
              iconStyle = "text-neutral";
            } else {
              chipStyle = "bg-surface border border-primary text-neutral font-bold";
              iconStyle = "text-primary";
            }

            return (
              <div 
                key={ach.id} 
                className={`snap-start shrink-0 flex items-center gap-2.5 px-4 py-2 rounded-ac-chip touch-target ${chipStyle} min-w-max transition-transform hover:scale-105 cursor-pointer`}
                title={ach.descripcion}
              >
                {!isUnlocked ? <Lock size={16} className={iconStyle} /> : <Trophy size={16} className={iconStyle} />}
                <span className="text-[14px]">{ach.titulo}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SUBJECTS GRID (2-Column) ── */}
      <div>
        <h3 className="font-bold text-neutral text-[16px] mb-3 px-2">Materias Activas</h3>
        {subjectsData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
            {subjectsData.map(([subject, data], idx) => {
              const colorClass = COLORS[idx % COLORS.length];
              
              // 7x4 Mini Activity Graph
              const renderGraph = () => {
                const squares = [];
                for (let row = 0; row < 4; row++) {
                  const rowContent = [];
                  for (let col = 0; col < 7; col++) {
                    const dayIndex = col * 4 + row;
                    const isActive = data.history[dayIndex];
                    rowContent.push(
                      <div key={col} className={`w-[6px] h-[6px] rounded-[1px] ${isActive ? colorClass : 'bg-surface-container-highest'}`} />
                    );
                  }
                  squares.push(<div key={row} className="flex gap-[2px]">{rowContent}</div>);
                }
                return <div className="flex flex-col gap-[2px] ml-auto">{squares}</div>;
              };

              return (
                <div key={subject} className={`card-ac !p-4 border border-outline-variant/30 flex items-start gap-4 relative overflow-hidden group`}>
                  {/* Left 4px rotating border */}
                  <div className={`absolute top-0 left-0 bottom-0 w-[4px] ${colorClass}`}></div>
                  
                  <div className="flex-1 pl-2">
                    <h4 className="font-bold text-[16px] text-neutral truncate max-w-[150px]">{subject}</h4>
                    <p className="text-[12px] text-neutral/60 mb-3">Último acceso: {data.lastAccess.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                    {/* Tertiary XP chip */}
                    <span className="inline-block px-2 py-0.5 bg-tertiary/20 text-tertiary-dark text-[10px] font-bold uppercase tracking-wider rounded-sm">
                      +{data.xp} XP esta semana
                    </span>
                  </div>

                  {/* Activity Graph */}
                  <div className="shrink-0 flex items-center justify-center">
                    {renderGraph()}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-8 border-2 border-dashed border-outline-variant/40 rounded-ac-card mx-2">
            <BookOpen size={32} className="mx-auto text-outline-variant mb-2" />
            <p className="text-[14px] text-on-surface-variant">Aún no hay actividad en materias.</p>
          </div>
        )}
      </div>

      {/* ── LOGROS RECIENTES LIST ── */}
      <div>
        <h3 className="font-bold text-neutral text-[16px] mb-3 px-2">Logros Recientes</h3>
        <div className="space-y-3 px-2">
          {unlockedAchievements.map((ua) => {
            const ach = allAchievements.find(a => a.id === ua.achievement_id);
            if (!ach) return null;
            
            return (
              <div key={ua.achievement_id} className="card-ac !p-4 flex items-center gap-4 border border-outline-variant/20 hover:border-primary/40 transition-colors">
                {/* Icon Circle (Primary 15%, stroke Primary, 40px) */}
                <div className="w-[40px] h-[40px] rounded-full bg-primary/15 flex items-center justify-center shrink-0 border border-primary/30 text-primary">
                  <Award size={20} />
                </div>
                
                <div className="flex-1">
                  <h4 className="font-bold text-[14px] text-neutral">{ach.titulo}</h4>
                  <p className="text-[12px] text-neutral/60 mt-0.5 leading-snug">{ach.descripcion}</p>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="bg-surface-container px-2 py-1 rounded-ac-chip text-[10px] font-bold text-on-surface-variant uppercase">
                    +{ach.xp_reward} XP
                  </span>
                  <span className="text-[10px] text-outline-variant font-medium">
                    {new Date(ua.unlocked_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
          {unlockedAchievements.length === 0 && (
            <p className="text-sm text-on-surface-variant text-center py-4">Sigue completando tareas para desbloquear logros.</p>
          )}
        </div>

        {/* Ver historial completo (Outlined centered) */}
        {unlockedAchievements.length > 0 && (
          <div className="mt-6 flex justify-center">
            <button className="px-6 py-2 border-2 border-outline-variant/30 text-on-surface-variant hover:text-neutral hover:bg-surface-container-high rounded-ac-btn text-sm font-bold transition-all touch-target">
              Ver historial completo
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
