"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, FileText, Image as ImageIcon, Trash2, Loader2, FileDown } from "lucide-react";
import toast from "react-hot-toast";

interface NotebookFileRecord {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  public_url: string;
  uploaded_at: string;
}

export default function NotebookFiles({ notebookId }: { notebookId: string }) {
  const [files, setFiles] = useState<NotebookFileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<{ active: boolean; progress: number; name: string } | null>(null);
  
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    loadFiles();
  }, [notebookId]);

  const loadFiles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("notebook_files")
      .select("*")
      .eq("notebook_id", notebookId)
      .order("uploaded_at", { ascending: false });
    
    if (error) {
      console.error("Error loading files:", error);
    } else if (data) {
      setFiles(data);
    }
    
    setIsLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const allowedMimeTypes = [
      "image/jpeg", "image/png", "image/webp", "image/heic",
      "application/pdf", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain", "text/markdown"
    ];
    
    if (!allowedMimeTypes.includes(file.type)) {
      toast.error("Formato no soportado. Sube PDF, Word, imágenes o texto.");
      return;
    }
    
    if (file.size > 25 * 1024 * 1024) {
      toast.error("El archivo pesa más de 25MB.");
      return;
    }

    setUploadProgress({ active: true, progress: 0, name: file.name });
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("notebook_id", notebookId);
    
    try {
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
        throw new Error(errorData.error || "Error al subir el archivo");
      }

      const result = await response.json();
      
      if (result.success && result.file) {
        toast.success("Archivo subido correctamente");
        setFiles(prev => [result.file, ...prev]); // Optimistic update
      } else {
        throw new Error("Respuesta inválida del servidor");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error al subir archivo");
    } finally {
      setTimeout(() => setUploadProgress(null), 1000);
      e.target.value = ''; // Reset input
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este archivo?\nEsta acción no se puede deshacer.")) return;
    
    const toastId = toast.loading("Eliminando archivo...");
    
    try {
      const response = await fetch(`/api/files/${id}`, { method: "DELETE" });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error al eliminar");
      }
      
      toast.success("Archivo eliminado", { id: toastId });
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error al eliminar archivo", { id: toastId });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("image")) return <ImageIcon size={24} className="text-secondary-dark" />;
    if (mimeType.includes("pdf") || mimeType.includes("word")) return <FileText size={24} className="text-primary-dark" />;
    return <FileText size={24} className="text-neutral" />;
  };

  const formatSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString("es-ES", { day: 'numeric', month: 'short', year: 'numeric' });
    const formattedTime = date.toLocaleTimeString("es-ES", { hour: 'numeric', minute: '2-digit' });
    return `${formattedDate} · ${formattedTime}`;
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto relative">
      <div className="max-w-4xl w-full mx-auto p-8 pb-32">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-[22px] font-bold text-neutral">Archivos</h2>
            <p className="text-on-surface-variant text-sm mt-1">Sube recursos y apuntes para este cuaderno.</p>
          </div>
          
          <label className={`h-[44px] px-6 rounded-[12px] bg-primary text-neutral font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap touch-target ${uploadProgress?.active ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload size={20} />
            Subir archivo
            <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,.docx,.txt,.md" onChange={handleUpload} disabled={uploadProgress?.active} />
          </label>
        </div>

        {uploadProgress?.active && (
          <div className="mb-6 bg-surface p-4 rounded-[16px] shadow-sm flex items-center gap-4 animate-slide-up border border-primary/20">
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
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="text-primary animate-spin" />
          </div>
        ) : files.length === 0 && !uploadProgress?.active ? (
          <div className="bg-surface border-dashed border-2 border-outline-variant/50 rounded-[16px] flex flex-col items-center justify-center text-center py-16">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-[16px] font-bold text-neutral mb-2 font-inter">No hay archivos aún</h3>
            <p className="text-neutral/60 max-w-sm mb-6 text-[14px] font-inter text-balance">Sube apuntes, PDFs o imágenes para guardarlos aquí.</p>
            <label className="h-[44px] px-6 rounded-[12px] bg-primary text-neutral font-bold flex items-center justify-center cursor-pointer shadow-sm touch-target">
              Subir archivo
              <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.heic,.pdf,.docx,.txt,.md" onChange={handleUpload} />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            {files.map(file => (
              <div key={file.id} className="bg-surface rounded-[16px] p-4 shadow-sm flex items-center gap-4 hover:shadow-soft transition-shadow border border-outline-variant/10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-surface-container-highest`}>
                  {getFileIcon(file.file_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-neutral text-[16px] mb-1 truncate" title={file.filename}>
                    {file.filename.length > 40 ? file.filename.substring(0, 37) + "..." : file.filename}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-outline-variant">{formatDate(file.uploaded_at)}</span>
                    <span className="text-[12px] text-outline-variant font-bold">•</span>
                    <span className="text-[12px] text-outline-variant">{formatSize(file.file_size)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a 
                    href={file.public_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-[44px] h-[44px] flex items-center justify-center rounded-[12px] bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors touch-target" 
                    title="Descargar"
                  >
                    <FileDown size={20} />
                  </a>
                  <button 
                    onClick={() => handleDelete(file.id)} 
                    className="w-[44px] h-[44px] flex items-center justify-center rounded-[12px] bg-surface-container text-outline-variant hover:bg-error hover:text-white transition-colors touch-target" 
                    title="Eliminar"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
