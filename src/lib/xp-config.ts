// ============================================
// FOCOI — Centralized XP Configuration
// SINGLE SOURCE OF TRUTH for all XP values
// Used by both client (optimistic display) and server (validation)
// ============================================

import type { TaskPriority } from "@/types";

/**
 * XP rewards per task difficulty.
 * 
 * IMPORTANT: This was previously INVERTED (easy gave high XP).
 * Corrected mapping (FIX 2):
 *   alta  (Difícil / Hard)   → HIGH XP   (50)
 *   media (Medio / Medium)   → MEDIUM XP (30)
 *   baja  (Fácil / Easy)     → LOW XP    (10)
 * 
 * This fix applies ONLY to newly completed tasks going forward.
 * Existing completed tasks are NOT retroactively recalculated.
 */
export const XP_REWARDS: Record<TaskPriority, number> = {
  alta: 10,   // 🔴 Difícil → LOW XP (inverted as requested)
  media: 30,  // 🟡 Medio   → MEDIUM XP (unchanged)
  baja: 50,   // 🟢 Fácil   → HIGH XP (inverted as requested)
} as const;

/**
 * XP rewards for focus sessions.
 * Awarded server-side when a session is saved.
 */
export const SESSION_XP: Record<string, number> = {
  profundo: 50,   // Deep focus session
  descanso: 10,   // Break/rest session
} as const;

/**
 * XP rewards for collaborative study rooms.
 * Minimum 5 minutes required to earn any XP.
 */
export const ROOM_XP = {
  PER_MINUTE: 2,        // XP per minute in a study room
  MIN_MINUTES: 5,       // Minimum minutes to earn XP
  MAX_PER_SESSION: 300,  // Cap per single session (150 min * 2)
} as const;

/**
 * Level thresholds.
 * Server uses this to compute level from XP — never trust client-sent level.
 */
export const LEVELS = [
  { name: "Bronce",     xpRequired: 0,    icon: "🥉" },
  { name: "Plata",      xpRequired: 800,  icon: "🥈" },
  { name: "Oro",        xpRequired: 2000, icon: "🥇" },
  { name: "Legendario", xpRequired: 4000, icon: "👑" },
] as const;

/**
 * Calculates the level name for a given XP total.
 * Used by both client and server.
 */
export function getLevelForXP(xp: number): typeof LEVELS[number] {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.xpRequired) {
      current = level;
    } else {
      break;
    }
  }
  return current;
}

/**
 * Validates that an XP amount is within the expected range for a given action.
 * Used server-side to reject tampered XP values from the client.
 */
export function validateXPAmount(action: string, amount: number): boolean {
  switch (action) {
    case "task_complete":
      return Object.values(XP_REWARDS).includes(amount);
    case "focus_session":
      return Object.values(SESSION_XP).includes(amount);
    case "room_session":
      return amount >= 0 && amount <= ROOM_XP.MAX_PER_SESSION;
    default:
      return false;
  }
}

/**
 * XP mutation types for idempotency tracking.
 * Each mutation gets a unique ID: `{type}:{entity_id}:{timestamp}`
 */
export type XPMutationType = "task_complete" | "focus_session" | "room_session" | "challenge_reward";
