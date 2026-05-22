"use client";

import { Link2, Trophy, Medal, Lock, ChevronRight, Edit2, Bell, LogOut, Flame } from "lucide-react";
import toast from "react-hot-toast";
import { LEVELS, getLevelForXP } from "@/lib/xp-config";

// ============================================
// FIX 3: PROFILE REBUILD — Academic Clarity
// ============================================

interface ProfileClientProps {
  profile: Record<string, any>;
  stats: Record<string, any>;
  tasks: Record<string, any>[];
  sessions: Record<string, any>[];
  allAchievements: Record<string, any>[];
  unlockedAchievements: Record<string, any>[];
  isPublic?: boolean;
}

export default function ProfileClient({
  profile,
  stats,
  tasks,
  sessions,
  allAchievements,
  unlockedAchievements,
  isPublic = false,
}: ProfileClientProps) {

  const handleShare = () => {
    const token = btoa(profile?.id || "anonymous");
    const url = `${window.location.origin}/perfil/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("¡Link copiado!");
  };

  // ── Level logic ──
  const currentXP = stats?.xp_total || 0;
  const levelInfo = getLevelForXP(currentXP);
  const currentLevelIndex = LEVELS.findIndex(l => l.name === levelInfo.name);
  const nextLevel = LEVELS[currentLevelIndex + 1];
  const isMaxLevel = !nextLevel;
  const nextLevelXP = nextLevel?.xpRequired || currentXP;
  const prevLevelXP = LEVELS[currentLevelIndex]?.xpRequired || 0;
  const progressPercent = isMaxLevel
    ? 100
    : Math.min(100, ((currentXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100);

  const streak = stats?.racha_actual || 0;

  // ── Build subject data from tasks ──
  const subjectMap: Record<string, { xp: number; lastAccess: string }> = {};
  (tasks || []).forEach((t: any) => {
    const mat = t.materia || "General";
    if (!subjectMap[mat]) subjectMap[mat] = { xp: 0, lastAccess: t.updated_at };
    subjectMap[mat].xp += t.xp_reward || 0;
    if (t.updated_at > subjectMap[mat].lastAccess) subjectMap[mat].lastAccess = t.updated_at;
  });
  const subjectColors = ["bg-primary", "bg-tertiary", "bg-secondary", "bg-primary"];
  const materias = Object.entries(subjectMap).map(([name, data], i) => ({
    name,
    time: formatRelativeDate(data.lastAccess),
    xp: data.xp,
    color: subjectColors[i % subjectColors.length],
  }));

  // ── Achievements ──
  const unlockedIds = new Set((unlockedAchievements || []).map((ua: any) => ua.achievement_id));
  const recentUnlocked = (unlockedAchievements || [])
    .sort((a: any, b: any) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
    .slice(0, 3);
  const recentAchievements = recentUnlocked.map((ua: any) => {
    const ach = (allAchievements || []).find((a: any) => a.id === ua.achievement_id);
    return { ...ach, unlocked_at: ua.unlocked_at };
  }).filter(Boolean);

  // ── Badge chips (unlocked achievements) ──
  const badges = (allAchievements || []).map((a: any) => ({
    name: a.nombre || a.name || "Logro",
    icon: a.icono || "🏆",
    unlocked: unlockedIds.has(a.id),
    xp: a.xp_reward,
  }));

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] overflow-x-hidden pb-8 bg-surface -m-8">

      {/* ── HEADER ── */}
      <div className="w-full bg-gradient-to-b from-[#CBB4ED]/20 to-[#A8D1F6]/20 pt-8 pb-6 flex flex-col items-center">
        <div className="w-[80px] h-[80px] rounded-full border-[3px] border-white shadow-sm overflow-hidden mb-3">
          <img
            src={profile?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile?.nombre || "User"}&backgroundColor=transparent`}
            alt="Avatar"
            className="w-full h-full object-cover bg-white"
          />
        </div>

        <h1 className="text-[22px] font-bold text-neutral font-inter text-center leading-tight">
          {profile?.nombre || "Usuario"}
        </h1>

        <p className="text-[14px] text-primary font-bold font-inter mt-1 mb-3 text-center">
          {levelInfo.icon} {levelInfo.name}
        </p>

        <div className="flex items-center gap-1.5 mb-5 text-center">
          <Flame size={20} className="text-tertiary fill-tertiary" />
          <span className="text-[20px] font-bold text-neutral font-inter">{streak}</span>
          <span className="text-[12px] text-neutral/60 font-inter">días seguidos</span>
        </div>

        <div className="w-full px-4 max-w-sm mb-5">
          <div className="h-[8px] w-full bg-white rounded-full overflow-hidden shadow-inner border border-outline-variant/10">
            <div
              className="h-full bg-tertiary rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[12px] text-neutral/60 text-center font-inter mt-1.5">
            {currentXP.toLocaleString()} / {isMaxLevel ? "Máx" : nextLevelXP.toLocaleString()} XP
            {!isMaxLevel && ` para ${nextLevel.name}`}
          </p>
        </div>

        {!isPublic && (
          <button
            onClick={handleShare}
            className="h-[44px] px-6 rounded-[12px] border-2 border-primary text-primary-dark font-bold flex items-center justify-center gap-2 touch-target bg-transparent"
          >
            <Link2 size={18} />
            Compartir perfil
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 space-y-8 mt-6">

        {/* ── BADGES ROW ── */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[18px] font-bold text-neutral font-inter">Insignias</h2>
          </div>
          <div className="flex overflow-x-auto gap-3 hide-scrollbar pb-2 px-1">
            {badges.length > 0 ? badges.map((badge, i) => (
              <div
                key={i}
                className={`h-[36px] px-4 rounded-[8px] font-bold text-sm flex items-center gap-1.5 shrink-0 shadow-sm border ${
                  badge.unlocked
                    ? "bg-tertiary text-neutral border-tertiary-dark/20"
                    : "bg-neutral/10 text-neutral/40 border-transparent"
                }`}
              >
                <span>{badge.unlocked ? badge.icon : "🔒"}</span> {badge.name}
              </div>
            )) : (
              <p className="text-sm text-neutral/50 italic">Completa retos para desbloquear insignias.</p>
            )}
          </div>
        </div>

        {/* ── SUBJECTS GRID ── */}
        {materias.length > 0 && (
          <div>
            <h2 className="text-[18px] font-bold text-neutral font-inter mb-4 px-1">Materias activas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materias.map((materia, i) => (
                <div
                  key={i}
                  className="bg-white rounded-[16px] shadow-sm p-4 relative overflow-hidden flex flex-col justify-between border border-outline-variant/10 min-h-[140px]"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-[4px] ${materia.color}`} />
                  <div className="pl-2">
                    <h3 className="text-[16px] font-bold text-neutral font-inter mb-0.5">{materia.name}</h3>
                    <p className="text-[12px] text-neutral/60 font-inter mb-3">Último acceso: {materia.time}</p>

                    {/* Mini activity graph 7×4 */}
                    <div className="flex gap-[4px] mb-3">
                      {[...Array(7)].map((_, colIndex) => (
                        <div key={colIndex} className="flex flex-col gap-[4px]">
                          {[...Array(4)].map((_, rowIndex) => {
                            // Deterministic: seed from subject + position
                            const seed = (materia.name.charCodeAt(0) + colIndex * 4 + rowIndex) % 3;
                            const intensity = seed === 0 ? materia.color : seed === 1 ? `${materia.color}/40` : "bg-surface";
                            return (
                              <div
                                key={rowIndex}
                                className={`w-[6px] h-[6px] rounded-[1px] ${intensity} ${seed === 2 ? "border border-primary/20" : ""}`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    <div className="inline-flex bg-tertiary/15 text-tertiary-dark text-[10px] font-bold px-2 py-1 rounded-[4px] border border-tertiary/20">
                      +{materia.xp} XP esta semana
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STATS CARD ── */}
        <div className="bg-white rounded-[16px] shadow-sm flex items-center justify-between p-6 border border-outline-variant/10">
          <div className="flex-1 text-center">
            <p className="text-[24px] font-bold text-primary font-inter leading-none mb-1">
              {stats?.tareas_completadas || 0}
            </p>
            <p className="text-[12px] text-neutral/60 font-inter leading-tight">Tareas completadas</p>
          </div>
          <div className="w-[1px] h-12 bg-neutral/10" />
          <div className="flex-1 text-center">
            <p className="text-[24px] font-bold text-primary font-inter leading-none mb-1">
              {stats?.racha_maxima || 0}
            </p>
            <p className="text-[12px] text-neutral/60 font-inter leading-tight">Racha récord</p>
          </div>
          <div className="w-[1px] h-12 bg-neutral/10" />
          <div className="flex-1 text-center">
            <p className="text-[24px] font-bold text-primary font-inter leading-none mb-1">
              {unlockedAchievements?.length || 0}
            </p>
            <p className="text-[12px] text-neutral/60 font-inter leading-tight">Logros</p>
          </div>
        </div>

        {/* ── LOGROS RECIENTES ── */}
        <div>
          <h2 className="text-[18px] font-bold text-neutral font-inter mb-4 px-1">Logros recientes</h2>
          {recentAchievements.length > 0 ? (
            <div className="space-y-3 mb-4">
              {recentAchievements.map((ach: any, i: number) => (
                <div key={i} className="bg-white rounded-[16px] shadow-sm p-4 flex items-center justify-between border border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <div className="w-[40px] h-[40px] rounded-full bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0 text-lg">
                      {ach.icono || "🏆"}
                    </div>
                    <div>
                      <h4 className="text-[16px] font-bold text-neutral font-inter">{ach.nombre || "Logro"}</h4>
                      <p className="text-[12px] text-neutral/60 font-inter">{ach.descripcion || ""}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-neutral/40 font-bold">{formatRelativeDate(ach.unlocked_at)}</span>
                    <span className="bg-tertiary/15 text-tertiary-dark text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] border border-tertiary/20">
                      +{ach.xp_reward || 0} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral/50 italic px-1">Aún no has desbloqueado logros.</p>
          )}
        </div>

        {/* ── SETTINGS ROWS ── */}
        {!isPublic && (
          <div className="mt-12">
            <div className="bg-white rounded-[16px] border border-outline-variant/10 overflow-hidden shadow-sm">
              <button className="w-full flex items-center justify-between p-4 min-h-[44px] border-b border-neutral/10 hover:bg-surface touch-target text-left">
                <div className="flex items-center gap-3">
                  <Edit2 size={18} className="text-primary" />
                  <span className="text-sm font-bold text-neutral">Editar perfil</span>
                </div>
                <ChevronRight size={18} className="text-neutral/40" />
              </button>

              <button className="w-full flex items-center justify-between p-4 min-h-[44px] border-b border-neutral/10 hover:bg-surface touch-target text-left">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-primary" />
                  <span className="text-sm font-bold text-neutral">Notificaciones</span>
                </div>
                <ChevronRight size={18} className="text-neutral/40" />
              </button>

              <button className="w-full flex items-center justify-between p-4 min-h-[44px] border-b border-neutral/10 hover:bg-surface touch-target text-left">
                <div className="flex items-center gap-3">
                  <Lock size={18} className="text-primary" />
                  <span className="text-sm font-bold text-neutral">Privacidad</span>
                </div>
                <ChevronRight size={18} className="text-neutral/40" />
              </button>

              <button className="w-full flex items-center justify-between p-4 min-h-[44px] hover:bg-error/5 touch-target text-left">
                <div className="flex items-center gap-3">
                  <LogOut size={18} className="text-neutral/60" />
                  <span className="text-sm font-bold text-neutral/60">Cerrar sesión</span>
                </div>
              </button>
            </div>

            <p className="text-center text-[12px] text-neutral/30 font-inter mt-6 mb-8">
              Versión 1.0.0
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helper ──
function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `hace ${diffMins} min`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `hace ${diffHrs} horas`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays} días`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semanas`;
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}
