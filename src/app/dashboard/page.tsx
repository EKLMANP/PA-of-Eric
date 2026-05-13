"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { computeHouseholdTargets } from "@/lib/nutrition";
import { checkProgressFeedback } from "@/lib/feedback";
import { localStore } from "@/lib/storage";
import type { AdjustmentRecommendation, HouseholdTargets } from "@/lib/types";

export default function DashboardPage() {
  const [targets, setTargets] = useState<HouseholdTargets | null>(null);
  const [adjustment, setAdjustment] = useState<AdjustmentRecommendation | null>(null);
  const [phaseInfo, setPhaseInfo] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    const primary = localStore.getPrimaryProfile();
    const primaryGoal = localStore.getPrimaryGoal();
    if (!primary || !primaryGoal) return;

    const partner = localStore.getPartnerProfile();
    const partnerGoal = localStore.getPartnerGoal();

    const t = computeHouseholdTargets({
      primaryProfile: primary,
      primaryGoal,
      partnerProfile: partner ?? undefined,
      partnerGoal: partnerGoal ?? undefined,
    });
    setTargets(t);

    // Phase info from current goal
    const totalPhases = Math.ceil(
      (new Date(primaryGoal.targetDate).getTime() - Date.now()) /
        (primaryGoal.phaseWeeks * 7 * 86_400_000),
    );
    setPhaseInfo({
      current: primaryGoal.currentPhase + 1,
      total: Math.max(1, totalPhases + primaryGoal.currentPhase),
    });

    // Progress feedback
    const logs = localStore.getProgress();
    const adj = checkProgressFeedback(logs, primaryGoal, t.primary.weeklyDeltaKg);
    setAdjustment(adj);
  }, []);

  if (!targets) {
    return (
      <Card className="text-center space-y-3">
        <h2 className="font-semibold">尚未設定個人資料</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">先填寫個人資料與目標，才能產出計畫。</p>
        <Link href="/onboarding"
          className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-white text-sm">
          前往設定
        </Link>
      </Card>
    );
  }

  const { primary, partner } = targets;

  const feasibilityBadge = {
    safe:       { text: "目標可行", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
    aggressive: { text: "目標積極", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
    infeasible: { text: "需調整時程", cls: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200" },
  }[primary.feasibility];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">總覽</h1>
        <div className="flex items-center gap-2">
          {phaseInfo && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-800">
              第 {phaseInfo.current} / {phaseInfo.total} 個月
            </span>
          )}
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${feasibilityBadge.cls}`}>
            {feasibilityBadge.text}
          </span>
        </div>
      </div>

      {/* Adjustment alert */}
      {adjustment && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
          <p className="font-semibold text-amber-900 dark:text-amber-100">⚠ 進度提醒</p>
          <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">{adjustment.reason}</p>
        </Card>
      )}

      {/* Feasibility notes */}
      {primary.notes.length > 0 && (
        <Card className="space-y-1 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <ul className="ml-4 list-disc space-y-1 text-sm text-amber-900 dark:text-amber-100">
            {primary.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </Card>
      )}

      {/* Household summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="兩人每日總熱量目標" value={targets.totalDailyCalories} unit="kcal" />
        <StatCard label="午晚餐熱量（菜單覆蓋）" value={targets.totalLunchDinnerCalories} unit="kcal" />
        <StatCard label="本週蛋白質目標（午晚餐）" value={targets.weeklyProteinG} unit="g" />
        <StatCard
          label="目標型態"
          value={{ cut: "減脂", maintain: "維持", bulk: "增肌" }[primary.goalType]}
          unit=""
        />
      </div>

      {/* Per-person breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <PersonCard title={`主要使用者`} t={primary} />
        {partner && <PersonCard title={`同伴`} t={partner} />}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/plan" className="rounded-lg bg-brand-600 px-4 py-2 text-white text-sm">
          產生本週菜單
        </Link>
        <Link href="/progress" className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
          記錄今日體重
        </Link>
        <Link href="/onboarding" className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
          修改個人資料
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit: string;
}) {
  return (
    <Card>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit && <span className="ml-1 text-sm font-normal text-gray-500">{unit}</span>}
      </p>
    </Card>
  );
}

function PersonCard({ title, t }: { title: string; t: import("@/lib/types").NutritionTargets }) {
  return (
    <Card className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <span className="text-gray-500">TDEE</span>
        <span className="font-medium text-right">{t.tdee.toLocaleString()} kcal</span>
        <span className="text-gray-500">每日目標</span>
        <span className="font-medium text-right">{t.dailyCalories.toLocaleString()} kcal</span>
        <span className="text-gray-500">瘦肉量 (LBM)</span>
        <span className="font-medium text-right">{t.lbmKg} kg</span>
        <span className="text-gray-500">蛋白質</span>
        <span className="font-medium text-right">{t.proteinG} g</span>
        <span className="text-gray-500">碳水</span>
        <span className="font-medium text-right">{t.carbG} g</span>
        <span className="text-gray-500">脂肪</span>
        <span className="font-medium text-right">{t.fatG} g</span>
        <span className="text-gray-500">每週目標體重變化</span>
        <span className="font-medium text-right">
          {t.weeklyDeltaKg > 0 ? "+" : ""}{t.weeklyDeltaKg} kg
        </span>
      </div>
    </Card>
  );
}
