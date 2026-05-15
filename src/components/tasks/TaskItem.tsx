import { Task } from "@/types";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { MoreVertical, Check, Trash2, Edit2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useAppStore } from "@/store/useAppStore";

interface TaskItemProps {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

export default function TaskItem({ task, onUpdate, onDelete, onEdit }: TaskItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const supabase = createClient();
  const { userStats, setUserStats } = useAppStore();

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Hoy";
    if (isTomorrow(d)) return "Mañana";
    const diff = differenceInDays(d, new Date());
    if (diff > 1 && diff <= 3) return `En ${diff} días`;
    return format(d, "d MMM, yy", { locale: es });
  };

  const priorityColor = task.prioridad === 'alta' ? 'bg-[#ef4444]' : task.prioridad === 'media' ? 'bg-[#f59e0b]' : 'bg-[#22c55e]';

  const handleComplete = async () => {
    if (task.completada || isCompleting) return;
    setIsCompleting(true);
    
    // Optimistic update
    onUpdate({ ...task, completada: true });
    
    const { error } = await supabase.from("tasks").update({ 
      completada: true 
    }).eq("id", task.id);

    if (error) {
      toast.error("Error al completar la tarea");
      onUpdate(task); // revert on error
    } else {
      toast.success(`¡+${task.xp_reward} XP ganados! 🎉`);
      if (userStats) {
        setUserStats({
          ...userStats,
          xp_total: userStats.xp_total + task.xp_reward,
          tareas_completadas: userStats.tareas_completadas + 1
        });
      }
    }
    setIsCompleting(false);
  };

  const handleDelete = async () => {
    if (confirm("¿Seguro que quieres eliminar esta tarea?")) {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (!error) {
        toast.success("Tarea eliminada");
        onDelete(task.id);
      }
    }
  };

  return (
    <div className={`group flex items-center gap-4 bg-white p-4 rounded-xl border border-outline-variant/30 shadow-sm hover:shadow-md transition-all ${task.completada ? 'opacity-60 bg-surface-container-low' : ''}`}>
      <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${task.completada ? 'bg-outline-variant' : priorityColor}`}></div>
      
      <button 
        onClick={handleComplete}
        disabled={task.completada || isCompleting}
        className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          task.completada ? 'bg-primary border-primary text-white' : 'border-outline-variant/50 hover:border-primary text-transparent hover:text-primary/40'
        }`}
      >
        <Check size={14} className="stroke-[3]" />
      </button>

      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
        <h3 className={`font-semibold text-on-surface truncate flex-1 ${task.completada ? 'line-through' : ''}`}>
          {task.titulo}
        </h3>
        
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold tracking-wider uppercase bg-surface-container-highest text-on-surface-variant px-2 py-0.5 rounded max-w-[120px] truncate">
            {task.materia}
          </span>
          <span className={`text-[12px] font-medium w-20 text-right ${isToday(new Date(task.fecha_entrega)) && !task.completada ? 'text-error font-bold' : 'text-on-surface-variant'}`}>
            {getDateLabel(task.fecha_entrega)}
          </span>
        </div>
      </div>

      <div className="hidden lg:flex gap-1.5 flex-wrap flex-shrink-0 w-[180px] justify-end">
        {task.tags && task.tags.map(tag => (
          <span key={tag} className="text-[10px] uppercase font-bold tracking-wider border border-outline-variant/30 text-on-surface-variant px-1.5 py-0.5 rounded-md truncate max-w-[60px]">
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex-shrink-0 bg-amber-100 text-amber-700 font-bold text-xs px-2 py-1 rounded-md border border-amber-200">
        +{task.xp_reward} XP
      </div>

      <div className="relative">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          onBlur={() => setTimeout(() => setIsMenuOpen(false), 200)}
          className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <MoreVertical size={18} />
        </button>
        
        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-outline-variant/30 overflow-hidden z-10 py-1">
            <button 
              onClick={() => onEdit(task)}
              className="w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-surface-container transition-colors"
            >
              <Edit2 size={14} /> Editar
            </button>
            <button 
              onClick={handleDelete}
              className="w-full px-4 py-2 text-sm text-left flex items-center gap-2 text-error hover:bg-error-container/20 transition-colors"
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
