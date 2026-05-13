"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { computeHouseholdTargets } from "@/lib/nutrition";
import { localStore } from "@/lib/storage";
import type { Goal, HouseholdTargets, ProgressLog } from "@/lib/types";

interface WeekSummary {
  weekIndex: number; // 0-3 within the phase
  weekStart: string; // ISO date
  label: string;     // e.g. "第 1 週"
  isCurrentWeek: boolean;
  hasPlan: boolean;
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay() || 7;
  if (day !== 1) d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addWeeks(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n * 7);
  return result;
}

function buildWeekSummaries(goal: Goal): WeekSummary[] {
  const phaseWeeks = goal.phaseWeeks;
  const today = new Date();
  const currentMonday = mondayOf(today);

  // Phase starts on the Monday of the week that goal was set (approximate from targetDate)
  // We anchor the phase to: today's week minus how many weeks into the phase we are
  // Since we don't store phase start date, we infer from currentPhase + phaseWeeks
  // Treat currentPhase start as: (currentPhase * phaseWeeks) weeks before targetDate
  const targetDate = new Date(goal.targetDate);
  const totalWeeks = Math.max(
    phaseWeeks,
    Math.round(
      (targetDate.getTime() - Date.now()) / (7 * 86_400_000) +
        goal.currentPhase * phaseWeeks,
    ),
  );
  const programStart = addWeeks(mondayOf(targetDate), -totalWeeks);
  const phaseStart = addWeeks(programStart, goal.currentPhase * phaseWeeks);

  return Array.from({ length: phaseWeeks }, (_, i) => {
    const weekStart = addWeeks(phaseStart, i);
    const weekEnd = addWeeks(weekStart, 1);
    return {
      weekIndex: i,
      weekStart: isoDate(weekStart),
      label: `第 ${goal.currentPhase * phaseWeeks + i + 1} 週（Phase ${goal.currentPhase + 1} / 第 ${i + 1} 週）`,
      isCurrentWeek:
        currentMonday >= weekStart && currentMonday < weekEnd,
      hasPlan: false, // set below
    };
  });
}

function progressForPhase(
  logs: ProgressLog[],
  weekSummaries: WeekSummary[],
  profileId: "primary" | "partner",
): { start: number | null; end: number | null; delta: number | null } {
  if (weekSummaries.length === 0) return { start: null, end: null, delta: null };
  const phaseStart = weekSummaries[0].weekStart;
  const phaseEnd = weekSummaries[weekSummaries.length - 1].weekStart;

  const inPhase = logs
    .filter((l) => l.profileId === profileId && l.date >= phaseStart && l.date <= phaseEnd)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (inPhase.length === 0) return { start: null, end: null, delta: null };
  const start = inPhase[0].weightKg;
  const end = inPhase[inPhase.length - 1].weightKg;
  return { start, end, delta: Number((end - start).toFixed(1)) };
}

