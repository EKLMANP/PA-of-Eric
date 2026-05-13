"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { findRecipe } from "@/data/recipes";
import { findIngredient } from "@/data/ingredients";
import { statsForRecipe } from "@/lib/meal-planner";
import { localStore } from "@/lib/storage";
import type { CustomizedRecipe } from "@/lib/ai/recipe";

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [batchServings, setBatchServings] = useState(4);
  const [customized, setCustomized] = useState<CustomizedRecipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const plan = localStore.getPlan();
    if (plan) {
      const entry = plan.entries.find((e) => e.recipeId === id);
      if (entry) setBatchServings(entry.batchServings);
    }
  }, [id]);

  let recipe: ReturnType<typeof findRecipe> | null = null;
  try {
    recipe = findRecipe(id);
  } catch {
    return (
      <Card>
        <p>找不到食譜 <code>{id}</code></p>
        <Link href="/plan" className="text-brand-700 hover:underline text-sm mt-2 block">← 返回菜單</Link>
      </Card>
    );
  }

  // recipe is always defined here — the catch block returns early
  const stats = statsForRecipe(recipe!, batchServings);

  async function handleCustomize() {
    setLoading(true);
    setError(null);
    try {
      const profile = localStore.getPrimaryProfile();
      const goal = localStore.getPrimaryGoal();
      const plan = localStore.getPlan();
      const res = await fetch("/api/customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: recipe!.id,
          profile,
          goal,
          weeklyBudgetTwd: plan?.weeklyBudgetTwd ?? 1200,
          numPeople: localStore.getPartnerProfile() ? 2 : 1,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || res.statusText);
      }
      const data = (await res.json()) as CustomizedRecipe;
      setCustomized(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/plan" className="text-sm text-gray-500 hover:underline">← 返回菜單</Link>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{customized?.customizedName ?? recipe.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {recipe.totalMinutes} 分鐘 · 批量 {batchServings} 份 · 冷藏 {recipe.storageDays} 天
          </p>
        </div>
        <Button
          onClick={handleCustomize}
          disabled={loading}
          variant="secondary"
        >
          {loading ? "AI 客製化中…" : "讓 AI 為我客製化"}
        </Button>
      </div>

      {error && (
        <Card className="border-rose-300 bg-rose-50 dark:bg-rose-900/20">
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        </Card>
      )}

      {/* Nutrition */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "熱量", value: `${stats.calories.toLocaleString()} kcal` },
          { label: "蛋白質", value: `${stats.proteinG} g` },
          { label: "碳水", value: `${stats.carbG} g` },
          { label: "脂肪", value: `${stats.fatG} g` },
        ].map((s) => (
          <Card key={s.label} className="py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="mt-0.5 text-xl font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Ingredients */}
      <Card className="space-y-2">
        <h2 className="font-semibold">食材（批量 {batchServings} 份）</h2>
        {customized?.swaps && customized.swaps.length > 0 && (
          <div className="rounded-lg bg-brand-50 p-3 text-sm space-y-1 dark:bg-brand-900/20">
            <p className="font-medium text-brand-800 dark:text-brand-200">AI 替換建議</p>
            {customized.swaps.map((sw, i) => (
              <p key={i} className="text-brand-700 dark:text-brand-300">
                {sw.from} → {sw.to}（{sw.reason}）
              </p>
            ))}
          </div>
        )}
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {recipe.ingredients.map((ri) => {
            const ing = findIngredient(ri.ingredientId);
            const scaled = Math.round(ri.grams * batchServings / recipe.servings);
            return (
              <li key={ri.ingredientId} className="flex items-center justify-between py-2 text-sm">
                <span>{ing.name}</span>
                <span className="text-gray-500">{scaled} g</span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Steps */}
      <Card className="space-y-2">
        <h2 className="font-semibold">步驟</h2>
        {customized?.servingNote && (
          <p className="text-sm text-gray-600 dark:text-gray-300 italic">{customized.servingNote}</p>
        )}
        <ol className="ml-5 list-decimal space-y-2 text-sm">
          {(customized?.twoPersonBatchSteps ?? recipe.steps).map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        {customized?.storageTip && (
          <p className="text-xs text-gray-500 mt-2">{customized.storageTip}</p>
        )}
        {!customized && (
          <p className="text-xs text-gray-500">冷藏 {recipe.storageDays} 天內食用完畢</p>
        )}
      </Card>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {recipe.equipment.map((e) => (
          <span key={e} className="rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-800">
            {e}
          </span>
        ))}
        {recipe.tags.map((t) => (
          <span key={t} className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
