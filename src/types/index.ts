// ============================================
// FOCOI — Core Type Definitions
// ============================================

export interface User {
  id: string;
  email: string;
  nombre: string;
  avatar_url: string | null;
  created_at: string;
}

export type TaskPriority = "alta" | "media" | "baja";

export interface Task {
  id: string;
  user_id: string;
  titulo: string;
  descripcion: string;
  materia: string;
  prioridad: TaskPriority;
  completada: boolean;
  fecha_entrega: string;
  xp_reward: number;
  tags: string[];
  created_at: string;
}

export type FocusSessionType = "profundo" | "descanso";

export interface FocusSession {
  id: string;
  user_id: string;
  duracion_minutos: number;
  tipo: FocusSessionType;
  task_id: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  xp_reward: number;
  condicion: string;
}

export interface UserStats {
  user_id: string;
  xp_total: number;
  nivel: number;
  racha_actual: number;
  racha_maxima: number;
  tareas_completadas: number;
  minutos_foco_total: number;
}

export interface Notebook {
  id: string;
  user_id: string;
  nombre: string;
  materia: string;
  contenido_json: Record<string, unknown>;
  updated_at: string;
}