export default function PhasesPage() {
  const [primaryGoal, setPrimaryGoal] = useState<Goal | null>(null);
  const [partnerGoal, setPartnerGoal] = useState<Goal | null>(null);
  const [targets, setTargets] = useState<HouseholdTargets | null>(null);
  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [advancing, setAdvancing] = useState(false);
  const [advanceDone, setAdvanceDone] = useState(false);

  useEffect(() => {
    const pg = localStore.getPrimaryGoal();
    const ptg = localStore.getPartnerGoal();
    const pp = localStore.getPrimaryProfile();
    const ptp = localStore.getPartnerProfile();
    setPrimaryGoal(pg);
    setPartnerGoal(ptg);
    setLogs(localStore.getProgress());

    if (pg && pp) {
      setTargets(
        computeHouseholdTargets({
          primaryProfile: pp,
          primaryGoal: pg,
          partnerProfile: ptp ?? undefined,
          partnerGoal: ptg ?? undefined,
        }),
      );
      setWeeks(buildWeekSummaries(pg));
    }

    const savedPlan = localStore.getPlan();
    if (savedPlan) {
      setWeeks((prev) =>
        prev.map((w) => ({
          ...w,
          hasPlan: w.isCurrentWeek ? true : w.hasPlan,
        })),
      );
    }
  }, []);

  function advancePhase() {
    if (!primaryGoal) return;
    setAdvancing(true);
    const updated = { ...primaryGoal, currentPhase: primaryGoal.currentPhase + 1 };
    localStore.upsertGoal(updated);
    if (partnerGoal) {
      localStore.upsertGoal({ ...partnerGoal, currentPhase: partnerGoal.currentPhase + 1 });
    }
    setPrimaryGoal(updated);
    setWeeks(buildWeekSummaries(updated));
    setAdvancing(false);
    setAdvanceDone(true);
  }

  if (!primaryGoal || !targets) {
    return (
      <Card className="text-center space-y-3">
        <h2 className="font-semibold">尚未設定目標</h2>
        <Link href="/onboarding"
          className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-white text-sm">
          前往設定
        </Link>
      </Card>
    );
  }

  const { primary, partner } = targets;
  const phaseProgress = progressForPhase(logs, weeks, "primary");
  const partnerProgress = partner ? progressForPhase(logs, weeks, "partner") : null;

  const phaseEndPassed = weeks.length > 0 && new Date() > new Date(weeks[weeks.length - 1].weekStart);
  const expectedPhaseDelta = primary.weeklyDeltaKg * primaryGoal.phaseWeeks;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">月計畫</h1>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">
          Phase {primaryGoal.currentPhase + 1}（每 {primaryGoal.phaseWeeks} 週一輪）
        </span>
      </div>

      {/* Phase targets */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-gray-500">本 Phase 預期體重變化</p>
          <p className="mt-1 text-xl font-bold">
            {expectedPhaseDelta > 0 ? "+" : ""}{expectedPhaseDelta.toFixed(1)} kg
          </p>
          <p className="text-xs text-gray-400">{primary.weeklyDeltaKg} kg/週 × {primaryGoal.phaseWeeks} 週</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">本 Phase 實際變化（我）</p>
          <p className={`mt-1 text-xl font-bold ${
            phaseProgress.delta !== null
              ? phaseProgress.delta < 0 ? "text-emerald-600" : "text-rose-500"
              : ""}`}>
            {phaseProgress.delta !== null
              ? `${phaseProgress.delta > 0 ? "+" : ""}${phaseProgress.delta} kg`
              : "尚無紀錄"}
          </p>
        </Card>
        {partnerProgress && (
          <Card>
            <p className="text-sm text-gray-500">本 Phase 實際變化（同伴）</p>
            <p className={`mt-1 text-xl font-bold ${
              partnerProgress.delta !== null
                ? partnerProgress.delta < 0 ? "text-emerald-600" : "text-rose-500"
                : ""}`}>
              {partnerProgress.delta !== null
                ? `${partnerProgress.delta > 0 ? "+" : ""}${partnerProgress.delta} kg`
                : "尚無紀錄"}
            </p>
          </Card>
        )}
      </div>

      {/* 4-week timeline */}
      <Card className="space-y-3">
        <h2 className="font-semibold">本 Phase 四週時程</h2>
        <div className="space-y-2">
          {weeks.map((w) => (
            <div key={w.weekIndex}
              className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
                w.isCurrentWeek
                  ? "border-brand-400 bg-brand-50 dark:bg-brand-900/20"
                  : "border-gray-200 dark:border-gray-800"}`}>
              <div>
                <p className="text-sm font-medium">{w.label}</p>
                <p className="text-xs text-gray-500">{w.weekStart}</p>
              </div>
              <div className="flex items-center gap-2">
                {w.isCurrentWeek && (
                  <span className="text-xs rounded-full bg-brand-600 text-white px-2 py-0.5">
                    本週
                  </span>
                )}
                {w.hasPlan ? (
                  <Link href="/plan"
                    className="text-xs text-brand-700 hover:underline">
                    查看菜單
                  </Link>
                ) : w.isCurrentWeek ? (
                  <Link href="/plan"
                    className="text-xs rounded-lg bg-brand-600 text-white px-3 py-1 hover:bg-brand-700">
                    產生菜單
                  </Link>
                ) : (
                  <span className="text-xs text-gray-400">待規劃</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Month-end review */}
      {phaseEndPassed && (
        <Card className="space-y-3 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800">
          <h2 className="font-semibold text-emerald-900 dark:text-emerald-100">
            Phase {primaryGoal.currentPhase + 1} 已完成！
          </h2>
          <div className="text-sm text-emerald-800 dark:text-emerald-200 space-y-1">
            <p>
              預期體重變化：{expectedPhaseDelta.toFixed(1)} kg
              實際：{phaseProgress.delta !== null ? `${phaseProgress.delta} kg` : "無紀錄"}
            </p>
            {phaseProgress.delta !== null &&
              Math.abs(phaseProgress.delta) < Math.abs(expectedPhaseDelta) * 0.5 && (
                <p className="font-medium">
                  實際進度不足預期的 50%，下一 Phase 建議調整熱量目標或確認飲食記錄。
                </p>
              )}
          </div>
          <Button onClick={advancePhase} disabled={advancing || advanceDone}>
            {advanceDone
              ? `已進入 Phase ${primaryGoal.currentPhase + 1}`
              : `進入 Phase ${primaryGoal.currentPhase + 2}`}
          </Button>
          {advanceDone && (
            <p className="text-sm text-emerald-700 dark:text-emerald-200">
              已更新！請前往<Link href="/plan" className="underline ml-1">本週菜單</Link>產生新一輪食譜。
            </p>
          )}
        </Card>
      )}

      {/* Coming up: remaining plan */}
      <Card>
        <h2 className="font-semibold mb-2">整體目標進度</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <span className="text-gray-500">目前 Phase</span>
          <span>{primaryGoal.currentPhase + 1}</span>
          <span className="text-gray-500">目前體重（最新紀錄）</span>
          <span>
            {(() => {
              const pLogs = logs.filter((l) => l.profileId === "primary");
              return pLogs.length > 0 ? `${pLogs[pLogs.length - 1].weightKg} kg` : "尚無紀錄";
            })()}
          </span>
          <span className="text-gray-500">目標體重</span>
          <span>{primaryGoal.targetWeightKg} kg</span>
          <span className="text-gray-500">目標日期</span>
          <span>{primaryGoal.targetDate.slice(0, 10)}</span>
          <span className="text-gray-500">每日熱量目標</span>
          <span>{primary.dailyCalories.toLocaleString()} kcal</span>
        </div>
      </Card>
    </div>
  );
}
