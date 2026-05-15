import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import toast from "react-hot-toast";
import { Task } from "@/types";

interface TaskModalProps {
  onClose: () => void;
  taskToEdit?: Task;
  userSubjects?: string[];
  onSuccess?: (task: Task) => void;
}

export default function TaskModal({ onClose, taskToEdit, userSubjects = [], onSuccess }: TaskModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAppStore();
  const supabase = createClient();

  const formatDateForInput = (isoString?: string) => {
    if (!isoString) return new Date().toISOString().slice(0, 16);
    return new Date(isoString).toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    titulo: taskToEdit?.titulo || "",
    descripcion: taskToEdit?.descripcion || "",
    materia: taskToEdit?.materia || "",
    prioridad: (taskToEdit?.prioridad || "media") as "alta" | "media" | "baja",
    fecha_entrega: formatDateForInput(taskToEdit?.fecha_entrega),
  });

  const [tags, setTags] = useState<string[]>(taskToEdit?.tags || []);
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const val = tagInput.trim().toLowerCase();
      if (!tags.includes(val)) setTags([...tags, val]);
      setTagInput("");
    }
  };

  const removeTag = (t: string) => setTags(tags.filter(tag => tag !== t));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.titulo || !formData.materia) {
      toast.error("El título y la materia son obligatorios.");
      return;
    }

    setIsLoading(true);

    const xpReward = formData.prioridad === 'alta' ? 50 : formData.prioridad === 'media' ? 30 : 15;
    const fechaUTC = new Date(formData.fecha_entrega).toISOString();

    const payload = {
      user_id: user.id,
      titulo: formData.titulo,
      descripcion: formData.descripcion,
      materia: formData.materia,
      prioridad: formData.prioridad,
      fecha_entrega: fechaUTC,
      xp_reward: xpReward,
      tags: tags,
    };

    let resultError;
    let resultData;

    if (taskToEdit) {
      const { error, data } = await supabase.from("tasks").update(payload).eq("id", taskToEdit.id).select().single();
      resultError = error;
      resultData = data;
    } else {
      const { error, data } = await supabase.from("tasks").insert({ ...payload, completada: false }).select().single();
      resultError = error;
      resultData = data;
    }

    if (resultError) {
      toast.error(`Error al ${taskToEdit ? 'actualizar' : 'crear'} tarea: ` + resultError.message);
    } else {
      toast.success(`Tarea ${taskToEdit ? 'actualizada' : 'creada'} exitosamente`);
      if (onSuccess && resultData) onSuccess(resultData);
      onClose();
    }
    
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-slide-up">
        <div className="flex justify-between items-center p-6 border-b border-outline-variant/30">
          <h2 className="text-xl font-bold text-on-surface">{taskToEdit ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-md hover:bg-surface">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant">Título *</label>
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
            <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant">Descripción</label>
            <textarea
              placeholder="Detalles adicionales..."
              className="w-full h-24 p-4 border border-outline-variant/60 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-sm"
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant">Materia *</label>
              <input
                type="text"
                list="subjects-list"
                placeholder="Ej: Matemáticas"
                className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={formData.materia}
                onChange={(e) => setFormData({...formData, materia: e.target.value})}
                required
              />
              <datalist id="subjects-list">
                {userSubjects.map(sub => <option key={sub} value={sub} />)}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant">Fecha y hora de entrega *</label>
              <input
                type="datetime-local"
                className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={formData.fecha_entrega}
                onChange={(e) => setFormData({...formData, fecha_entrega: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant flex justify-between">
              <span>Prioridad</span>
              <span className="text-primary normal-case">XP Base: {formData.prioridad === 'alta' ? 50 : formData.prioridad === 'media' ? 30 : 15}</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({...formData, prioridad: "alta"})}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm border-2 transition-all ${
                  formData.prioridad === 'alta' ? 'border-[#ef4444] text-[#ef4444] bg-[#ef4444]/10' : 'border-outline-variant/30 text-on-surface-variant hover:border-[#ef4444]/50'
                }`}
              >
                🔴 Alta
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, prioridad: "media"})}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm border-2 transition-all ${
                  formData.prioridad === 'media' ? 'border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10' : 'border-outline-variant/30 text-on-surface-variant hover:border-[#f59e0b]/50'
                }`}
              >
                🟡 Media
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, prioridad: "baja"})}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm border-2 transition-all ${
                  formData.prioridad === 'baja' ? 'border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10' : 'border-outline-variant/30 text-on-surface-variant hover:border-[#22c55e]/50'
                }`}
              >
                🟢 Baja
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold tracking-wide uppercase text-on-surface-variant">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <div key={tag} className="flex items-center gap-1 bg-surface-container-high text-on-surface px-2 py-1 rounded-md text-sm border border-outline-variant/30">
                  <span>#{tag}</span>
                  <button type="button" onClick={() => removeTag(tag)} className="text-on-surface-variant hover:text-error"><X size={14}/></button>
                </div>
              ))}
            </div>
            <input
              type="text"
              placeholder="Escribe y presiona Enter..."
              className="w-full h-11 px-4 border border-outline-variant/60 rounded-xl bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
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
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : taskToEdit ? "Actualizar Tarea" : "Guardar Tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
