"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import toast from "react-hot-toast";

interface TaskModalProps {
  onClose: () => void;
}

export default function TaskModal({ onClose }: TaskModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAppStore();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    materia: "",
    prioridad: "media" as "alta" | "media" | "baja",
    fecha_entrega: new Date().toISOString().split('T')[0],
    tags: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.titulo || !formData.materia) {
      toast.error("El título y la materia son obligatorios.");
      return;
    }

    setIsLoading(true);

    const xpReward = formData.prioridad === 'alta' ? 50 : formData.prioridad === 'media' ? 30 : 15;
    const tagsArray = formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(t => t) : [];

    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      titulo: formData.titulo,
      descripcion: formData.descripcion,
      materia: formData.materia,
      prioridad: formData.prioridad,
      fecha_entrega: formData.fecha_entrega,
      xp_reward: xpReward,
      tags: tagsArray,
      completada: false,
    });

    if (error) {
      toast.error("Error al crear tarea: " + error.message);
    } else {
      toast.success("Tarea creada exitosamente");
      // Opcional: Podrías llamar a un router.refresh() para actualizar los Server Components
      // o actualizar el estado de Zustand directamente. Por simplicidad, se recarga la página.
      window.location.reload();
    }
    
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-slide-up">
        <div className="flex justify-between items-center p-6 border-b border-outline-variant/30">
          <h2 className="text-xl font-bold text-on-surface">Nueva Tarea</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-md hover:bg-surface">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant">Título</label>
            <input
              type="text"
              placeholder="Ej: Leer capítulo 4"
              className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              value={formData.titulo}
              onChange={(e) => setFormData({...formData, titulo: e.target.value})}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant">Descripción (Opcional)</label>
            <textarea
              placeholder="Detalles adicionales..."
              className="w-full h-24 p-4 border border-outline-variant/60 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant">Materia</label>
              <input
                type="text"
                placeholder="Ej: Matemáticas"
                className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={formData.materia}
                onChange={(e) => setFormData({...formData, materia: e.target.value})}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant">Fecha de entrega</label>
              <input
                type="date"
                className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={formData.fecha_entrega}
                onChange={(e) => setFormData({...formData, fecha_entrega: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant">Prioridad</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({...formData, prioridad: "alta"})}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm border-2 transition-all ${
                  formData.prioridad === 'alta' ? 'border-error text-error bg-error/10' : 'border-outline-variant/30 text-on-surface-variant hover:border-error/50'
                }`}
              >
                Alta
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, prioridad: "media"})}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm border-2 transition-all ${
                  formData.prioridad === 'media' ? 'border-warning text-warning bg-warning/10' : 'border-outline-variant/30 text-on-surface-variant hover:border-warning/50'
                }`}
              >
                Media
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, prioridad: "baja"})}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm border-2 transition-all ${
                  formData.prioridad === 'baja' ? 'border-green-500 text-green-600 bg-green-500/10' : 'border-outline-variant/30 text-on-surface-variant hover:border-green-500/50'
                }`}
              >
                Baja
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant">Tags (Separados por coma)</label>
            <input
              type="text"
              placeholder="proyecto, lectura, urgente..."
              className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 font-semibold rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] h-11 bg-primary text-white font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : "Guardar Tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
