"use client";

import type { Goal, MealPlan, Profile, ProgressLog } from "./types";

const KEYS = {
  profile: "eatplan.profile",
  goal: "eatplan.goal",
  plan: "eatplan.plan",
  progress: "eatplan.progress",
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
  getProfile: () => safeGet<Profile>(KEYS.profile),
  setProfile: (p: Profile) => safeSet(KEYS.profile, p),
  getGoal: () => safeGet<Goal>(KEYS.goal),
  setGoal: (g: Goal) => safeSet(KEYS.goal, g),
  getPlan: () => safeGet<MealPlan>(KEYS.plan),
  setPlan: (p: MealPlan) => safeSet(KEYS.plan, p),
  getProgress: () => safeGet<ProgressLog[]>(KEYS.progress) ?? [],
  appendProgress: (log: ProgressLog) => {
    const cur = safeGet<ProgressLog[]>(KEYS.progress) ?? [];
    cur.push(log);
    cur.sort((a, b) => a.date.localeCompare(b.date));
    safeSet(KEYS.progress, cur);
  },
  clear: () => {
    if (typeof window === "undefined") return;
    Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  },
};
