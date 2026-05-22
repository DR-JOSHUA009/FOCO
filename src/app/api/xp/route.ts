import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { XP_REWARDS, SESSION_XP, ROOM_XP, getLevelForXP } from "@/lib/xp-config";
import { checkRateLimit } from "@/lib/rate-limit";

// ============================================
// FOCOI — XP Mutation API
// Server-side XP computation & persistence
// ============================================

/**
 * POST /api/xp
 * 
 * Handles all XP mutations with:
 * - Server-side computation (never trusts client XP values)
 * - Idempotency via mutation_id (prevents double-counting on retries)
 * - Rate limiting (60 mutations/hour per user)
 * 
 * Body: { mutation_id: string, action: string, entity_id: string, metadata?: object }
 */
export async function POST(req: NextRequest) {
  try {
    // ── Environment check ──
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("MISSING: SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { mutation_id, action, entity_id, metadata } = body;

    // ── Validate required fields ──
    if (!mutation_id || !action || !entity_id) {
      return NextResponse.json(
        { error: "Missing required fields: mutation_id, action, entity_id" },
        { status: 400 }
      );
    }

    // ── Auth ──
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Service Role Client (Bypass RLS) ──
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ── Rate limit (60 XP mutations per hour) ──
    const { allowed } = await checkRateLimit(`xp:${user.id}`, 60, 3600000);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // ── Idempotency check ──
    const { data: existing, error: idempotencyError } = await supabaseAdmin
      .from("xp_mutations")
      .select("id")
      .eq("mutation_id", mutation_id)
      .eq("user_id", user.id)
      .single();

    // If the table doesn't exist yet, skip idempotency (but log)
    if (idempotencyError && idempotencyError.code !== "PGRST116") {
      console.warn("xp_mutations lookup warning:", idempotencyError.message);
    }

    if (existing) {
      const { data: stats } = await supabaseAdmin
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();
      return NextResponse.json({ success: true, duplicate: true, stats });
    }

    let xpEarned = 0;

    switch (action) {
      case "task_complete": {
        const { data: task, error: taskError } = await supabaseAdmin
          .from("tasks")
          .select("id, user_id, prioridad, completada")
          .eq("id", entity_id)
          .single();

        if (taskError || !task) {
          console.error("Task lookup error:", taskError?.message);
          return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }
        if (task.user_id !== user.id) {
          return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }
        if (task.completada) {
          // Already completed — return current stats instead of error
          const { data: stats } = await supabaseAdmin
            .from("user_stats")
            .select("*")
            .eq("user_id", user.id)
            .single();
          return NextResponse.json({ success: true, duplicate: true, stats });
        }

        xpEarned = XP_REWARDS[task.prioridad as keyof typeof XP_REWARDS] || 10;

        const { error: updateTaskError } = await supabaseAdmin
          .from("tasks")
          .update({ completada: true, xp_reward: xpEarned })
          .eq("id", entity_id);

        if (updateTaskError) {
          console.error("Failed to mark task complete:", updateTaskError);
          return NextResponse.json({ error: "Failed to complete task" }, { status: 500 });
        }
        break;
      }

      case "focus_session": {
        const tipo = metadata?.tipo || "profundo";
        xpEarned = SESSION_XP[tipo] || 10;
        break;
      }

      case "room_session": {
        const minutes = Math.max(0, Math.floor(metadata?.minutes || 0));
        if (minutes < ROOM_XP.MIN_MINUTES) {
          return NextResponse.json({ error: `Minimum ${ROOM_XP.MIN_MINUTES} minutes required` }, { status: 400 });
        }
        xpEarned = Math.min(minutes * ROOM_XP.PER_MINUTE, ROOM_XP.MAX_PER_SESSION);
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown action type" }, { status: 400 });
    }

    // ── Record XP mutation (best-effort — table may not exist yet) ──
    const { error: mutationInsertError } = await supabaseAdmin.from("xp_mutations").insert({
      user_id: user.id,
      mutation_id,
      action,
      entity_id,
      xp_earned: xpEarned,
    });
    if (mutationInsertError) {
      console.warn("xp_mutations insert warning (table may not exist):", mutationInsertError.message);
    }

    // ── Update user_stats ──
    const { data: currentStats, error: statsError } = await supabaseAdmin
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (statsError || !currentStats) {
      console.error("user_stats lookup error:", statsError?.message);
      return NextResponse.json({ error: "User stats not found" }, { status: 404 });
    }

    const newXP = currentStats.xp_total + xpEarned;
    const newLevel = getLevelForXP(newXP);

    const updates: Record<string, any> = {
      xp_total: newXP,
      nivel: newLevel.name,
    };
    
    if (action === "task_complete") {
      updates.tareas_completadas = (currentStats.tareas_completadas || 0) + 1;
    }

    const { error: updateError } = await supabaseAdmin
      .from("user_stats")
      .update(updates)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update user_stats:", updateError);
      return NextResponse.json({ error: "Failed to persist XP" }, { status: 500 });
    }

    const { data: updatedStats } = await supabaseAdmin
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      success: true,
      duplicate: false,
      xp_earned: xpEarned,
      stats: updatedStats,
    });

  } catch (error: any) {
    console.error("XP API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/xp
 * Returns the current user's XP stats.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: stats } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!stats) {
      return NextResponse.json({ error: "Stats not found" }, { status: 404 });
    }

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error("XP GET Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
