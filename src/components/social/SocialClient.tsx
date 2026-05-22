"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Users, UserPlus, Flame, Medal, Plus, ArrowRight, MousePointer2, 
  Trophy, Crown, Target, Search, Clock, LogOut, Check, Copy, MoreVertical, ShieldAlert
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import toast from "react-hot-toast";

// ============================================
// FIX 4 & 5: Social Hub Full Rebuild
// ============================================

export default function SocialClient({ currentUserId }: { currentUserId: string }) {
  const [activeTab, setActiveTab] = useState<"sala" | "amigos">("sala");
  
  // Sala State
  const [inRoom, setInRoom] = useState<string | null>(null);
  
  // Amigos State
  const [amigosSubTab, setAmigosSubTab] = useState<"amigos" | "grupos" | "competencias">("amigos");

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden -m-8 relative bg-background">
      
      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* Comunidad Header & Segmented Control */}
        {!inRoom && (
          <div className="p-4 md:px-8 md:pt-8 pb-2 max-w-4xl mx-auto w-full shrink-0">
            <h1 className="text-[22px] font-bold text-neutral font-inter mb-4">Comunidad</h1>
            <div className="flex p-1 bg-surface-container rounded-ac-btn shadow-inner">
              <button 
                onClick={() => setActiveTab("sala")} 
                className={`flex-1 py-2.5 rounded-ac-chip text-sm font-bold transition-all touch-target ${activeTab === 'sala' ? 'bg-primary text-neutral shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Sala de Estudio
              </button>
              <button 
                onClick={() => setActiveTab("amigos")} 
                className={`flex-1 py-2.5 rounded-ac-chip text-sm font-bold transition-all touch-target ${activeTab === 'amigos' ? 'bg-primary text-neutral shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Amigos
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-32 transition-screen">
          {activeTab === "sala" && (
            inRoom ? <InRoomView roomId={inRoom} onLeave={() => setInRoom(null)} /> : <SalaLobby onJoinRoom={(id) => setInRoom(id)} />
          )}

          {activeTab === "amigos" && (
            <div className="p-4 md:p-8 max-w-4xl mx-auto w-full pt-2">
              {/* Sub-Segmented Control */}
              <div className="mb-6">
                <div className="flex p-1 bg-surface-container rounded-ac-btn shadow-inner">
                  <button onClick={() => setAmigosSubTab("amigos")} className={`flex-1 py-2 rounded-ac-chip text-sm font-bold transition-all touch-target ${amigosSubTab === 'amigos' ? 'bg-primary/20 text-primary-dark shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Lista</button>
                  <button onClick={() => setAmigosSubTab("grupos")} className={`flex-1 py-2 rounded-ac-chip text-sm font-bold transition-all touch-target ${amigosSubTab === 'grupos' ? 'bg-primary/20 text-primary-dark shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Grupos</button>
                  <button onClick={() => setAmigosSubTab("competencias")} className={`flex-1 py-2 rounded-ac-chip text-sm font-bold transition-all touch-target ${amigosSubTab === 'competencias' ? 'bg-primary/20 text-primary-dark shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Competencias</button>
                </div>
              </div>

              {amigosSubTab === "amigos" && <AmigosList />}
              {amigosSubTab === "grupos" && <GruposList />}
              {amigosSubTab === "competencias" && <CompetenciasList />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// FIX 4: SALA DE ESTUDIO
// ============================================

function SalaLobby({ onJoinRoom }: { onJoinRoom: (id: string) => void }) {
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  
  // Mock active rooms
  const activeRooms = [
    { id: "uuid-1", name: "Repaso Matemáticas", host: "Lucía M.", participants: 3, duration: "45m" },
  ];

  const handleCreateRoom = () => {
    // Requirements: UUID room code
    const newRoomId = crypto.randomUUID();
    onJoinRoom(newRoomId);
    setShowCreateSheet(false);
  };

  return (
    <div className="p-4 md:p-8 overflow-y-auto pb-32">
      <div className="max-w-xl mx-auto w-full pt-4">
        
        {/* CTAs */}
        <div className="px-4 space-y-3 mb-10">
          <button 
            onClick={() => setShowCreateSheet(true)}
            className="w-full btn-primary h-14 text-base shadow-card flex items-center justify-center gap-2"
          >
            <Plus size={20} /> Crear sala
          </button>
          <button className="w-full btn-outlined h-14 text-base flex items-center justify-center gap-2">
            <Search size={20} /> Unirse con código
          </button>
        </div>

        {/* Salas activas */}
        <div>
          <h3 className="font-bold text-neutral text-base mb-4 px-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            Salas activas de amigos
          </h3>
          
          {activeRooms.length > 0 ? (
            <div className="space-y-3 px-4">
              {activeRooms.map(room => (
                <div key={room.id} className="card-ac !p-4 flex items-center justify-between border border-outline-variant/30 hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-surface-container-highest border-2 border-surface flex items-center justify-center relative">
                      <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${room.host}&backgroundColor=transparent`} alt={room.host} className="w-full h-full rounded-full" />
                      <div className="absolute -bottom-1 -right-1 bg-surface-container text-[10px] font-bold px-1.5 rounded-full border border-outline-variant">
                        +{room.participants - 1}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral text-sm">{room.name}</h4>
                      <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                        <Clock size={12} /> {room.duration} • de {room.host}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => onJoinRoom(room.id)} className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 touch-target">
                    <ArrowRight size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 px-4">
              <div className="w-24 h-24 bg-surface-container-highest rounded-full mx-auto mb-4 flex items-center justify-center text-outline-variant">
                <Users size={40} />
              </div>
              <p className="text-sm text-on-surface-variant max-w-xs mx-auto mb-4">
                Ningún amigo está estudiando ahora. Crea una sala y comparte el código.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Room Bottom Sheet */}
      {showCreateSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-t-3xl p-6 pb-safe animate-slide-up shadow-2xl">
            <h2 className="text-lg font-bold text-neutral mb-6">Crear nueva sala</h2>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Nombre de la sala (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej. Sesión de Química" 
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-outline-variant/40 bg-surface focus:border-primary outline-none"
                />
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
                <div>
                  <h4 className="font-bold text-sm text-neutral">Sala Privada</h4>
                  <p className="text-xs text-on-surface-variant">Solo con código o invitación</p>
                </div>
                <button 
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${isPrivate ? 'bg-primary' : 'bg-outline-variant'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                </button>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setShowCreateSheet(false)} className="flex-1 h-12 rounded-xl font-bold text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors">Cancelar</button>
              <button onClick={handleCreateRoom} className="flex-[2] h-12 rounded-xl font-bold text-white bg-primary hover:opacity-90 transition-opacity shadow-card">Iniciar Sala</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InRoomView({ roomId, onLeave }: { roomId: string, onLeave: () => void }) {
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const { submitXPMutation } = useAppStore();

  // Timer & Realtime XP calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds(s => {
        const newSecs = s + 1;
        // 2 XP per minute (as per xp-config)
        setXpEarned(Math.floor(newSecs / 60) * 2);
        return newSecs;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleConfirmLeave = async () => {
    if (sessionSeconds >= 300) { // 5 minutes minimum
      await submitXPMutation("room_session", roomId, xpEarned, { minutes: sessionSeconds / 60 });
      toast.success(`+${xpEarned} XP guardados de esta sesión`);
    } else {
      toast("Sesión terminada (Mín. 5 min para ganar XP)", { icon: "ℹ️" });
    }
    onLeave();
  };

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest animate-fade-in relative z-50">
      
      {/* Top Bar */}
      <div className="h-14 border-b border-outline-variant/30 flex items-center justify-between px-4 bg-background z-20">
        <div className="flex-1 truncate font-bold text-neutral text-sm">
          Mesa de Estudio
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-surface-container px-3 py-1 rounded-full font-mono font-bold text-sm text-neutral tracking-wider">
            {formatTime(sessionSeconds)}
          </div>
        </div>
        <div className="flex-1 flex justify-end">
          <button 
            onClick={() => setShowConfirmLeave(true)}
            className="text-error font-bold text-sm border border-error/30 bg-error/5 px-3 py-1.5 rounded-ac-chip hover:bg-error/10 touch-target"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Real-time XP Banner */}
      <div className="h-6 bg-tertiary text-tertiary-dark flex items-center justify-center text-[10px] font-bold uppercase tracking-widest z-10">
        +{xpEarned} XP ESTA SESIÓN
      </div>

      {/* Participants Row */}
      <div className="h-16 border-b border-outline-variant/20 flex items-center gap-3 px-4 overflow-x-auto bg-surface z-10 hide-scrollbar">
        {[1,2,3].map(i => (
          <div key={i} className={`w-10 h-10 rounded-full border-2 shrink-0 relative ${i===1?'border-primary':i===2?'border-tertiary':'border-outline-variant'}`}>
            <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=P${i}&backgroundColor=transparent`} className="w-full h-full rounded-full" />
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface ${i===1?'bg-primary':i===2?'bg-tertiary':'bg-outline-variant'}`}></div>
          </div>
        ))}
        <button className="w-10 h-10 rounded-full border-2 border-dashed border-outline-variant flex items-center justify-center text-outline-variant shrink-0 hover:border-primary touch-target">
          <Plus size={16} />
        </button>
      </div>

      {/* Shared Canvas Area */}
      <div className="flex-1 relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] overflow-hidden cursor-crosshair">
        
        {/* Placeholder Realtime Notification */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface-container-lowest/80 backdrop-blur border border-outline-variant/30 text-xs text-on-surface-variant px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          Conectado en tiempo real (Supabase WebSocket)
        </div>

        {/* Mock Cursors */}
        <div className="absolute top-[40%] left-[30%] flex flex-col items-center animate-bounce" style={{ animationDuration: '3s' }}>
          <MousePointer2 className="text-secondary-dark fill-secondary-dark rotate-[-20deg]" size={20} />
          <span className="bg-secondary-dark text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm mt-1">AnaM</span>
        </div>
        
        {/* Room Code Badge */}
        <div className="absolute bottom-4 left-4 bg-surface-container-highest px-3 py-1.5 rounded-ac-chip flex items-center gap-2 text-xs font-bold text-neutral shadow-sm border border-outline-variant/20">
          ID: {roomId.substring(0, 8)} 
          <button onClick={() => { navigator.clipboard.writeText(roomId); toast.success("Código copiado"); }} className="text-primary hover:text-primary-dark touch-target p-1">
            <Copy size={12} />
          </button>
        </div>

        {/* Lumos FAB (Room Context) */}
        <button className="absolute bottom-4 right-4 w-14 h-14 rounded-full bg-neutral text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
          <span className="font-serif italic font-bold text-xl">L</span>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background animate-pulse"></div>
        </button>
      </div>

      {/* Exit Confirmation Dialog */}
      {showConfirmLeave && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-neutral mb-2">¿Salir de la sala?</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              {sessionSeconds < 300 
                ? "Perderás el XP de esta sesión porque llevas menos de 5 minutos." 
                : `Se guardarán los ${xpEarned} XP ganados en esta sesión.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmLeave(false)} className="flex-1 h-11 font-bold rounded-xl bg-surface-container text-on-surface-variant">Cancelar</button>
              <button onClick={handleConfirmLeave} className="flex-1 h-11 font-bold rounded-xl bg-error text-white shadow-sm">Salir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// FIX 5: AMIGOS Y COMPETENCIAS
// ============================================

function AmigosList() {
  const [search, setSearch] = useState("");
  
  const friends = [
    { name: "Lucía M.", username: "@luciam", streak: 12, level: "Plata", seed: 40, badge: "Rey de Mayo" },
    { name: "Andrés K.", username: "@andresk", streak: 4, level: "Bronce", seed: 41 },
    { name: "Sofía R.", username: "@sofiar", streak: 28, level: "Oro", seed: 42, badge: "Más constante" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search Bar - Username only */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" size={18} />
        <input 
          type="text" 
          placeholder="Buscar por nombre de usuario (@username)..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-12 pl-11 pr-4 rounded-xl border border-outline-variant/30 bg-surface focus:border-primary outline-none text-sm"
        />
      </div>

      {/* Pending Requests */}
      <div className="bg-secondary/10 border border-secondary/20 rounded-ac-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-dark font-bold"><UserPlus size={18}/></div>
          <div>
            <p className="text-sm font-bold text-neutral">@carlosp quiere ser tu amigo</p>
            <p className="text-xs text-on-surface-variant">Hace 2 horas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="text-xs font-bold text-on-surface-variant hover:text-neutral bg-surface-container px-3 py-1.5 rounded touch-target">Rechazar</button>
          <button className="text-xs font-bold text-white bg-primary hover:bg-primary-dark px-3 py-1.5 rounded touch-target shadow-sm">Aceptar</button>
        </div>
      </div>

      {/* Friends List */}
      <div className="space-y-3">
        {friends.map((friend, i) => (
          <div key={i} className="card-ac !p-4 flex items-center justify-between hover:border-primary/30 border border-outline-variant/20 transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-surface-container-highest bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${friend.seed}&backgroundColor=transparent`} alt={friend.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-neutral text-sm flex items-center gap-2">
                  {friend.name}
                  {friend.badge && (
                    <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm ${friend.badge.includes('Rey') ? 'bg-tertiary/20 text-tertiary-dark' : 'bg-primary/20 text-primary-dark'}`}>
                      {friend.badge}
                    </span>
                  )}
                </h4>
                <p className="text-xs text-on-surface-variant">{friend.username}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-sm">
                    <Crown size={12} className={friend.level === 'Oro' ? 'text-tertiary' : friend.level === 'Plata' ? 'text-outline' : 'text-outline-variant'} />
                    {friend.level}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-tertiary-dark bg-tertiary/10 px-1.5 py-0.5 rounded-sm">
                    <Flame size={12} className="fill-tertiary" /> {friend.streak}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-ac-chip hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity">Ver perfil</button>
              <button className="p-2 text-outline-variant hover:bg-surface-container rounded-ac-btn touch-target">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GruposList() {
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowCreateGroup(true)} className="btn-primary !py-2 !px-4 text-sm flex items-center gap-2 shadow-sm">
          <Plus size={16} /> Crear grupo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Group Card 1 */}
        <div className="card-ac border border-outline-variant/30 hover:border-primary/40 transition-colors cursor-pointer group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-bold text-neutral text-base group-hover:text-primary transition-colors">Escuadrón Ingeniería</h4>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">8 miembros</p>
            </div>
          </div>
          
          <div className="flex -space-x-2 mb-5">
            {[1,2,3,4].map(i => (
              <img key={i} src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i+20}&backgroundColor=transparent`} className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-highest" />
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container flex items-center justify-center text-[10px] font-bold text-on-surface-variant">+4</div>
          </div>

          <div className="border-t border-outline-variant/20 pt-3">
            <p className="text-xs font-bold text-neutral mb-2 flex items-center gap-1"><Trophy size={12} className="text-tertiary" /> Top 3 del Mes (Preview server-side)</p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-tertiary-dark flex items-center gap-1">1. @luciam</span>
                <span className="text-on-surface-variant">4,200 XP</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-outline flex items-center gap-1">2. Tú</span>
                <span className="text-on-surface-variant">3,850 XP</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-outline-variant flex items-center gap-1">3. @andresk</span>
                <span className="text-on-surface-variant">2,100 XP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCreateGroup && (
        <div className="absolute inset-0 z-10 bg-surface-container-lowest/90 backdrop-blur-sm flex items-center justify-center border border-outline-variant/30 rounded-ac-card p-6 text-center">
          <div>
            <h3 className="font-bold text-neutral text-lg mb-2">[NEEDS BACKEND]</h3>
            <p className="text-sm text-on-surface-variant max-w-xs mx-auto">Creación de grupos requiere tabla `study_groups` y `group_members` en Supabase.</p>
            <button onClick={() => setShowCreateGroup(false)} className="mt-4 btn-outlined !py-1.5">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CompetenciasList() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-tertiary/10 border border-tertiary/20 rounded-ac-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-tertiary-dark text-lg flex items-center gap-2">
              <Trophy size={20} className="fill-tertiary text-tertiary" /> 
              Torneo Mayo 2025
            </h3>
            <p className="text-sm text-tertiary-dark/70 font-medium mt-1">Escuadrón Ingeniería</p>
          </div>
          <div className="bg-surface-container-lowest px-3 py-1.5 rounded-ac-chip border border-outline-variant/20">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Tu Posición</p>
            <p className="text-lg font-black text-neutral text-center">#2</p>
          </div>
        </div>

        <div className="space-y-3 bg-surface-container-lowest/50 p-4 rounded-xl border border-outline-variant/10">
          <div className="flex justify-between text-sm">
            <span className="font-bold text-neutral">1. @luciam</span>
            <span className="font-bold text-tertiary-dark">4,200 XP</span>
          </div>
          <div className="flex justify-between text-sm relative">
            <span className="font-bold text-primary">2. Tú</span>
            <span className="font-bold text-primary">3,850 XP</span>
          </div>
          {/* Gap indicator */}
          <div className="flex justify-end">
            <span className="text-[10px] font-bold bg-error/10 text-error px-2 py-0.5 rounded-sm">350 XP para alcanzar el #1</span>
          </div>
        </div>
      </div>

      <div className="card-ac border-dashed border-2 border-outline-variant/50 p-6 text-center">
        <ShieldAlert className="mx-auto text-outline-variant mb-3" size={32} />
        <h4 className="font-bold text-neutral text-sm mb-1">[NEEDS BACKEND] Server-side validation</h4>
        <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
          Los leaderboards y la asignación de medallas mensuales deben ejecutarse en un Cron Job del servidor para prevenir manipulación del cliente.
        </p>
      </div>
    </div>
  );
}
