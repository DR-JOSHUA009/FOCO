"use client";

import { Task } from "@/types";
import { XP_REWARDS } from "@/lib/xp-config";
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

/**
 * TaskItem — Single task card
 *
 * FIX 1: Uses submitXPMutation for optimistic XP + server persistence
 * FIX 2: Uses XP_REWARDS from centralized config (alta=50, media=30, baja=10)
 */
export default function TaskItem({ task, onUpdate, onDelete, onEdit }: TaskItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const supabase = createClient();
  const { submitXPMutation } = useAppStore();

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Hoy";
    if (isTomorrow(d)) return "Mañana";
    const diff = differenceInDays(d, new Date());
    if (diff > 1 && diff <= 3) return `En ${diff} días`;
    return format(d, "d MMM, yy", { locale: es });
  };

  // FIX 2: Priority colors using Academic Clarity palette
  const priorityColor = task.prioridad === 'alta'
    ? 'bg-error text-white'
    : task.prioridad === 'media'
      ? 'bg-tertiary text-neutral'
      : 'bg-primary text-neutral';

  // FIX 2: XP reward from centralized config (not from task.xp_reward which may be stale)
  const displayXP = task.completada ? task.xp_reward : XP_REWARDS[task.prioridad];

  const handleComplete = async () => {
    if (task.completada || isCompleting) return;
    setIsCompleting(true);

    // Optimistic UI update — mark task as completed immediately
    const expectedXP = XP_REWARDS[task.prioridad];
    onUpdate({ ...task, completada: true, xp_reward: expectedXP });

    // FIX 1: Submit XP via server API (idempotent, server-computed)
    const result = await submitXPMutation(
      "task_complete",
      task.id,
      expectedXP, // optimistic amount for instant UI feedback
    );

    if (result.success) {
      toast.success(`¡+${result.xp_earned || expectedXP} XP ganados! 🎉`);
    } else {
      // Rollback optimistic update
      toast.error("Error al completar la tarea");
      onUpdate(task);
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
    <div className={`group flex items-center gap-4 bg-surface-container-lowest p-4 rounded-ac-card border border-outline-variant/30 shadow-card hover:shadow-soft transition-all ${task.completada ? 'opacity-60 bg-surface-container-low' : ''}`}>
      {/* Priority dot */}
      <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${task.completada ? 'bg-outline-variant' : priorityColor}`}></div>

      {/* Complete checkbox */}
      <button
        onClick={handleComplete}
        disabled={task.completada || isCompleting}
        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors touch-target ${
          task.completada
            ? 'bg-primary border-primary text-on-primary'
            : 'border-outline-variant/50 hover:border-primary text-transparent hover:text-primary/40'
        }`}
      >
        <Check size={14} className="stroke-[3]" />
      </button>

      {/* Task info */}
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
        <h3 className={`font-semibold text-on-surface truncate flex-1 ${task.completada ? 'line-through' : ''}`}>
          {task.titulo}
        </h3>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold tracking-wider uppercase bg-surface-container-highest text-on-surface-variant px-2 py-0.5 rounded-ac-chip max-w-[120px] truncate">
            {task.materia}
          </span>
          <span className={`text-[12px] font-medium w-20 text-right ${isToday(new Date(task.fecha_entrega)) && !task.completada ? 'text-error font-bold' : 'text-on-surface-variant'}`}>
            {getDateLabel(task.fecha_entrega)}
          </span>
        </div>
      </div>

      {/* Tags (desktop only) */}
      <div className="hidden lg:flex gap-1.5 flex-wrap flex-shrink-0 w-[180px] justify-end">
        {task.tags && task.tags.map(tag => (
          <span key={tag} className="text-[10px] uppercase font-bold tracking-wider border border-outline-variant/30 text-on-surface-variant px-1.5 py-0.5 rounded-ac-chip truncate max-w-[60px]">
            #{tag}
          </span>
        ))}
      </div>

      {/* XP Badge — FIX 2: Shows correct XP from centralized config */}
      <div className="flex-shrink-0 bg-tertiary/15 text-tertiary-dark font-bold text-xs px-2.5 py-1 rounded-ac-chip border border-tertiary/20">
        +{displayXP} XP
      </div>

      {/* Context menu */}
      <div className="relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          onBlur={() => setTimeout(() => setIsMenuOpen(false), 200)}
          className="p-2 rounded-ac-chip text-on-surface-variant hover:bg-surface-container transition-colors touch-target"
        >
          <MoreVertical size={18} />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-surface-container-lowest rounded-ac-btn shadow-lg border border-outline-variant/30 overflow-hidden z-10 py-1">
            <button
              onClick={() => onEdit(task)}
              className="w-full px-4 py-2 text-sm text-left flex items-center gap-2 hover:bg-surface-container transition-colors touch-target"
            >
              <Edit2 size={14} /> Editar
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-sm text-left flex items-center gap-2 text-error hover:bg-error-container/20 transition-colors touch-target"
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
