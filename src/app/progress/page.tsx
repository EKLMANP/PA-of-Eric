"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, Input } from "@/components/ui";
import { localStore } from "@/lib/storage";
import type { ProgressLog } from "@/lib/types";

export default function ProgressPage() {
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    weightKg: 70,
    bodyFatPct: 22,
    note: "",
  });

  useEffect(() => setLogs(localStore.getProgress()), []);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const log: ProgressLog = {
      date: form.date,
      weightKg: Number(form.weightKg),
      bodyFatPct: Number(form.bodyFatPct) || undefined,
      note: form.note || undefined,
    };
    localStore.appendProgress(log);
    setLogs(localStore.getProgress());
    setForm({ ...form, note: "" });
  }

  const last = logs[logs.length - 1];
  const prev = logs[logs.length - 2];
  const weekDelta = last && prev ? last.weightKg - prev.weightKg : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">進度追蹤</h1>

      <Card>
        <form className="grid gap-3 sm:grid-cols-4 items-end" onSubmit={add}>
          <Field label="日期">
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </Field>
          <Field label="體重 (kg)">
            <Input
              type="number"
              step="0.1"
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })}
              required
            />
          </Field>
          <Field label="體脂率 (%)">
            <Input
              type="number"
              step="0.1"
              value={form.bodyFatPct}
              onChange={(e) => setForm({ ...form, bodyFatPct: Number(e.target.value) })}
            />
          </Field>
          <Button type="submit">新增紀錄</Button>
        </form>
      </Card>

      {last && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <p className="text-sm text-gray-500">最新體重</p>
            <p className="mt-1 text-2xl font-bold">{last.weightKg} kg</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">最新體脂</p>
            <p className="mt-1 text-2xl font-bold">{last.bodyFatPct ?? "—"}{last.bodyFatPct ? " %" : ""}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">與上次差距</p>
            <p className="mt-1 text-2xl font-bold">
              {weekDelta === null ? "—" : `${weekDelta > 0 ? "+" : ""}${weekDelta.toFixed(1)} kg`}
            </p>
          </Card>
        </div>
      )}

      <Card className="overflow-hidden p-0">
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
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  尚無紀錄。新增第一筆吧！
                </td>
              </tr>
            ) : (
              [...logs].reverse().map((l) => (
                <tr key={l.date} className="border-t border-gray-100 dark:border-gray-800">
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
    </div>
  );
}
