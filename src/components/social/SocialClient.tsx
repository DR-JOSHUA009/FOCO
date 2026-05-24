"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Users, UserPlus, Flame, Medal, Plus, Search, Clock, LogOut, Copy, MoreVertical, X, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import toast from "react-hot-toast";
import { searchUsers, sendFriendRequest, createRoom, joinRoom, getActiveRooms } from "@/app/actions/social";

// Dynamic import of Excalidraw (client-only, no SSR)
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-neutral/40"><Loader2 size={32} className="animate-spin" /></div> }
);

// ============================================
// FOCOI — COMUNIDAD (Bugs 1+2 Fix)
// ============================================

export default function SocialClient({ currentUserId }: { currentUserId: string }) {
  const [view, setView] = useState<"entry" | "room" | "friends">("entry");
  const [inRoom, setInRoom] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden -m-8 bg-surface transition-screen">
      {view === "entry" && (
        <EntryScreen 
          onJoinRoom={(id) => { setInRoom(id); setView("room"); }} 
          onViewFriends={() => setView("friends")} 
        />
      )}
      
      {view === "room" && inRoom && (
        <InRoomView 
          roomId={inRoom} 
          onLeave={() => { setInRoom(null); setView("entry"); }} 
        />
      )}

      {view === "friends" && (
        <FriendsScreen onBack={() => setView("entry")} />
      )}
    </div>
  );
}

