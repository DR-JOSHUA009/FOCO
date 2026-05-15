import { create } from "zustand";
import type { User, UserStats, Task } from "@/types";

// ============================================
// FOCOI — Global App Store (Zustand)
// ============================================

interface AppState {
  // --- State ---
  user: User | null;
  userStats: UserStats | null;
  tasks: Task[];
  isLoading: boolean;

  // --- Actions ---
  setUser: (user: User | null) => void;
  setUserStats: (stats: UserStats | null) => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  addXP: (amount: number) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Calcula el nivel basado en XP total.
 * Fórmula: cada nivel requiere 100 * nivel XP adicionales.
 * Nivel 1: 0-99 XP, Nivel 2: 100-299 XP, Nivel 3: 300-599 XP, etc.
 */
function calculateLevel(xp: number): number {
  let level = 1;
  let xpRequired = 0;

  while (xp >= xpRequired + 100 * level) {
    xpRequired += 100 * level;
    level++;
  }

  return level;
}

export const useAppStore = create<AppState>((set) => ({
  // --- Initial State ---
  user: null,
  userStats: null,
  tasks: [],
  isLoading: false,

  // --- Actions ---
  setUser: (user) => set({ user }),

  setUserStats: (userStats) => set({ userStats }),

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks],
    })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      ),
    })),

  deleteTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
    })),

  addXP: (amount) =>
    set((state) => {
      if (!state.userStats) return state;

      const newXP = state.userStats.xp_total + amount;
      const newLevel = calculateLevel(newXP);

      return {
        userStats: {
          ...state.userStats,
          xp_total: newXP,
          nivel: newLevel,
        },
      };
    }),

  setLoading: (isLoading) => set({ isLoading }),
}));
