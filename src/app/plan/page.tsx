"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, Field, Input } from "@/components/ui";
import { findRecipe } from "@/data/recipes";
import { findIngredient } from "@/data/ingredients";
import { computeHouseholdTargets } from "@/lib/nutrition";
import { generateMealPlan, statsForRecipe } from "@/lib/meal-planner";
import { localStore } from "@/lib/storage";
import type { MealPlan } from "@/lib/types";

function mondayOf(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay() || 7;
  if (day !== 1) d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

export default function PlanPage() {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [weeklyBudget, setWeeklyBudget] = useState(1200);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPlan(localStore.getPlan());
    setWeeklyBudget(localStore.getWeeklyBudget());
    setReady(true);
  }, []);

  const householdTargets = useMemo(() => {
    if (!ready) return null;
    const primary = localStore.getPrimaryProfile();
    const primaryGoal = localStore.getPrimaryGoal();
    if (!primary || !primaryGoal) return null;
    const partner = localStore.getPartnerProfile();
    const partnerGoal = localStore.getPartnerGoal();
    return computeHouseholdTargets({
      primaryProfile: primary,
      primaryGoal,
      partnerProfile: partner ?? undefined,
      partnerGoal: partnerGoal ?? undefined,
    });
  }, [ready]);

  const numPeople = useMemo(() => {
    if (!ready) return 1;
    return localStore.getPartnerProfile() ? 2 : 1;
  }, [ready]);

  function handleGenerate() {
    const primary = localStore.getPrimaryProfile();
    const primaryGoal = localStore.getPrimaryGoal();
    if (!primary || !primaryGoal || !householdTargets) return;
    const partner = localStore.getPartnerProfile();
    localStore.setWeeklyBudget(weeklyBudget);
    try {
      const newPlan = generateMealPlan({
        primaryProfile: primary,
        partnerProfile: partner ?? undefined,
        targets: householdTargets,
        weeklyBudgetTwd: weeklyBudget,
        numPeople: numPeople as 1 | 2,
        weekStart: mondayOf(),
        phaseIndex: primaryGoal.currentPhase,
      });
      localStore.setPlan(newPlan);
      setPlan(newPlan);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!ready) return null;
  if (!localStore.getPrimaryProfile()) {
    return (
      <Card className="text-center space-y-3">
        <h2 className="font-semibold">尚未設定個人資料</h2>
        <Link href="/onboarding" className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-white text-sm">
          前往設定
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">本週菜單</h1>
        {plan && (
          <Link href="/plan/shopping" className="text-sm text-brand-700 hover:underline">
            Costco 採購清單 →
          </Link>
        )}
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">設定</h2>
        <div className="grid gap-3 sm:grid-cols-2 items-end">
          <Field label="週總採購預算 (NT$)" hint={`${numPeople} 人 × 5 天午晚餐的食材成本上限`}>
            <Input
              type="number" min={300} max={10000} step={100}
              value={weeklyBudget}
              onChange={(e) => setWeeklyBudget(Number(e.target.value))}
            />
          </Field>
          <Button type="button" onClick={handleGenerate}>
            {plan ? "重新產生 6 道食譜" : "產生 6 道食譜"}
          </Button>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </Card>

      {householdTargets && (
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <Card>
            <p className="text-gray-500">週午晚餐熱量目標</p>
            <p className="mt-1 font-bold text-lg">
              {(householdTargets.totalLunchDinnerCalories * 5).toLocaleString()} kcal
            </p>
            <p className="text-xs text-gray-400">{numPeople} 人 × 5 天</p>
          </Card>
          <Card>
            <p className="text-gray-500">週蛋白質目標</p>
            <p className="mt-1 font-bold text-lg">{householdTargets.weeklyProteinG} g</p>
          </Card>
          <Card>
            <p className="text-gray-500">週預算</p>
            <p className="mt-1 font-bold text-lg">NT$ {weeklyBudget.toLocaleString()}</p>
          </Card>
        </div>
      )}

      {plan && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-gray-500">6 道食材總成本</p>
              <p className="mt-1 text-2xl font-bold">
                NT$ {plan.totalIngredientCostTwd.toLocaleString()}
                {plan.totalIngredientCostTwd > weeklyBudget && (
                  <span className="ml-2 text-sm text-rose-500">超預算</span>
                )}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">6 道總熱量</p>
              <p className="mt-1 text-2xl font-bold">
                {plan.totalCaloriesForWeek.toLocaleString()} kcal
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">6 道總蛋白質</p>
              <p className="mt-1 text-2xl font-bold">{plan.totalProteinGForWeek} g</p>
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {plan.entries.map((entry, idx) => {
              const recipe = findRecipe(entry.recipeId);
              const stats = statsForRecipe(recipe, entry.batchServings);
              return (
                <Card key={`${entry.recipeId}-${idx}`} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-gray-500">第 {idx + 1} 道 × {entry.batchServings} 份</p>
                      <h3 className="font-semibold mt-0.5">{recipe.name}</h3>
                    </div>
                    <span className="shrink-0 text-xs rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                      {recipe.totalMinutes} 分鐘
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 flex flex-wrap gap-x-3 gap-y-1">
                    <span>批量熱量 {stats.calories.toLocaleString()} kcal</span>
                    <span>蛋白 {stats.proteinG} g</span>
                    <span>碳水 {stats.carbG} g</span>
                    <span>脂肪 {stats.fatG} g</span>
                    <span>食材 NT$ {stats.costTwd}</span>
                  </div>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-brand-700">
                      食材 &amp; 步驟 ·{" "}
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className="underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        詳情 / AI 客製化
                      </Link>
                    </summary>
                    <div className="mt-2 space-y-2">
                      <ul className="ml-5 list-disc text-xs space-y-0.5">
                        {recipe.ingredients.map((ri) => {
                          const ing = findIngredient(ri.ingredientId);
                          const scaled = Math.round(ri.grams * entry.batchServings / recipe.servings);
                          return (
                            <li key={ri.ingredientId}>
                              {ing.name} {scaled} g（單份 {ri.grams} g）
                            </li>
                          );
                        })}
                      </ul>
                      <ol className="ml-5 list-decimal text-sm space-y-1">
                        {recipe.steps.map((s, i) => <li key={i}>{s}</li>)}
                      </ol>
                      <p className="text-xs text-gray-500">冷藏 {recipe.storageDays} 天內食用完畢</p>
                    </div>
                  </details>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
