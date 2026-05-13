"use client";

import type { Goal, MealPlan, Profile, ProgressLog } from "./types";

const KEYS = {
  profiles: "eatplan.profiles",
  goals: "eatplan.goals",
  plan: "eatplan.plan",
  progress: "eatplan.progress",
  weeklyBudget: "eatplan.weeklyBudget",
} as const;

function safeGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const localStore = {
  // ── Profiles ──────────────────────────────────────────────────
  getProfiles: (): Profile[] => safeGet<Profile[]>(KEYS.profiles) ?? [],
  setProfiles: (profiles: Profile[]) => safeSet(KEYS.profiles, profiles),
  getPrimaryProfile: (): Profile | null => {
    return localStore.getProfiles().find((p) => p.id === "primary") ?? null;
  },
  getPartnerProfile: (): Profile | null => {
    return localStore.getProfiles().find((p) => p.id === "partner") ?? null;
  },
  upsertProfile: (profile: Profile) => {
    const existing = localStore.getProfiles().filter((p) => p.id !== profile.id);
    safeSet(KEYS.profiles, [...existing, profile]);
  },
  removePartner: () => {
    const profiles = localStore.getProfiles().filter((p) => p.id !== "partner");
    safeSet(KEYS.profiles, profiles);
    const goals = localStore.getGoals().filter((g) => g.profileId !== "partner");
    safeSet(KEYS.goals, goals);
  },

  // ── Goals ─────────────────────────────────────────────────────
  getGoals: (): Goal[] => safeGet<Goal[]>(KEYS.goals) ?? [],
  getPrimaryGoal: (): Goal | null => {
    return localStore.getGoals().find((g) => g.profileId === "primary") ?? null;
  },
  getPartnerGoal: (): Goal | null => {
    return localStore.getGoals().find((g) => g.profileId === "partner") ?? null;
  },
  upsertGoal: (goal: Goal) => {
    const existing = localStore.getGoals().filter((g) => g.profileId !== goal.profileId);
    safeSet(KEYS.goals, [...existing, goal]);
  },

  // ── Meal Plan ─────────────────────────────────────────────────
  getPlan: () => safeGet<MealPlan>(KEYS.plan),
  setPlan: (p: MealPlan) => safeSet(KEYS.plan, p),

  // ── Weekly Budget ─────────────────────────────────────────────
  getWeeklyBudget: (): number => safeGet<number>(KEYS.weeklyBudget) ?? 1200,
  setWeeklyBudget: (n: number) => safeSet(KEYS.weeklyBudget, n),

  // ── Progress ─────────────────────────────────────────────────
  getProgress: (): ProgressLog[] => safeGet<ProgressLog[]>(KEYS.progress) ?? [],
  appendProgress: (log: ProgressLog) => {
    const cur = localStore.getProgress().filter(
      (l) => !(l.date === log.date && l.profileId === log.profileId),
    );
    cur.push(log);
    cur.sort((a, b) => a.date.localeCompare(b.date));
    safeSet(KEYS.progress, cur);
  },

  clear: () => {
    if (typeof window === "undefined") return;
    Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  },
};
