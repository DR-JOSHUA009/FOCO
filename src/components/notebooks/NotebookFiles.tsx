"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, FileText, AudioLines, Trash2, Loader2, Search, FileDown } from "lucide-react";
import toast from "react-hot-toast";

interface NotebookFile {
  id: string;
  name: string;
  url: string;
  created_at: string;
  size: number;
  type: string;
}

/**
 * NotebookFiles — Archivos tab
 * 
 * SECURITY: Client-side MIME validation added
 * UX: Sticky date headers on scroll, Skeleton loading
 * DESIGN: Academic Clarity component styling
 */
export default function NotebookFiles({ notebookId }: { notebookId: string }) {
  const [files, setFiles] = useState<NotebookFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    loadFiles();
  }, [notebookId]);

  const loadFiles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.storage.from("notebook_files").list(notebookId);
    
    if (error) {
      console.error(error);
      setIsLoading(false);
      return;
    }

    if (data) {
      const fileUrls = await Promise.all(data.map(async (file) => {
        const { data: { publicUrl } } = supabase.storage.from("notebook_files").getPublicUrl(`${notebookId}/${file.name}`);
        return {
          id: file.id || file.name,
          name: file.name,
          url: publicUrl,
          created_at: file.created_at || new Date().toISOString(),
          size: file.metadata?.size || 0,
          type: file.metadata?.mimetype || "application/octet-stream"
        };
      }));
      setFiles(fileUrls.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }
    setIsLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];

    // SECURITY: MIME type client-side validation
    const allowedMimeTypes = [
      "application/pdf", 
      "image/jpeg", "image/png", "image/webp",
      "audio/mpeg", "audio/wav", "audio/ogg",
      "text/plain"
    ];
    
    if (!allowedMimeTypes.includes(file.type)) {
      toast.error("Formato no soportado. Sube PDF, imágenes o audios.");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("El archivo pesa más de 10MB.");
      return;
    }

    setIsUploading(true);
    
    const { error } = await supabase.storage
      .from("notebook_files")
      .upload(`${notebookId}/${Date.now()}_${file.name}`, file);

    if (error) {
      toast.error("Error al subir archivo");
    } else {
      toast.success("Archivo subido correctamente");
      loadFiles();
    }
    
    setIsUploading(false);
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm("¿Eliminar archivo?")) return;
    
    const { error } = await supabase.storage.from("notebook_files").remove([`${notebookId}/${fileName}`]);
    if (error) {
      toast.error("Error al eliminar");
    } else {
      toast.success("Archivo eliminado");
      loadFiles();
    }
  };

  const groupedFiles = files
    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .reduce((acc, file) => {
      const date = new Date(file.created_at).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(file);
      return acc;
    }, {} as Record<string, NotebookFile[]>);

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto relative">
      <div className="max-w-4xl w-full mx-auto p-8 pb-32">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-on-surface">Archivos y Transcripciones</h2>
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
            
            <label className="btn-primary !px-4 !py-2 flex items-center gap-2 cursor-pointer whitespace-nowrap">
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {isUploading ? "Subiendo..." : "Subir"}
              <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
            </label>
          </div>
        </div>

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
        ) : files.length === 0 ? (
          <div className="card-ac border-dashed border-2 border-outline-variant/50 flex flex-col items-center justify-center text-center py-16">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-bold text-neutral mb-2">No hay archivos aún</h3>
            <p className="text-on-surface-variant max-w-sm mb-6 text-sm text-balance">Sube apuntes, PDFs o graba clases para organizar todo tu material en este cuaderno.</p>
            <label className="btn-primary cursor-pointer">
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
                  {dateFiles.map(file => (
                    <div key={file.id} className="card-ac !p-4 flex items-start gap-4 hover:shadow-soft transition-shadow group">
                      <div className="w-12 h-12 rounded-xl bg-secondary/15 text-secondary-dark flex items-center justify-center shrink-0">
                        {file.type.includes("audio") ? <AudioLines size={24} /> : <FileText size={24} />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-neutral truncate text-sm mb-1">{file.name.split("_").slice(1).join("_") || file.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-surface-container-high px-2 py-0.5 rounded-ac-chip text-on-surface-variant uppercase tracking-wide">
                            {file.type.split("/")[1]?.substring(0, 4) || "FILE"}
                          </span>
                          <span className="text-xs text-outline-variant">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={file.url} target="_blank" rel="noreferrer" className="p-2 hover:bg-surface-container rounded-ac-btn text-primary touch-target" title="Ver archivo">
                          <FileDown size={18} />
                        </a>
                        {/* Audio file shows transcription CTA */}
                        {file.type.includes("audio") && (
                          <button className="p-2 hover:bg-primary/10 rounded-ac-btn text-primary font-semibold text-xs touch-target">
                            Transcripción
                          </button>
                        )}
                        <button onClick={() => handleDelete(file.name)} className="p-2 hover:bg-error-container hover:text-error rounded-ac-btn text-outline-variant touch-target" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
