"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { computeNutritionTargets } from "@/lib/nutrition";
import { localStore } from "@/lib/storage";
import type { Goal, NutritionTargets, Profile } from "@/lib/types";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);

  useEffect(() => {
    const p = localStore.getProfile();
    const g = localStore.getGoal();
    setProfile(p);
    setGoal(g);
    if (p && g) setTargets(computeNutritionTargets(p, g));
  }, []);

  if (!profile || !goal) {
    return (
      <Card className="text-center space-y-3">
        <h2 className="font-semibold">尚未設定個人資料</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">先填寫個人資料與目標，才能產出計畫。</p>
        <Link
          href="/onboarding"
          className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-white text-sm"
        >
          前往設定
        </Link>
      </Card>
    );
  }

  if (!targets) return null;

  const feasibilityLabel = {
    safe: { text: "可行", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
    aggressive: { text: "積極", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
    infeasible: { text: "需調整", className: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200" },
  }[targets.feasibility];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">總覽</h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${feasibilityLabel.className}`}>
          目標 {feasibilityLabel.text}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-gray-500">每日 TDEE</p>
          <p className="mt-1 text-2xl font-bold">{targets.tdee}<span className="ml-1 text-sm font-normal text-gray-500">kcal</span></p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">每日攝取目標</p>
          <p className="mt-1 text-2xl font-bold">{targets.dailyCalories}<span className="ml-1 text-sm font-normal text-gray-500">kcal</span></p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">每週體重變化</p>
          <p className="mt-1 text-2xl font-bold">{targets.weeklyDeltaKg > 0 ? "+" : ""}{targets.weeklyDeltaKg}<span className="ml-1 text-sm font-normal text-gray-500">kg</span></p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">目標型態</p>
          <p className="mt-1 text-2xl font-bold">
            {targets.goalType === "cut" ? "減脂" : targets.goalType === "bulk" ? "增肌" : "維持"}
          </p>
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">三大營養素</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Macro label="蛋白質" value={targets.proteinG} unit="g" color="bg-rose-500" />
          <Macro label="碳水化合物" value={targets.carbG} unit="g" color="bg-amber-500" />
          <Macro label="脂肪" value={targets.fatG} unit="g" color="bg-sky-500" />
        </div>
      </Card>

      {targets.notes.length > 0 && (
        <Card className="space-y-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">提醒</h3>
          <ul className="ml-5 list-disc space-y-1 text-sm text-amber-900 dark:text-amber-100">
            {targets.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/plan"
          className="rounded-lg bg-brand-600 px-4 py-2 text-white text-sm"
        >
          產生本週菜單
        </Link>
        <Link
          href="/progress"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
        >
          記錄今日體重
        </Link>
      </div>
    </div>
  );
}

function Macro({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{value} {unit}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={`${color} h-full`} style={{ width: "70%" }} />
      </div>
    </div>
  );
}
