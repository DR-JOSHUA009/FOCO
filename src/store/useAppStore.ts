import { create } from "zustand";
import type { User, UserStats, Task } from "@/types";
import { getLevelForXP, XP_REWARDS } from "@/lib/xp-config";
import type { TaskPriority } from "@/types";

// ============================================
// FOCOI — Global App Store (Zustand)
// 
// XP PERSISTENCE (FIX 1):
// - On load: hydrate from server via GET /api/xp
// - On mutation: optimistic update → POST /api/xp → confirm or rollback
// - Offline: queue mutations in memory, sync when online
// ============================================

/** Pending XP mutation for offline queue */
interface PendingXPMutation {
  mutation_id: string;
  action: string;
  entity_id: string;
  metadata?: Record<string, any>;
  optimistic_xp: number;
  timestamp: number;
}

interface AppState {
  // --- State ---
  user: User | null;
  userStats: UserStats | null;
  tasks: Task[];
  isLoading: boolean;
  isSyncing: boolean;
  pendingMutations: PendingXPMutation[];

  // --- Actions ---
  setUser: (user: User | null) => void;
  setUserStats: (stats: UserStats | null) => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  setLoading: (loading: boolean) => void;

  // --- XP Actions (FIX 1) ---
  /** Hydrate stats from server — call on app load/resume */
  hydrateFromServer: () => Promise<void>;
  /** 
   * Submit an XP mutation with optimistic UI.
   * Updates local state immediately, then confirms via server.
   * On failure: rolls back the optimistic update.
   */
  submitXPMutation: (
    action: string,
    entity_id: string,
    optimistic_xp: number,
    metadata?: Record<string, any>
  ) => Promise<{ success: boolean; xp_earned?: number }>;
  /** Process any pending offline mutations */
  syncPendingMutations: () => Promise<void>;
}

/**
 * Generates a unique, idempotent mutation ID.
 * Format: {action}:{entity_id}:{timestamp}
 * This ensures retries don't double-count XP.
 */
function generateMutationId(action: string, entity_id: string): string {
  return `${action}:${entity_id}:${Date.now()}`;
}

export const useAppStore = create<AppState>((set, get) => ({
  // --- Initial State ---
  user: null,
  userStats: null,
  tasks: [],
  isLoading: false,
  isSyncing: false,
  pendingMutations: [],

  // --- Basic Actions ---
  setUser: (user) => set({ user }),
  setUserStats: (userStats) => set({ userStats }),
  setTasks: (tasks) => set({ tasks }),

  addTask: (task) =>
    set((state) => ({ tasks: [task, ...state.tasks] })),

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

  setLoading: (isLoading) => set({ isLoading }),

  // --- XP Actions (FIX 1) ---

  hydrateFromServer: async () => {
    try {
      const response = await fetch("/api/xp", { credentials: "include" });
      if (!response.ok) return;
      
      const { stats } = await response.json();
      if (stats) {
        set({ userStats: stats });
      }
    } catch (error) {
      // Network error — keep existing local state
      console.warn("Failed to hydrate XP from server:", error);
    }
  },

  submitXPMutation: async (action, entity_id, optimistic_xp, metadata) => {
    const mutation_id = generateMutationId(action, entity_id);
    const state = get();
    const prevStats = state.userStats;

    // ── Optimistic update ──
    if (prevStats) {
      const newXP = prevStats.xp_total + optimistic_xp;
      const newLevel = getLevelForXP(newXP);
      set({
        userStats: {
          ...prevStats,
          xp_total: newXP,
          nivel: newLevel.name,
          tareas_completadas: action === "task_complete"
            ? (prevStats.tareas_completadas || 0) + 1
            : prevStats.tareas_completadas,
        },
      });
    }

    // ── Send to server ──
    try {
      const response = await fetch("/api/xp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mutation_id, action, entity_id, metadata }),
      });

      if (!response.ok) {
        // Server rejected — rollback optimistic update
        if (prevStats) set({ userStats: prevStats });
        return { success: false };
      }

      const data = await response.json();

      // Server is the source of truth — apply server stats
      if (data.stats) {
        set({ userStats: data.stats });
      }

      return { success: true, xp_earned: data.xp_earned };
    } catch (error) {
      // ── Offline: queue for later sync ──
      console.warn("XP mutation failed (offline?), queuing:", error);
      set((state) => ({
        isSyncing: true,
        pendingMutations: [
          ...state.pendingMutations,
          { mutation_id, action, entity_id, metadata, optimistic_xp, timestamp: Date.now() },
        ],
      }));

      // Keep the optimistic update — will be confirmed or rolled back on sync
      return { success: true, xp_earned: optimistic_xp };
    }
  },

  syncPendingMutations: async () => {
    const state = get();
    if (state.pendingMutations.length === 0) {
      set({ isSyncing: false });
      return;
    }

    set({ isSyncing: true });

    const remaining: PendingXPMutation[] = [];

    for (const mutation of state.pendingMutations) {
      try {
        const response = await fetch("/api/xp", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mutation_id: mutation.mutation_id,
            action: mutation.action,
            entity_id: mutation.entity_id,
            metadata: mutation.metadata,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Apply latest server stats
          if (data.stats) {
            set({ userStats: data.stats });
          }
        } else {
          // Keep in queue for next sync attempt
          remaining.push(mutation);
        }
      } catch {
        // Still offline — keep in queue
        remaining.push(mutation);
      }
    }

    set({
      pendingMutations: remaining,
      isSyncing: remaining.length > 0,
    });
  },
}));
