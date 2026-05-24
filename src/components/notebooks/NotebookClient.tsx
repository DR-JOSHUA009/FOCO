"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save, Image as ImageIcon, FileCode2, Edit2, Check, Loader2, PenTool, FolderOpen } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import NotebookFiles from "./NotebookFiles";

// Dynamic import with SSR false is MANDATORY for Excalidraw
const ExcalidrawWrapper = dynamic(() => import('./ExcalidrawWrapper'), { ssr: false });

/**
 * NotebookClient — Subject notebook hub screen
 *
 * NOTE: Archivos tab feature integrated alongside Lienzo.
 */
export default function NotebookClient({ notebook }: { notebook: any }) {
  const [activeTab, setActiveTab] = useState<"lienzo" | "archivos">("lienzo");
  
  // Keep track of the canvas data locally so it isn't lost when the tab unmounts
  const [canvasData, setCanvasData] = useState(
    notebook.contenido_json 
      ? (typeof notebook.contenido_json === 'string' ? JSON.parse(notebook.contenido_json) : notebook.contenido_json) 
      : null
  );

  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(notebook.nombre);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date>(new Date(notebook.updated_at || notebook.created_at));
  const supabase = createClient();
  const wrapperRef = useRef<any>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Save canvas state before switching tabs to prevent data loss
  const saveBeforeTabSwitch = useCallback(async () => {
    if (!wrapperRef.current) return;
    const elements = wrapperRef.current.getElements();
    const appState = wrapperRef.current.getAppState();
    const files = wrapperRef.current.getFiles();
    await saveToDb(elements, appState, files, true);
  }, []);

  const saveToDb = useCallback(async (elements: any[], appState: any, files: any, silent = false) => {
    if (!silent) setIsSaving(true);
    const content = { elements, appState: { theme: appState.theme, viewBackgroundColor: appState.viewBackgroundColor }, files };
    
    // Update local state so when Excalidraw remounts it has the latest data
    setCanvasData(content);

    const { error } = await supabase.from("notebooks").update({ 
      contenido_json: content,
      updated_at: new Date().toISOString()
    }).eq("id", notebook.id);

    if (error) {
      if (!silent) toast.error("Error al guardar el cuaderno");
    } else {
      setLastSavedTime(new Date());
    }
    if (!silent) setIsSaving(false);
  }, [notebook.id, supabase]);

  const saveName = async () => {
    setIsEditingName(false);
    if (name.trim() === notebook.nombre || name.trim() === "") {
      setName(notebook.nombre);
      return;
    }
    await supabase.from("notebooks").update({ nombre: name.trim() }).eq("id", notebook.id);
  };

  const handleExcalidrawChange = (elements: any, appState: any, files: any) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      saveToDb(elements, appState, files, true);
    }, 2000);
  };

  const manualSave = async () => {
    if (!wrapperRef.current) return;
    const elements = wrapperRef.current.getElements();
    const appState = wrapperRef.current.getAppState();
    const files = wrapperRef.current.getFiles();
    await saveToDb(elements, appState, files, false);
    toast.success("Cuaderno guardado");
  };

  // Handle tab switch — save canvas first
  const handleTabSwitch = async (tab: "lienzo" | "archivos") => {
    if (activeTab === "lienzo" && tab === "archivos") {
      await saveBeforeTabSwitch();
    }
    setActiveTab(tab);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        manualSave();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden -m-8">
      {/* ── Header ── */}
      <div className="h-16 border-b border-outline-variant/30 bg-surface-container-lowest flex items-center justify-between px-6 shrink-0 z-10 shadow-card relative">
        <div className="flex items-center gap-4">
          <Link href="/cuadernos" className="p-2 rounded-ac-chip text-on-surface-variant hover:bg-surface-container transition-colors touch-target">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 group">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input 
                    autoFocus
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveName()}
                    onBlur={saveName}
                    className="font-bold text-lg bg-surface-container-lowest border-b-2 border-primary outline-none px-1 h-8"
                  />
                  <button onClick={saveName} className="text-primary hover:bg-primary/10 p-1 rounded touch-target">
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="font-bold text-lg text-on-surface truncate max-w-[300px]">{name}</h1>
                  <button onClick={() => setIsEditingName(true)} className="text-outline-variant hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 size={14} />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral bg-secondary/25 px-2 py-0.5 rounded-ac-chip">
                {notebook.materia}
              </span>
              <span className="text-xs text-on-surface-variant/60">
                Guardado: {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* ── Center Tabs ── */}
        <div className="hidden md:flex items-center bg-surface-container p-1 rounded-ac-btn absolute left-1/2 -translate-x-1/2">
          <button 
            onClick={() => handleTabSwitch("lienzo")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-ac-chip text-sm font-semibold transition-all touch-target ${
              activeTab === 'lienzo' 
                ? 'bg-primary/20 text-neutral border-b-2 border-primary' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <PenTool size={16} /> Lienzo
          </button>
          <button 
            onClick={() => handleTabSwitch("archivos")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-ac-chip text-sm font-semibold transition-all touch-target ${
              activeTab === 'archivos' 
                ? 'bg-primary/20 text-neutral border-b-2 border-primary' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <FolderOpen size={16} /> Archivos
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "lienzo" && (
            <>
              <button 
                onClick={() => wrapperRef.current?.downloadPng(name)}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-ac-chip transition-colors touch-target"
                title="Descargar PNG"
              >
                <ImageIcon size={16} /> PNG
              </button>
              <button 
                onClick={() => wrapperRef.current?.downloadSvg(name)}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-ac-chip transition-colors touch-target"
                title="Descargar SVG"
              >
                <FileCode2 size={16} /> SVG
              </button>
              
              <div className="hidden lg:block w-px h-6 bg-outline-variant/30 mx-2"></div>
              
              <button 
                onClick={manualSave}
                disabled={isSaving}
                className="btn-primary flex items-center gap-2 !px-4 !py-2 text-sm"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 bg-surface-container-lowest relative w-full h-full transition-screen">
        {activeTab === "lienzo" ? (
          <ExcalidrawWrapper 
            excalidrawRef={wrapperRef}
            initialData={canvasData}
            onChange={handleExcalidrawChange}
          />
        ) : (
          <NotebookFiles notebookId={notebook.id} />
        )}
      </div>
    </div>
  );
}
