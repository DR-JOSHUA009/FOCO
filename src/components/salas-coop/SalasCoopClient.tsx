"use client";

import { useState, useEffect } from "react";
import { Key, Plus, Sparkles, Users, Lock, LogOut, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

type Room = {
  id: string;
  name: string;
  code: string;
  status: string;
  host_id: string;
  participantCount: number;
};

type SavedRoom = {
  id: string;
  name: string;
  saved_at: string;
  saved_by: string;
  saved_room_members: { user_id: string; display_name: string }[];
};

export default function SalasCoopClient({ 
  userId, 
  initialActiveRooms 
}: { 
  userId: string;
  initialActiveRooms: Room[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"activas" | "guardadas">("activas");
  const [activeRooms, setActiveRooms] = useState<Room[]>(initialActiveRooms);
  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchSavedRooms = async () => {
    setIsLoadingSaved(true);
    try {
      const res = await fetch("/api/rooms/saved");
      if (res.ok) {
        const data = await res.json();
        setSavedRooms(data.saved_rooms);
      }
    } catch (error) {
      console.error("Failed to fetch saved rooms", error);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  useEffect(() => {
    if (activeTab === "guardadas") {
      fetchSavedRooms();
    }
  }, [activeTab]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setIsSubmitting(true);
    setError("");

    const loadingToast = toast.loading("Creando sala...");

    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Sala creada con éxito", { id: loadingToast });
      router.push(`/salas-coop/${data.room_id}`);
    } catch (err: any) {
      toast.error(err.message || "Error al crear la sala", { id: loadingToast });
      setError(err.message || "Error al crear la sala");
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsSubmitting(true);
    setError("");

    const loadingToast = toast.loading("Buscando sala...");

    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Unido a ${data.name}`, { id: loadingToast });
      router.push(`/salas-coop/${data.room_id}`);
    } catch (err: any) {
      toast.error(err.message || "Código inválido", { id: loadingToast });
      setError(err.message || "Código inválido o error al unirse");
      setIsSubmitting(false);
    }
  };

  const handleLeaveRoom = async (room: Room) => {
    const isHost = room.host_id === userId;
    
    if (isHost) {
      if (!confirm(`¿Deseas ELIMINAR la sala "${room.name}"? Se cerrará para todos.`)) return;
      const tId = toast.loading("Eliminando sala...");
      try {
        await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
        setActiveRooms(prev => prev.filter(r => r.id !== room.id));
        toast.success("Sala eliminada", { id: tId });
      } catch (err) {
        toast.error("Error al eliminar", { id: tId });
      }
    } else {
      if (!confirm(`¿Deseas salir de la sala "${room.name}"?`)) return;
      const tId = toast.loading("Saliendo...");
      try {
        await supabase.from("room_participants").delete().eq("room_id", room.id).eq("user_id", userId);
        setActiveRooms(prev => prev.filter(r => r.id !== room.id));
        toast.success("Has salido de la sala", { id: tId });
      } catch (err) {
        toast.error("Error al salir", { id: tId });
      }
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <h2 className="text-[22px] font-bold text-on-surface tracking-tight">Salas Coop</h2>
      </header>

      {/* Control Bar & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        {/* Segmented Control */}
        <div className="bg-surface-container p-1 rounded-full flex gap-1">
          <button 
            onClick={() => setActiveTab("activas")}
            className={`px-6 py-2 rounded-full font-label-md text-label-md transition-all ${
              activeTab === "activas" 
                ? "bg-primary text-on-primary shadow-sm" 
                : "text-on-surface-variant hover:bg-surface-container-highest"
            }`}
          >
            Salas activas
          </button>
          <button 
            onClick={() => setActiveTab("guardadas")}
            className={`px-6 py-2 rounded-full font-label-md text-label-md transition-all ${
              activeTab === "guardadas" 
                ? "bg-primary text-on-primary shadow-sm" 
                : "text-on-surface-variant hover:bg-surface-container-highest"
            }`}
          >
            Guardadas
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsJoinModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 border border-outline text-on-surface font-label-md text-label-md rounded-lg hover:bg-surface-container-low transition-colors active:scale-95"
          >
            <Key size={18} />
            Unirse con código
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-primary-container text-on-primary-container font-label-md text-label-md rounded-lg hover:brightness-95 transition-all shadow-sm active:scale-95"
          >
            <Plus size={18} />
            Crear sala
          </button>
        </div>
      </div>

      {/* Content */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[18px] font-bold text-on-surface">
            {activeTab === "activas" ? "Mis salas activas" : "Mis salas guardadas"}
          </h3>
        </div>

        {activeTab === "activas" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeRooms.length === 0 ? (
              <div className="col-span-full py-12 text-center text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-2xl">
                <Users size={32} className="mx-auto mb-3 opacity-50" />
                <p>No estás en ninguna sala activa en este momento.</p>
                <p className="text-sm opacity-80 mt-1">Crea una sala nueva o únete con un código.</p>
              </div>
            ) : (
              activeRooms.map(room => (
                <div key={room.id} className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl flex flex-col gap-6 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface mb-1">{room.name}</h4>
                      <div className="inline-flex items-center px-2 py-1 rounded border border-outline-variant font-mono text-[11px] text-on-surface-variant uppercase tracking-wider">
                        {room.code}
                      </div>
                    </div>
                    {/* Urgency indicator (dummy green for active) */}
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-tertiary font-label-md text-label-md">
                        {room.participantCount}/8 participantes
                      </span>
                      <button 
                        onClick={() => handleLeaveRoom(room)}
                        className="text-on-surface-variant hover:text-error transition-colors p-2 rounded-full hover:bg-error/10"
                        title={room.host_id === userId ? "Eliminar sala" : "Salir de sala"}
                      >
                        {room.host_id === userId ? <Trash2 size={18} /> : <LogOut size={18} />}
                      </button>
                    </div>
                    <button 
                      onClick={() => router.push(`/salas-coop/${room.id}`)}
                      className="px-8 py-2 bg-on-surface text-white rounded-lg font-label-md text-label-md hover:bg-primary transition-colors active:scale-95 shadow-sm"
                    >
                      Entrar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "guardadas" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoadingSaved ? (
              <div className="col-span-full py-12 text-center text-on-surface-variant">
                Cargando salas guardadas...
              </div>
            ) : savedRooms.length === 0 ? (
              <div className="col-span-full py-12 text-center text-on-surface-variant bg-surface-container-lowest border border-outline-variant rounded-2xl">
                <Lock size={32} className="mx-auto mb-3 opacity-50" />
                <p>No tienes salas guardadas.</p>
                <p className="text-sm opacity-80 mt-1">El anfitrión puede guardar una sala al cerrarla.</p>
              </div>
            ) : (
              savedRooms.map(room => (
                <div key={room.id} className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl flex flex-col gap-4 hover:shadow-md transition-all">
                  <div>
                    <h4 className="font-headline-sm text-headline-sm text-on-surface mb-1">{room.name}</h4>
                    <span className="text-xs text-on-surface-variant">
                      Guardada el {new Date(room.saved_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-on-surface-variant block mb-1">Participantes ({room.saved_room_members.length})</span>
                    <div className="flex flex-wrap gap-1">
                      {room.saved_room_members.map(member => (
                        <span key={member.user_id} className="text-xs bg-surface-container-high px-2 py-1 rounded-full">
                          {member.display_name}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* TODO: Add logic to view canvas snapshot */}
                  <button className="mt-2 w-full py-2 border border-outline text-on-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors">
                    Ver Pizarra Guardada
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Atmospheric Illustration Area */}
      <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden h-[240px] relative group flex items-center justify-center bg-gradient-to-br from-primary-container/20 to-surface-variant">
           <Image 
             src="/coop_focus_workspace.png" 
             alt="Espacio de enfoque" 
             fill 
             className="object-cover transition-transform duration-700 group-hover:scale-105"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
           <div className="absolute bottom-6 left-6 z-20 text-white">
              <h5 className="font-headline-sm text-[20px] font-bold mb-1">Tu espacio de enfoque</h5>
              <p className="font-body-sm text-sm opacity-90">Únete a una sala y maximiza tu productividad hoy con herramientas colaborativas.</p>
           </div>
        </div>
        <div className="bg-primary-fixed/30 rounded-2xl p-6 flex flex-col justify-center items-center text-center border border-primary/10">
          <Sparkles className="text-primary mb-4" size={48} />
          <h5 className="font-headline-sm text-[20px] font-bold text-primary mb-2">Modo Deep Focus</h5>
          <p className="font-body-sm text-sm text-on-primary-fixed-variant">Bloquea distracciones automáticamente al unirte a una sala activa.</p>
        </div>
      </section>

      {/* --- MODALS --- */}
      {/* Create Room Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl p-6 shadow-xl relative animate-scale-in">
            <h3 className="text-xl font-bold text-on-surface mb-2">Crear nueva sala</h3>
            <p className="text-sm text-on-surface-variant mb-6">Invita a tus amigos a estudiar contigo en tiempo real.</p>
            
            <form onSubmit={handleCreateRoom}>
              <div className="mb-6">
                <label className="block text-sm font-bold text-on-surface mb-2">Nombre de la sala</label>
                <input 
                  type="text" 
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Ej. Repaso de Cálculo"
                  className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  required
                />
              </div>
              {error && <p className="text-error text-sm mb-4">{error}</p>}
              <div className="flex gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-2 text-on-surface-variant hover:bg-surface-container rounded-lg font-bold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-primary text-on-primary rounded-lg font-bold text-sm hover:brightness-110 transition-all shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Creando..." : "Crear Sala"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl p-6 shadow-xl relative animate-scale-in">
            <h3 className="text-xl font-bold text-on-surface mb-2">Unirse a sala</h3>
            <p className="text-sm text-on-surface-variant mb-6">Ingresa el código alfanumérico que te proporcionó el anfitrión.</p>
            
            <form onSubmit={handleJoinRoom}>
              <div className="mb-6">
                <label className="block text-sm font-bold text-on-surface mb-2">Código de la sala</label>
                <input 
                  type="text" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Ej. REP012"
                  className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-3 text-on-surface font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  required
                  maxLength={10}
                />
              </div>
              {error && <p className="text-error text-sm mb-4">{error}</p>}
              <div className="flex gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-6 py-2 text-on-surface-variant hover:bg-surface-container rounded-lg font-bold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-primary text-on-primary rounded-lg font-bold text-sm hover:brightness-110 transition-all shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Uniéndose..." : "Entrar a Sala"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
