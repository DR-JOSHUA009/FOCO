"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, FileText, AudioLines, Trash2, Loader2, Search, FileDown, RefreshCw, FileImage, FileCode } from "lucide-react";
import toast from "react-hot-toast";

interface NotebookFileRecord {
  id: string;
  file_name: string;
  public_url: string;
  created_at: string;
  size_bytes: number;
  mime_type: string;
  transcription_status: "pending" | "processing" | "completed" | "failed";
  transcription_text: string | null;
}

/**
 * NotebookFiles — Archivos tab
 * 
 * FIX 3: Rebuilt File Uploads + Lumos Transcription
 * - Uses secure server upload API instead of direct storage client
 * - Shows upload progress
 * - Tracks transcription status (pending, processing, completed, failed)
 * - Shows transcribed text preview
 */
export default function NotebookFiles({ notebookId }: { notebookId: string }) {
  const [files, setFiles] = useState<NotebookFileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<{ active: boolean; progress: number; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Stabilize the supabase client reference to avoid infinite re-renders
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    loadFiles();
    
    // Subscribe to transcription status changes
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notebook_file_records',
          filter: `notebook_id=eq.${notebookId}`
        },
        (payload) => {
          setFiles(prev => prev.map(f => f.id === payload.new.id ? payload.new as NotebookFileRecord : f));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebookId]);

  const loadFiles = async () => {
    setIsLoading(true);
    // Use the database records instead of storage bucket directly
    const { data, error } = await supabase
      .from("notebook_file_records")
      .select("*")
      .eq("notebook_id", notebookId)
      .order("created_at", { ascending: false });
    
    if (error) {
      // For first time before backend table exists, fail gracefully
      console.warn("Could not load file records (maybe table doesn't exist yet):", error);
      toast.error("Error al cargar los archivos", { id: "load-files-error" });
    } else if (data) {
      setFiles(data);
    }
    
    setIsLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Client validation (server will also validate)
    const allowedMimeTypes = [
      "application/pdf", 
      "image/jpeg", "image/png", "image/webp", "image/heic",
      "audio/mpeg", "audio/wav", "audio/ogg",
      "text/plain", "text/markdown",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    
    if (!allowedMimeTypes.includes(file.type)) {
      toast.error("Formato no soportado. Sube PDF, Word, imágenes o audios.");
      return;
    }
    
    if (file.size > 25 * 1024 * 1024) { // 25MB limit
      toast.error("El archivo pesa más de 25MB.");
      return;
    }

    setUploadProgress({ active: true, progress: 0, name: file.name });
    
    // Create form data for API
    const formData = new FormData();
    formData.append("file", file);
    formData.append("notebook_id", notebookId);
    
    try {
      // Simulate progress since fetch doesn't support upload progress natively
      // In a real app we'd use XHR for actual progress events
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => prev ? { ...prev, progress: Math.min(prev.progress + 15, 90) } : null);
      }, 500);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(prev => prev ? { ...prev, progress: 100 } : null);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al subir");
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success("Archivo subido correctamente");
        // Reload list to get the new DB record
        loadFiles();
      } else {
        throw new Error("Respuesta inválida del servidor");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error al subir archivo");
    } finally {
      setTimeout(() => setUploadProgress(null), 1000);
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("¿Seguro que quieres eliminar este archivo?")) return;
    
    // First remove from DB
    const { error: dbError } = await supabase.from("notebook_file_records").delete().eq("id", id);
    if (dbError) {
      toast.error("Error al eliminar registro");
      return;
    }
    
    // Then remove from storage
    const { error: storageError } = await supabase.storage.from("notebook_files").remove([path]);
    if (storageError) console.error("Storage cleanup failed:", storageError);
    
    toast.success("Archivo eliminado");
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const retryTranscription = async (id: string) => {
    toast("Reintentando transcripción...", { icon: "🔄" });
    // Update local state optimistically
    setFiles(prev => prev.map(f => f.id === id ? { ...f, transcription_status: "processing" } : f));
    
    // Call API (you'd need a specific endpoint for this, simulating here)
    const { error } = await supabase.from("notebook_file_records")
      .update({ transcription_status: "processing" })
      .eq("id", id);
      
    if (error) {
      toast.error("Error al reintentar");
      setFiles(prev => prev.map(f => f.id === id ? { ...f, transcription_status: "failed" } : f));
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("audio")) return <AudioLines size={24} className="text-tertiary-dark" />;
    if (mimeType.includes("image")) return <FileImage size={24} className="text-secondary-dark" />;
    if (mimeType.includes("pdf") || mimeType.includes("word")) return <FileText size={24} className="text-primary-dark" />;
    return <FileCode size={24} className="text-neutral" />;
  };

  const getFileColor = (mimeType: string) => {
    if (mimeType.includes("audio")) return "bg-tertiary/15 text-tertiary-dark";
    if (mimeType.includes("image")) return "bg-secondary/15 text-secondary-dark";
    if (mimeType.includes("pdf") || mimeType.includes("word")) return "bg-primary/15 text-primary-dark";
    return "bg-surface-container text-neutral";
  };

  const groupedFiles = files
    .filter(f => f.file_name.toLowerCase().includes(searchQuery.toLowerCase()))
    .reduce((acc, file) => {
      const date = new Date(file.created_at).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(file);
      return acc;
    }, {} as Record<string, NotebookFileRecord[]>);

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto relative">
      <div className="max-w-4xl w-full mx-auto p-8 pb-32">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-neutral">Archivos y Transcripciones</h2>
            <p className="text-on-surface-variant text-sm mt-1">Sube documentos, imágenes o grabaciones para este cuaderno.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" size={16} />
              <input
                type="text"
                placeholder="Buscar archivos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-ac-btn bg-surface border border-outline-variant/30 focus:border-primary outline-none text-sm w-full sm:w-64 touch-target"
              />
            </div>
            
            <label className={`btn-primary !px-4 !py-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${uploadProgress?.active ? 'opacity-50 pointer-events-none' : ''}`}>
              <Upload size={16} />
              Subir
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploadProgress?.active} />
            </label>
          </div>
        </div>

        {/* ── Active Upload Progress ── */}
        {uploadProgress?.active && (
          <div className="mb-6 card-ac !p-4 border border-primary/30 flex items-center gap-4 bg-primary/5 animate-slide-up">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Loader2 size={20} className="text-primary animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-neutral truncate">Subiendo: {uploadProgress.name}</h4>
              <div className="mt-2 h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.progress}%` }}
                ></div>
              </div>
            </div>
            <span className="text-xs font-bold text-primary shrink-0">{uploadProgress.progress}%</span>
          </div>
        )}

        {isLoading ? (
          /* ── Skeleton Loading State ── */
          <div className="space-y-8 pl-6 border-l-2 border-outline-variant/20 ml-4 relative">
            {[1, 2].map((group) => (
              <div key={group} className="relative">
                <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full bg-surface border-4 border-outline-variant/50"></div>
                <div className="w-24 h-5 skeleton mb-4 rounded"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((item) => (
                    <div key={item} className="card-ac p-4 flex gap-4">
                      <div className="w-12 h-12 skeleton rounded-xl shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="w-3/4 h-4 skeleton"></div>
                        <div className="w-1/2 h-3 skeleton"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : files.length === 0 && !uploadProgress?.active ? (
          <div className="card-ac border-dashed border-2 border-outline-variant/50 flex flex-col items-center justify-center text-center py-16">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-bold text-neutral mb-2">No hay archivos aún</h3>
            <p className="text-on-surface-variant max-w-sm mb-6 text-sm text-balance">Sube apuntes, PDFs o graba clases. Lumos extraerá el texto automáticamente para ti.</p>
            <label className="btn-primary cursor-pointer touch-target">
              Subir Archivo
              <input type="file" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-primary/20 space-y-10 ml-4">
            {Object.entries(groupedFiles).map(([date, dateFiles]) => (
              <div key={date} className="relative">
                {/* Timeline Dot */}
                <div className="absolute -left-[35px] top-1.5 w-4 h-4 rounded-full bg-surface border-[3px] border-primary shadow-sm z-10"></div>
                
                {/* Sticky Date Header */}
                <div className="sticky top-0 bg-background/90 backdrop-blur-sm z-10 py-1 -mt-1 mb-3">
                  <h3 className="text-xs font-bold text-neutral uppercase tracking-wider">{date}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dateFiles.map(file => {
                    const isProcessing = file.transcription_status === "processing" || file.transcription_status === "pending";
                    const isFailed = file.transcription_status === "failed";
                    const isCompleted = file.transcription_status === "completed";

                    return (
                      <div key={file.id} className="card-ac !p-0 overflow-hidden hover:shadow-soft transition-shadow group flex flex-col border border-outline-variant/30">
                        {/* File Header */}
                        <div className="p-4 flex items-start gap-4 bg-surface-container-lowest">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getFileColor(file.mime_type)}`}>
                            {getFileIcon(file.mime_type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-neutral truncate text-sm mb-1">{file.file_name}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold bg-surface-container-high px-2 py-0.5 rounded-ac-chip text-on-surface-variant uppercase tracking-wide">
                                {file.mime_type.split("/")[1]?.substring(0, 4) || "FILE"}
                              </span>
                              <span className="text-xs text-outline-variant">
                                {(file.size_bytes / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a href={file.public_url} target="_blank" rel="noreferrer" className="p-2 hover:bg-surface-container rounded-ac-btn text-primary touch-target" title="Descargar">
                              <FileDown size={18} />
                            </a>
                            <button 
                              onClick={() => handleDelete(file.id, file.public_url.split('/').pop()!)} 
                              className="p-2 hover:bg-error-container hover:text-error rounded-ac-btn text-outline-variant touch-target" 
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        {/* Transcription Section */}
                        <div className="border-t border-outline-variant/20 bg-surface-container-low p-3 px-4">
                          {isProcessing && (
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <Loader2 size={12} className="text-primary animate-spin" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-bold text-primary">Transcribiendo con Lumos...</p>
                                <div className="mt-1 h-2 w-24 bg-surface-container-high rounded overflow-hidden">
                                  <div className="h-full bg-primary/50 w-full animate-pulse"></div>
                                </div>
                              </div>
                            </div>
                          )}

                          {isFailed && (
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-error"></div>
                                <span className="text-xs font-bold text-error">Error al transcribir</span>
                              </div>
                              <button 
                                onClick={() => retryTranscription(file.id)}
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-neutral bg-surface-container px-2 py-1 rounded touch-target"
                              >
                                <RefreshCw size={12} /> Reintentar
                              </button>
                            </div>
                          )}

                          {isCompleted && (
                            <div className="space-y-2">
                              <p className="text-xs text-on-surface-variant italic line-clamp-2">
                                "{file.transcription_text?.substring(0, 120) || "Sin texto detectado"}"
                              </p>
                              <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1 touch-target">
                                <FileText size={12} /> Ver transcripción completa
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