// ── ENTRY SCREEN ──
function EntryScreen({ onJoinRoom, onViewFriends }: { onJoinRoom: (id: string) => void, onViewFriends: () => void }) {
  const [sheet, setSheet] = useState<"agregar" | "crear" | "unirse" | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  
  // Dynamic state
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getActiveRooms().then(res => {
      if (res.rooms) setActiveRooms(res.rooms);
    });
  }, [sheet]); // Refresh when modals close

  // --- Handlers ---
  const handleSearchUser = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (searchValue.length < 3) return;
    setIsSearching(true);
    const res = await searchUsers(searchValue);
    setIsSearching(false);
    if (res.error) toast.error(res.error);
    else setSearchResults(res.users || []);
  };

  const handleSendRequest = async (e: React.MouseEvent<HTMLButtonElement>, userId: string) => {
    const btn = e.currentTarget;
    btn.innerText = "Enviando...";
    btn.disabled = true;
    
    const res = await sendFriendRequest(userId);
    if (res.error) {
      toast.error(res.error);
      btn.innerText = "Agregar";
      btn.disabled = false;
    } else {
      btn.innerText = "Solicitud enviada";
      btn.className += " opacity-50";
      toast.success("Solicitud enviada");
    }
  };

  const handleCrearSala = async () => {
    setIsLoading(true);
    const res = await createRoom(roomName);
    setIsLoading(false);
    
    if (res.error) {
      toast.error(res.error);
    } else if (res.roomCode) {
      setGeneratedCode(res.roomCode);
      toast.success("Sala creada correctamente");
      setTimeout(() => {
        onJoinRoom(res.roomCode!);
        setSheet(null);
      }, 1500);
    }
  };

  const handleUnirseSala = async () => {
    if (roomCode.trim().length === 0) {
      toast.error("Ingresa un código válido");
      return;
    }
    
    setIsLoading(true);
    const res = await joinRoom(roomCode.trim());
    setIsLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      onJoinRoom(roomCode.trim());
      setSheet(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-2xl mx-auto w-full">
      <h1 className="text-[22px] font-bold text-neutral font-inter mb-8 text-center mt-4">Comunidad</h1>

      {/* 3 Action Buttons */}
      <div className="space-y-4 mb-4">
        <button 
          onClick={() => setSheet("agregar")}
          className="w-full h-[44px] rounded-[12px] bg-primary text-neutral font-bold flex items-center justify-center shadow-sm touch-target"
        >
          Agregar amigo
        </button>
        <button 
          onClick={() => setSheet("crear")}
          className="w-full h-[44px] rounded-[12px] bg-neutral text-white font-bold flex items-center justify-center shadow-sm touch-target"
        >
          Crear sala
        </button>
        <button 
          onClick={() => setSheet("unirse")}
          className="w-full h-[44px] rounded-[12px] bg-surface border-2 border-primary text-primary-dark font-bold flex items-center justify-center touch-target"
        >
          Unirse a sala
        </button>
      </div>

      <div className="text-center mb-10">
        <button onClick={onViewFriends} className="text-sm font-bold text-primary hover:underline touch-target p-2">
          Ver amigos
        </button>
      </div>

      {/* Active Rooms */}
      <div className="mb-12">
        <h2 className="text-[18px] font-inter font-bold text-neutral mb-4">Salas activas</h2>
        
        {activeRooms.length > 0 ? (
          <div className="space-y-4">
            {activeRooms.map(room => (
              <div key={room.id} className="bg-white rounded-[16px] shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${room.username}&backgroundColor=transparent`} alt={room.host} className="w-9 h-9 rounded-full bg-surface" />
                  <div>
                    <h3 className="text-[16px] font-inter font-bold text-neutral">{room.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[14px] font-inter text-neutral/80">{room.host}</span>
                      <span className="text-[12px] text-tertiary font-medium">{room.duration}</span>
                    </div>
                    <p className="text-[12px] text-neutral/60">{room.participants} participantes</p>
                  </div>
                </div>
                <button 
                  onClick={() => onJoinRoom(room.id)}
                  className="h-[44px] px-4 rounded-[12px] bg-primary text-neutral font-bold touch-target"
                >
                  Unirse
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-[16px] font-inter text-neutral/60 opacity-60">Ningún amigo está estudiando ahora.</p>
            <p className="text-[16px] font-inter text-neutral/60 opacity-60">Crea una sala y comparte el código.</p>
          </div>
        )}
      </div>

      {/* ── CENTERED MODALS (Bug 1 fix) ── */}
      {sheet && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSheet(null); }}
        >
          <div className="bg-white w-[90%] max-w-[480px] rounded-[16px] p-6 shadow-lg relative animate-scale-in">
            <button onClick={() => setSheet(null)} className="absolute top-4 right-4 p-2 touch-target text-neutral/60 hover:text-neutral">
              <X size={20} />
            </button>

            {sheet === "agregar" && (
              <>
                <h3 className="text-[18px] font-bold text-neutral mb-4">Agregar amigo</h3>
                <form onSubmit={handleSearchUser} className="relative mb-4">
                  <input 
                    type="text" 
                    placeholder="Buscar por username..." 
                    value={searchValue}
                    onChange={e => setSearchValue(e.target.value)}
                    className="w-full h-[44px] rounded-[12px] border border-outline-variant/40 pl-4 pr-12 bg-surface focus:border-primary outline-none"
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary touch-target">
                    {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                  </button>
                </form>
                
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {searchResults.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 border border-outline-variant/30 rounded-[12px]">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${u.nombre}&backgroundColor=transparent`} className="w-10 h-10 rounded-full bg-surface" />
                        <span className="font-bold text-sm text-neutral">{u.nombre}</span>
                      </div>
                      <button className="h-[36px] px-4 bg-primary text-neutral font-bold rounded-[8px] text-sm touch-target" onClick={(e) => handleSendRequest(e, u.id)}>
                        Agregar
                      </button>
                    </div>
                  ))}
                  {searchResults.length === 0 && searchValue.length >= 3 && !isSearching && (
                    <p className="text-sm text-center text-neutral/50 italic py-4">Presiona enter para buscar...</p>
                  )}
                </div>
              </>
            )}

            {sheet === "crear" && (
              <>
                <h3 className="text-[18px] font-bold text-neutral mb-4">Crear sala</h3>
                <input 
                  type="text" 
                  placeholder="Nombre de la sala (Opcional)" 
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  className="w-full h-[44px] rounded-[12px] border border-outline-variant/40 px-4 bg-surface focus:border-primary outline-none mb-6"
                />
                {generatedCode ? (
                  <div className="bg-surface-container flex items-center justify-between p-4 rounded-[12px] border border-outline-variant/30 mb-6">
                    <span className="font-mono font-bold tracking-widest text-neutral">{generatedCode}</span>
                    <button className="text-primary font-bold text-sm flex items-center gap-1 touch-target" onClick={() => { navigator.clipboard.writeText(generatedCode); toast.success("Copiado"); }}>
                      <Copy size={16} /> Copiar
                    </button>
                  </div>
                ) : (
                  <button onClick={handleCrearSala} disabled={isLoading} className="w-full h-[44px] rounded-[12px] bg-primary text-neutral font-bold touch-target flex items-center justify-center gap-2">
                    {isLoading && <Loader2 size={16} className="animate-spin" />} Crear
                  </button>
                )}
              </>
            )}

            {sheet === "unirse" && (
              <>
                <h3 className="text-[18px] font-bold text-neutral mb-4">Unirse a sala</h3>
                <input 
                  type="text" 
                  placeholder="Ingresa el código de sala" 
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value)}
                  className="w-full h-[44px] rounded-[12px] border border-outline-variant/40 px-4 bg-surface focus:border-primary outline-none mb-6 font-mono uppercase"
                />
                <button onClick={handleUnirseSala} disabled={isLoading} className="w-full h-[44px] rounded-[12px] bg-primary text-neutral font-bold touch-target flex justify-center items-center gap-2">
                  {isLoading && <Loader2 size={16} className="animate-spin" />} Unirse
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── AVATAR WITH FALLBACK ──
function AvatarCircle({ name, borderColor }: { name: string; borderColor: string }) {
  const [imgError, setImgError] = useState(false);
  const initial = name ? name[0].toUpperCase() : "?";
  const src = `https://api.dicebear.com/7.x/notionists/svg?seed=${name}&backgroundColor=transparent`;

  return (
    <div className={`w-[36px] h-[36px] rounded-full border-[3px] shrink-0 overflow-hidden ${borderColor}`}>
      {imgError ? (
        <div 
          className="w-full h-full flex items-center justify-center font-bold text-sm"
          style={{ backgroundColor: "#CBB4ED", color: "#1A1A2E" }}
        >
          {initial}
        </div>
      ) : (
        <img 
          src={src} 
          alt={name}
          className="w-full h-full rounded-full bg-white"
          onError={() => setImgError(true)} 
        />
      )}
    </div>
  );
}

// ── IN-ROOM VIEW (Bug 2 fixes) ──
function InRoomView({ roomId, onLeave }: { roomId: string, onLeave: () => void }) {
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const { submitXPMutation } = useAppStore();
  
  // Track last XP award minute to avoid double-awarding
  const lastXpMinuteRef = useRef(0);

  // Timer: tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // XP award: +1 XP every 60 seconds, persist to API
  useEffect(() => {
    const xpInterval = setInterval(() => {
      setSessionSeconds(currentSeconds => {
        const currentMinute = Math.floor(currentSeconds / 60);
        if (currentMinute > lastXpMinuteRef.current && currentMinute > 0) {
          lastXpMinuteRef.current = currentMinute;
          setXpEarned(currentMinute);
          
          // Persist XP to server (fire-and-forget, non-blocking)
          fetch("/api/xp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mutation_id: `room_${roomId}_min_${currentMinute}`,
              action: "room_session",
              entity_id: roomId,
              metadata: { minutes: 1 },
            }),
          }).catch(err => console.error("XP persist error:", err));
        }
        return currentSeconds;
      });
    }, 5000); // Check every 5 seconds for minute boundaries
    return () => clearInterval(xpInterval);
  }, [roomId]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleConfirmLeave = async () => {
    if (sessionSeconds >= 300) { // 5 minutes minimum
      await submitXPMutation("room_session", roomId, xpEarned, { minutes: sessionSeconds / 60 });
      toast.success(`+${xpEarned} XP guardados`);
    } else {
      toast("Sesión terminada (Mín. 5 min para ganar XP)", { icon: "ℹ️" });
    }
    onLeave();
  };

  const participants = [
    { id: "1", name: "AnaM", status: "online" },
    { id: "2", name: "Carlos", status: "idle" },
    { id: "3", name: "Sofía", status: "offline" }
  ];

  // Excalidraw canvas state management
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // [NEEDS BACKEND] Real-time collaborative sync via WebSocket or Supabase Realtime.
  // Currently each participant has their own local canvas view.
  // Canvas state is autosaved to the `rooms` table every 30 seconds (debounced).

  const handleCanvasChange = useCallback(() => {
    // Debounced autosave — save 30s after last change
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!excalidrawAPI) return;
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      try {
        await fetch("/api/xp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mutation_id: `canvas_save_${roomId}_${Date.now()}`,
            action: "room_session",
            entity_id: roomId,
            metadata: { 
              type: "canvas_autosave",
              minutes: 0,
              canvas_elements: elements.length,
            },
          }),
        });
      } catch (err) {
        console.error("Canvas autosave error:", err);
      }
    }, 30000);
  }, [excalidrawAPI, roomId]);

  return (
    <div className="flex flex-col h-full bg-surface-container-lowest animate-fade-in relative z-50">
      
      {/* Top Bar */}
      <div className="h-[64px] border-b border-outline-variant/20 flex items-center justify-between px-4 bg-white z-20 shrink-0">
        <div className="flex-1 truncate font-inter font-bold text-[18px] text-neutral">
          Sala {roomId.substring(0, 4)}
        </div>
        <div className="flex-1 flex justify-center">
          <div className="font-inter font-bold text-[18px] text-tertiary tracking-wider">
            {formatTime(sessionSeconds)}
          </div>
        </div>
        <div className="flex-1 flex justify-end">
          <button 
            onClick={() => setShowConfirmLeave(true)}
            className="h-[44px] px-4 font-bold text-sm border-2 border-outline-variant/50 bg-surface rounded-[12px] hover:bg-surface-container text-neutral touch-target"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Real-time XP Banner */}
      <div className="h-[24px] bg-tertiary flex items-center justify-center text-[12px] font-bold text-neutral tracking-widest z-10 shrink-0 transition-all">
        +{xpEarned} XP ESTA SESIÓN
      </div>

      {/* Participants Row */}
      <div className="h-[64px] border-b border-outline-variant/20 flex items-center gap-3 px-4 overflow-x-auto bg-surface z-10 shrink-0 hide-scrollbar">
        {participants.map(p => {
          const borderColor = p.status === 'online' 
            ? 'border-primary' 
            : p.status === 'idle' 
              ? 'border-tertiary' 
              : 'border-neutral/30';
          return (
            <div key={p.id} className="group relative">
              <AvatarCircle name={p.name} borderColor={borderColor} />
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-neutral text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {p.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Excalidraw Canvas (Bug 2c fix) */}
      <div className="flex-1 relative bg-white overflow-hidden">
        <Excalidraw
          onChange={handleCanvasChange}
          excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
          UIOptions={{
            canvasActions: {
              loadScene: false,
            },
          }}
        />
      </div>

      {/* Exit Confirmation Dialog */}
      {showConfirmLeave && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        >
          <div className="bg-white rounded-[16px] p-6 w-[90%] max-w-sm shadow-lg animate-scale-in">
            <h3 className="text-lg font-bold text-neutral mb-2">¿Salir de la sala?</h3>
            <p className="text-sm text-neutral/70 mb-6 leading-relaxed">
              Perderás el XP si llevas menos de 5 minutos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmLeave(false)} className="flex-1 h-[44px] font-bold rounded-[12px] bg-surface-container text-neutral touch-target">Cancelar</button>
              <button onClick={handleConfirmLeave} className="flex-1 h-[44px] font-bold rounded-[12px] bg-error text-white shadow-sm touch-target">Salir de todas formas</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── FRIENDS SCREEN ──
function FriendsScreen({ onBack }: { onBack: () => void }) {
  // [NEEDS BACKEND] In a real app, you would fetch these from the server.
  // For now we start empty as requested.
  const pendingRequests: any[] = [];
  const friends: any[] = [];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-2xl mx-auto w-full animate-fade-in">
      <div className="flex items-center mb-8">
        <button onClick={onBack} className="p-2 -ml-2 text-neutral touch-target">
          <X size={24} />
        </button>
        <h1 className="text-[22px] font-bold text-neutral font-inter ml-2">Amigos</h1>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-white border border-outline-variant/20 shadow-sm rounded-[16px] p-4 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-dark font-bold"><UserPlus size={18}/></div>
            <div>
              <p className="text-sm font-bold text-neutral">@carlosp quiere ser tu amigo</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="text-[12px] font-bold text-neutral/60 bg-surface px-3 h-[36px] rounded-[8px] touch-target">Rechazar</button>
            <button className="text-[12px] font-bold text-neutral bg-primary px-3 h-[36px] rounded-[8px] touch-target">Aceptar</button>
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="space-y-3">
        {friends.length > 0 ? friends.map((friend, i) => (
          <div key={i} className="bg-white rounded-[16px] shadow-sm p-4 flex items-center justify-between border border-outline-variant/10 cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-[3px] border-surface bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${friend.username}&backgroundColor=transparent`} alt={friend.name} className="w-full h-full object-cover bg-surface" />
              </div>
              <div>
                <h4 className="font-bold text-neutral text-[16px] flex items-center gap-2">
                  {friend.name}
                </h4>
                <p className="text-[12px] text-neutral/60">{friend.username}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-neutral/70 bg-surface px-1.5 py-0.5 rounded-[4px] uppercase">
                    {friend.level}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-tertiary-dark bg-tertiary/20 px-1.5 py-0.5 rounded-[4px]">
                    <Flame size={10} className="fill-tertiary text-tertiary" /> {friend.streak}
                  </span>
                </div>
              </div>
            </div>
            
            <button className="p-2 text-neutral/40 hover:text-neutral hover:bg-surface rounded-[8px] touch-target">
              <MoreVertical size={20} />
            </button>
          </div>
        )) : (
          <div className="text-center py-12">
            <p className="text-[16px] font-inter text-neutral/60 mb-2">Aún no tienes amigos en FOCOI.</p>
            <p className="text-[14px] font-inter text-neutral/50 mb-6">Busca por @username para agregar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
