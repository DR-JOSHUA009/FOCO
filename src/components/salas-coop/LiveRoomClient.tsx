"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Save, Download, X as CloseIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import debounce from "lodash/debounce";
import { toast } from "react-hot-toast";

// Dynamically import Excalidraw with ssr:false to avoid crashes.
// The CSS is imported via the wrapper file to keep it co-located with the component.
const ExcalidrawWithCSS = dynamic(
  () => import("./ExcalidrawWrapper"),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-on-surface-variant">Cargando pizarra...</div> }
);

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
  // Stabilize the supabase client — creating it inline re-runs on every render
  // which breaks the useEffect dependency array and causes infinite loops.
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // `supabase` is stable (via useRef). `currentUser` object ref changes on parent re-render
  // so we only depend on its id/nombre to avoid reconnecting unnecessarily.
  }, [room.id, currentUser.id, currentUser.nombre, excalidrawAPI]);

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
    const tId = toast.loading("Guardando lienzo...");
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      await fetch(`/api/rooms/${room.id}/canvas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvas_state: { elements, appState } }),
      });
      toast.success("Lienzo guardado exitosamente", { id: tId });
    } catch (err) {
      toast.error("Error al guardar el lienzo", { id: tId });
    }
  };

  const handleDownload = async () => {
    if (!excalidrawAPI) return;
    const tId = toast.loading("Preparando descarga...");
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      if (!elements || elements.length === 0) {
        toast.error("La pizarra está vacía", { id: tId });
        return;
      }

      const blob = await exportToBlob({
        elements,
        appState: {
          ...appState,
          exportWithDarkMode: appState.theme === "dark",
        },
        files,
        mimeType: "image/png",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${room.name.replace(/\s+/g, "_")}_${room.code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Descarga completada", { id: tId });
    } catch (err) {
      console.error(err);
      toast.error("Error al descargar la imagen", { id: tId });
    }
  };

  const handleClose = async () => {
    // If user is host, maybe prompt to save & close room permanently
    if (room.host_id === currentUser.id) {
      if (confirm("Eres el anfitrión. ¿Deseas cerrar y guardar esta sala de forma permanente para todos los participantes?")) {
        const tId = toast.loading("Cerrando sala...");
        try {
          await fetch(`/api/rooms/${room.id}/save`, { method: "POST" });
          await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
          toast.success("Sala cerrada y guardada", { id: tId });
          router.push("/salas-coop");
        } catch (err) {
          toast.error("Error al cerrar la sala", { id: tId });
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
               <img src={p.avatar_url} alt={p.nombre || 'User'} className="w-6 h-6 rounded-full object-cover" />
            ) : (
               <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
                 {(p.nombre || 'U').charAt(0).toUpperCase()}
               </div>
            )}
            <span className="font-bold text-xs text-on-surface">{p.nombre || 'Usuario'}</span>
          </div>
        ))}
      </div>

      {/* Main Canvas Area */}
      <main className="flex-1 relative w-full" style={{ minHeight: 0 }}>
        {/* Excalidraw Component */}
        <div style={{ height: "100%", width: "100%" }}>
          <ExcalidrawWithCSS 
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
            initialData={(() => {
              if (!room.canvas_state) return undefined;
              let parsed = room.canvas_state;
              if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (e) { parsed = {}; }
              }
              return {
                elements: parsed.elements || [],
                appState: parsed.appState || {}
              };
            })()}
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
        </div>
      </main>
    </div>
  );
}
