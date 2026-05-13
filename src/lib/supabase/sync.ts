"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { localStore } from "@/lib/storage";

/**
 * Push all localStorage data to Supabase for the authenticated user.
 * Existing rows are upserted (last-write wins on the server).
 */
export async function pushToSupabase(supabase: SupabaseClient): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const primaryProfile = localStore.getPrimaryProfile();
  const primaryGoal = localStore.getPrimaryGoal();

  // ── profiles ──────────────────────────────────────────────────
  if (primaryProfile) {
    await supabase.from("profiles").upsert({
      user_id: user.id,
      name: primaryProfile.name,
      sex: primaryProfile.sex,
      age: primaryProfile.age,
      height_cm: primaryProfile.heightCm,
      activity_level: primaryProfile.activityLevel,
      restrictions: primaryProfile.restrictions,
      equipment: primaryProfile.equipment,
      disliked_ingredients: primaryProfile.dislikedIngredients,
      partner_profile: localStore.getPartnerProfile() ?? null,
      weekly_budget_twd: localStore.getWeeklyBudget(),
      updated_at: new Date().toISOString(),
    });
  }

  // ── goals ──────────────────────────────────────────────────────
  if (primaryGoal) {
    await supabase.from("goals").upsert({
      user_id: user.id,
      current_weight_kg: primaryGoal.currentWeightKg,
      current_body_fat_pct: primaryGoal.currentBodyFatPct,
      target_weight_kg: primaryGoal.targetWeightKg,
      target_body_fat_pct: primaryGoal.targetBodyFatPct,
      target_date: primaryGoal.targetDate,
      description: primaryGoal.description ?? null,
      current_phase: primaryGoal.currentPhase,
      phase_weeks: primaryGoal.phaseWeeks,
      partner_goal: localStore.getPartnerGoal() ?? null,
      updated_at: new Date().toISOString(),
    });
  }

  // ── progress_logs ─────────────────────────────────────────────
  const logs = localStore.getProgress();
  if (logs.length > 0) {
    await supabase.from("progress_logs").upsert(
      logs.map((l) => ({
        user_id: user.id,
        log_date: l.date,
        profile_id: l.profileId,
        weight_kg: l.weightKg,
        body_fat_pct: l.bodyFatPct ?? null,
        note: l.note ?? null,
      })),
      { onConflict: "user_id,log_date,profile_id" },
    );
  }
}

/**
 * Pull data from Supabase and merge into localStorage.
 * Server data takes precedence for profile/goals; progress logs are merged.
 */
export async function pullFromSupabase(supabase: SupabaseClient): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // ── profiles ──────────────────────────────────────────────────
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profileRow) {
    localStore.upsertProfile({
      id: "primary",
      name: profileRow.name ?? "",
      sex: profileRow.sex,
      age: profileRow.age,
      heightCm: profileRow.height_cm,
      activityLevel: profileRow.activity_level,
      restrictions: profileRow.restrictions ?? [],
      equipment: profileRow.equipment ?? [],
      dislikedIngredients: profileRow.disliked_ingredients ?? [],
    });
    if (profileRow.partner_profile) {
      localStore.upsertProfile({ id: "partner", ...profileRow.partner_profile });
    }
    if (profileRow.weekly_budget_twd) {
      localStore.setWeeklyBudget(profileRow.weekly_budget_twd);
    }
  }

  // ── goals ──────────────────────────────────────────────────────
  const { data: goalRow } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (goalRow) {
    localStore.upsertGoal({
      profileId: "primary",
      currentWeightKg: goalRow.current_weight_kg,
      currentBodyFatPct: goalRow.current_body_fat_pct,
      targetWeightKg: goalRow.target_weight_kg,
      targetBodyFatPct: goalRow.target_body_fat_pct,
      targetDate: goalRow.target_date,
      description: goalRow.description ?? undefined,
      currentPhase: goalRow.current_phase ?? 0,
      phaseWeeks: goalRow.phase_weeks ?? 4,
    });
    if (goalRow.partner_goal) {
      localStore.upsertGoal({ profileId: "partner", ...goalRow.partner_goal });
    }
  }

  // ── progress_logs ─────────────────────────────────────────────
  const { data: logRows } = await supabase
    .from("progress_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("log_date", { ascending: true });

  if (logRows) {
    for (const row of logRows) {
      localStore.appendProgress({
        date: row.log_date,
        profileId: row.profile_id ?? "primary",
        weightKg: row.weight_kg,
        bodyFatPct: row.body_fat_pct ?? undefined,
        note: row.note ?? undefined,
      });
    }
  }
}
