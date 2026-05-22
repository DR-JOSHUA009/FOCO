"use client";

import { useState, useRef } from "react";
import { Link2, Trophy, Medal, Lock, ChevronRight, Edit2, Bell, LogOut, Flame, Camera, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { updateProfile, uploadAvatar, signOutAction } from "@/app/actions/profile";
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
  isPublic = false,
}: ProfileClientProps) {
  // Modal state
  const [modal, setModal] = useState<"edit" | "notifications" | "privacy" | "logout" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Edit state
  const [editName, setEditName] = useState(profile?.nombre || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prefs state (optimistic)
  const [prefs, setPrefs] = useState({
    notif_tareas: true,
    notif_logros: true,
    notif_amigos: true,
    public_profile: profile?.is_public ?? false,
    show_streak: profile?.show_streak ?? true,
  });

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
        <div className="w-[80px] h-[80px] rounded-full border-[3px] border-white shadow-sm overflow-hidden mb-3 relative group">
          <img
            src={avatarPreview || profile?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile?.nombre || "User"}&backgroundColor=transparent`}
            alt="Avatar"
            className="w-full h-full object-cover bg-white"
          />
        </div>

        <h1 className="text-[22px] font-bold text-neutral font-inter text-center leading-tight">
          {editName || profile?.nombre || "Usuario"}
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
              <button onClick={() => setModal("edit")} className="w-full flex items-center justify-between p-4 min-h-[44px] border-b border-neutral/10 hover:bg-surface touch-target text-left">
                <div className="flex items-center gap-3">
                  <Edit2 size={18} className="text-primary" />
                  <span className="text-sm font-bold text-neutral">Editar perfil</span>
                </div>
                <ChevronRight size={18} className="text-neutral/40" />
              </button>

              <button onClick={() => setModal("notifications")} className="w-full flex items-center justify-between p-4 min-h-[44px] border-b border-neutral/10 hover:bg-surface touch-target text-left">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-primary" />
                  <span className="text-sm font-bold text-neutral">Notificaciones</span>
                </div>
                <ChevronRight size={18} className="text-neutral/40" />
              </button>

              <button onClick={() => setModal("privacy")} className="w-full flex items-center justify-between p-4 min-h-[44px] border-b border-neutral/10 hover:bg-surface touch-target text-left">
                <div className="flex items-center gap-3">
                  <Lock size={18} className="text-primary" />
                  <span className="text-sm font-bold text-neutral">Privacidad</span>
                </div>
                <ChevronRight size={18} className="text-neutral/40" />
              </button>

              <button onClick={() => setModal("logout")} className="w-full flex items-center justify-between p-4 min-h-[44px] hover:bg-error/5 touch-target text-left">
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
      {/* ── MODALS ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral/40 backdrop-blur-sm animate-fade-in px-4">
          <div className="bg-white w-full max-w-xl rounded-t-[24px] p-6 pb-safe shadow-2xl relative animate-slide-up">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 p-2 touch-target text-neutral/60 hover:text-neutral">
              <X size={20} />
            </button>

            {modal === "edit" && (
              <>
                <h3 className="text-[18px] font-bold text-neutral mb-6">Editar perfil</h3>
                <div className="flex flex-col items-center mb-6">
                  <div 
                    className="w-[100px] h-[100px] rounded-full border-[3px] border-surface shadow-sm overflow-hidden mb-3 relative cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <img src={avatarPreview || profile?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile?.nombre}&backgroundColor=transparent`} className="w-full h-full object-cover bg-white" />
                    <div className="absolute inset-0 bg-neutral/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadProgress ? <Loader2 size={24} className="text-white animate-spin" /> : <Camera size={24} className="text-white" />}
                    </div>
                  </div>
                  <p className="text-[12px] text-neutral/60">Toca para cambiar</p>
                  <input 
                    type="file" ref={fileInputRef} className="hidden" accept="image/jpeg, image/png, image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setAvatarPreview(URL.createObjectURL(file));
                      setUploadProgress(true);
                      const formData = new FormData();
                      formData.append("file", file);
                      const res = await uploadAvatar(formData);
                      setUploadProgress(false);
                      if (res.error) toast.error(res.error);
                      else toast.success("Foto actualizada");
                    }}
                  />
                </div>
                
                <div className="mb-8">
                  <label className="text-[14px] font-bold text-neutral mb-2 block">Nombre de usuario</label>
                  <input 
                    type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full h-[44px] rounded-[12px] border border-outline-variant/40 px-4 bg-surface focus:border-primary outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setModal(null)} className="flex-1 h-[44px] font-bold rounded-[12px] text-neutral touch-target">Cancelar</button>
                  <button 
                    onClick={async () => {
                      setIsLoading(true);
                      await updateProfile({ nombre: editName });
                      setIsLoading(false);
                      toast.success("Perfil actualizado");
                      setModal(null);
                    }}
                    disabled={isLoading}
                    className="flex-1 h-[44px] font-bold rounded-[12px] bg-primary text-neutral shadow-sm touch-target flex justify-center items-center gap-2"
                  >
                    {isLoading && <Loader2 size={16} className="animate-spin" />} Guardar
                  </button>
                </div>
              </>
            )}

            {modal === "notifications" && (
              <>
                <h3 className="text-[18px] font-bold text-neutral mb-6">Notificaciones</h3>
                <div className="space-y-6 mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-neutral text-sm">Recordatorios de tareas</h4>
                      <p className="text-[12px] text-neutral/60">Avisos antes de la fecha de entrega</p>
                    </div>
                    <Switch checked={prefs.notif_tareas} onChange={() => setPrefs(p => ({...p, notif_tareas: !p.notif_tareas}))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-neutral text-sm">Logros desbloqueados</h4>
                      <p className="text-[12px] text-neutral/60">Notificar al ganar una insignia</p>
                    </div>
                    <Switch checked={prefs.notif_logros} onChange={() => setPrefs(p => ({...p, notif_logros: !p.notif_logros}))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-neutral text-sm">Solicitudes de amistad</h4>
                      <p className="text-[12px] text-neutral/60">Avisos de invitaciones</p>
                    </div>
                    <Switch checked={prefs.notif_amigos} onChange={() => setPrefs(p => ({...p, notif_amigos: !p.notif_amigos}))} />
                  </div>
                </div>
                <button onClick={() => setModal(null)} className="w-full h-[44px] font-bold rounded-[12px] bg-primary text-neutral touch-target">Listo</button>
              </>
            )}

            {modal === "privacy" && (
              <>
                <h3 className="text-[18px] font-bold text-neutral mb-6">Privacidad</h3>
                <div className="space-y-6 mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-neutral text-sm">Perfil público</h4>
                      <p className="text-[12px] text-neutral/60">Permite ver tu perfil con enlace</p>
                    </div>
                    <Switch checked={prefs.public_profile} onChange={() => setPrefs(p => ({...p, public_profile: !p.public_profile}))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-neutral text-sm">Mostrar racha</h4>
                      <p className="text-[12px] text-neutral/60">Otros pueden ver tus días seguidos</p>
                    </div>
                    <Switch checked={prefs.show_streak} onChange={() => setPrefs(p => ({...p, show_streak: !p.show_streak}))} />
                  </div>
                </div>
                <button onClick={() => setModal(null)} className="w-full h-[44px] font-bold rounded-[12px] bg-primary text-neutral touch-target">Listo</button>
              </>
            )}

            {modal === "logout" && (
              <>
                <h3 className="text-[18px] font-bold text-neutral mb-2">¿Cerrar sesión?</h3>
                <p className="text-sm text-neutral/60 mb-6">Tendrás que volver a iniciar sesión para entrar a FOCOI.</p>
                <div className="flex gap-3">
                  <button onClick={() => setModal(null)} className="flex-1 h-[44px] font-bold rounded-[12px] bg-surface-container text-neutral touch-target">Cancelar</button>
                  <button 
                    onClick={async () => {
                      setIsLoading(true);
                      await signOutAction();
                      window.location.href = "/auth";
                    }}
                    disabled={isLoading}
                    className="flex-1 h-[44px] font-bold rounded-[12px] bg-error text-white shadow-sm touch-target flex items-center justify-center gap-2"
                  >
                    {isLoading && <Loader2 size={16} className="animate-spin" />} Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// Simple Switch Component
function Switch({ checked, onChange }: { checked: boolean, onChange: () => void }) {
  return (
    <div 
      className={`w-11 h-6 rounded-full flex items-center px-1 cursor-pointer transition-colors ${checked ? 'bg-primary' : 'bg-outline-variant/30'}`}
      onClick={onChange}
    >
      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
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
