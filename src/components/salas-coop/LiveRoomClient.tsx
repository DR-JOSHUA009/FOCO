"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Save, Download, X as CloseIcon, User as Person } from "lucide-react";
import { useRouter } from "next/navigation";
import debounce from "lodash/debounce";

// Dynamically import Excalidraw to prevent SSR issues
const Excalidraw = dynamic(() => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw), { ssr: false });

type Room = {
  id: string;
  name: string;
  code: string;
  status: string;
  host_id: string;
  canvas_state: any;
};

type CurrentUser = {
  id: string;
  nombre: string;
  avatar_url: string;
};

type PresenceState = {
  id: string;
  nombre: string;
  avatar_url: string;
  joinedAt: string;
};

export default function LiveRoomClient({ room, currentUser }: { room: Room; currentUser: CurrentUser }) {
  const router = useRouter();
  const supabase = createClient();
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [participants, setParticipants] = useState<PresenceState[]>([]);
  const channelRef = useRef<any>(null);
  const isUpdatingRef = useRef(false);

  // Initialize Realtime
  useEffect(() => {
    const channel = supabase.channel(`room_${room.id}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
        broadcast: {
          self: false,
          ack: true,
        }
      }
    });

    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const activeUsers: PresenceState[] = [];
        for (const id in state) {
          // Add the first presence entry for each user
          if (state[id] && state[id].length > 0) {
            activeUsers.push(state[id][0] as PresenceState);
          }
        }
        setParticipants(activeUsers);
      })
      .on("broadcast", { event: "canvas-update" }, (payload) => {
        if (excalidrawAPI && payload.payload.elements) {
          isUpdatingRef.current = true;
          excalidrawAPI.updateScene({
            elements: payload.payload.elements,
            appState: payload.payload.appState,
            commitToHistory: false
          });
          // Small delay to allow the update to finish before re-enabling broadcast
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 100);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            id: currentUser.id,
            nombre: currentUser.nombre,
            avatar_url: currentUser.avatar_url,
            joinedAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, currentUser, excalidrawAPI, supabase]);

  // Handle onChange from Excalidraw with debounce
  const broadcastUpdate = useRef(
    debounce((elements: any, appState: any) => {
      if (channelRef.current && !isUpdatingRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "canvas-update",
          payload: { elements, appState },
        });
      }
    }, 50) // 50ms debounce for smooth but performant syncing
  ).current;

  const autoSaveCanvas = useRef(
    debounce(async (elements: any, appState: any) => {
      try {
        await fetch(`/api/rooms/${room.id}/canvas`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canvas_state: { elements, appState } }),
        });
      } catch (err) {
        console.error("Auto-save failed", err);
      }
    }, 15000) // Auto-save every 15s to the database
  ).current;

  const handleChange = (elements: readonly any[], appState: any) => {
    if (!isUpdatingRef.current) {
      broadcastUpdate(elements, appState);
      autoSaveCanvas(elements, appState);
    }
  };

  const handleSave = async () => {
    if (!excalidrawAPI) return;
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      await fetch(`/api/rooms/${room.id}/canvas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvas_state: { elements, appState } }),
      });
      alert("Lienzo guardado exitosamente.");
    } catch (err) {
      alert("Error al guardar el lienzo.");
    }
  };

  const handleDownload = async () => {
    // In a full implementation, we might use excalidraw's exportToBlob
    // For now, we simulate a manual save to local
    alert("Función de descarga local activada.");
  };

  const handleClose = async () => {
    // If user is host, maybe prompt to save & close room permanently
    if (room.host_id === currentUser.id) {
      if (confirm("Eres el anfitrión. ¿Deseas cerrar y guardar esta sala de forma permanente para todos los participantes?")) {
        try {
          await fetch(`/api/rooms/${room.id}/save`, { method: "POST" });
          await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
          router.push("/salas-coop");
        } catch (err) {
          alert("Error al cerrar la sala.");
        }
      } else {
        router.push("/salas-coop");
      }
    } else {
      router.push("/salas-coop");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background text-on-surface flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="h-16 px-4 md:px-8 bg-surface border-b border-outline-variant flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-[18px] text-on-surface tracking-tight">{room.name}</h1>
          <span className="px-2 py-0.5 bg-surface-container-highest text-on-surface-variant font-bold text-xs rounded uppercase tracking-wider">
            {room.code}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSave}
            className="p-2 text-tertiary hover:bg-tertiary-container/20 rounded-lg transition-colors flex items-center" 
            title="Guardar"
          >
            <Save size={20} />
          </button>
          <button 
            onClick={handleDownload}
            className="p-2 text-secondary hover:bg-secondary-container/20 rounded-lg transition-colors flex items-center" 
            title="Descargar"
          >
            <Download size={20} />
          </button>
          
          <div className="h-6 w-[1px] bg-outline-variant mx-2"></div>
          
          <button 
            onClick={handleClose}
            className="font-bold text-sm text-error hover:bg-error-container/10 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <CloseIcon size={16} />
            Salir
          </button>
        </div>
      </nav>

      {/* Participant Row */}
      <div className="h-14 px-4 md:px-8 bg-surface border-b border-outline-variant flex items-center gap-3 overflow-x-auto shadow-sm shrink-0 no-scrollbar">
        {participants.map((p) => (
          <div key={p.id} className="flex-none flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg border border-outline-variant">
            {p.avatar_url ? (
               <img src={p.avatar_url} alt={p.nombre} className="w-6 h-6 rounded-full object-cover" />
            ) : (
               <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
                 {p.nombre.charAt(0).toUpperCase()}
               </div>
            )}
            <span className="font-bold text-xs text-on-surface">{p.nombre}</span>
          </div>
        ))}
      </div>

      {/* Main Canvas Area */}
      <main className="flex-1 relative w-full h-full">
        {/* Excalidraw Component */}
        <Excalidraw 
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          initialData={room.canvas_state ? {
            elements: room.canvas_state.elements || [],
            appState: room.canvas_state.appState || {}
          } : undefined}
          onChange={handleChange}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: true,
              loadScene: false,
              saveToActiveFile: false,
              toggleTheme: true,
              saveAsImage: false,
            }
          }}
          theme="light"
        />
      </main>
    </div>
  );
}
