"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { localStore } from "@/lib/storage";
import { checkProgressFeedback } from "@/lib/feedback";
import type { AdjustmentRecommendation, ProgressLog } from "@/lib/types";

export default function ProgressPage() {
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [adjustment, setAdjustment] = useState<AdjustmentRecommendation | null>(null);
  const [hasPartner, setHasPartner] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    profileId: "primary" as "primary" | "partner",
    weightKg: 70,
    bodyFatPct: "",
    note: "",
  });

  function reload() {
    const allLogs = localStore.getProgress();
    setLogs(allLogs);
    setHasPartner(localStore.getPartnerProfile() !== null);
    const primaryGoal = localStore.getPrimaryGoal();
    const primaryTargets = localStore.getPrimaryProfile();
    if (primaryGoal && primaryTargets) {
      // compute expected weekly delta from stored data
      const today = new Date();
      const weeks = Math.max(
        1,
        (new Date(primaryGoal.targetDate).getTime() - today.getTime()) /
          (7 * 86_400_000),
      );
      const expectedWeekly = (primaryGoal.targetWeightKg - primaryGoal.currentWeightKg) / weeks;
      setAdjustment(checkProgressFeedback(allLogs, primaryGoal, expectedWeekly));
    }
  }

  useEffect(() => {
    reload();
    setForm((f) => ({ ...f, weightKg: localStore.getPrimaryGoal()?.currentWeightKg ?? 70 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const log: ProgressLog = {
      date: form.date,
      profileId: form.profileId,
      weightKg: Number(form.weightKg),
      bodyFatPct: form.bodyFatPct ? Number(form.bodyFatPct) : undefined,
      note: form.note || undefined,
    };
    localStore.appendProgress(log);
    reload();
    setForm({ ...form, note: "", bodyFatPct: "" });
  }

  const primaryLogs = logs.filter((l) => l.profileId === "primary");
  const partnerLogs = logs.filter((l) => l.profileId === "partner");
  const last = primaryLogs[primaryLogs.length - 1];
  const prev = primaryLogs[primaryLogs.length - 2];
  const weekDelta = last && prev ? last.weightKg - prev.weightKg : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">進度追蹤</h1>

      {adjustment && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
          <p className="font-semibold text-amber-900 dark:text-amber-100">進度提醒</p>
          <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">{adjustment.reason}</p>
        </Card>
      )}

      <Card>
        <form className="grid gap-3 sm:grid-cols-5 items-end" onSubmit={add}>
          <Field label="日期">
            <Input type="date" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </Field>
          {hasPartner && (
            <Field label="誰">
              <Select value={form.profileId}
                onChange={(e) => setForm({ ...form, profileId: e.target.value as "primary" | "partner" })}>
                <option value="primary">我</option>
                <option value="partner">另一半</option>
              </Select>
            </Field>
          )}
          <Field label="體重 (kg)">
            <Input type="number" step="0.1" value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })} required />
          </Field>
          <Field label="體脂率 (%) 選填">
            <Input type="number" step="0.1" value={form.bodyFatPct}
              onChange={(e) => setForm({ ...form, bodyFatPct: e.target.value })} />
          </Field>
          <Button type="submit">新增</Button>
        </form>
      </Card>

      {last && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <p className="text-sm text-gray-500">最新體重（我）</p>
            <p className="mt-1 text-2xl font-bold">{last.weightKg} kg</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">最新體脂（我）</p>
            <p className="mt-1 text-2xl font-bold">
              {last.bodyFatPct != null ? `${last.bodyFatPct} %` : "—"}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">與上次差距</p>
            <p className="mt-1 text-2xl font-bold">
              {weekDelta === null ? "—" : `${weekDelta > 0 ? "+" : ""}${weekDelta.toFixed(1)} kg`}
            </p>
          </Card>
        </div>
      )}

      <LogTable title="主要使用者記錄" rows={primaryLogs} />
      {hasPartner && <LogTable title="同伴記錄" rows={partnerLogs} />}
    </div>
  );
}

function LogTable({ title, rows }: { title: string; rows: ProgressLog[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="px-4 py-3 font-semibold text-sm border-b border-gray-100 dark:border-gray-800">
        {title}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-800/60">
          <tr>
            <th className="px-4 py-2">日期</th>
            <th className="px-4 py-2 text-right">體重</th>
            <th className="px-4 py-2 text-right">體脂</th>
            <th className="px-4 py-2">備註</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                尚無紀錄
              </td>
            </tr>
          ) : (
            [...rows].reverse().map((l) => (
              <tr key={`${l.date}-${l.profileId}`} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3">{l.date}</td>
                <td className="px-4 py-3 text-right">{l.weightKg} kg</td>
                <td className="px-4 py-3 text-right">{l.bodyFatPct ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{l.note ?? ""}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Card>
  );
}
