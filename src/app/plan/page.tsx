"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, Field, Input } from "@/components/ui";
import { findRecipe } from "@/data/recipes";
import { findIngredient } from "@/data/ingredients";
import { computeNutritionTargets } from "@/lib/nutrition";
import { generateMealPlan, statsForRecipe } from "@/lib/meal-planner";
import { localStore } from "@/lib/storage";
import type { Goal, MealPlan, Profile } from "@/lib/types";

function mondayOf(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay() || 7;
  if (day !== 1) d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

export default function PlanPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [perMealBudget, setPerMealBudget] = useState(150);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(localStore.getProfile());
    setGoal(localStore.getGoal());
    setPlan(localStore.getPlan());
  }, []);

  const targets = useMemo(() => {
    if (!profile || !goal) return null;
    return computeNutritionTargets(profile, goal);
  }, [profile, goal]);

  function handleGenerate() {
    if (!profile || !goal || !targets) return;
    try {
      const newPlan = generateMealPlan({
        profile,
        targets,
        weeklyBudgetTwd: perMealBudget * 6,
        perMealBudgetTwd: perMealBudget,
        weekStart: mondayOf(),
      });
      localStore.setPlan(newPlan);
      setPlan(newPlan);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!profile || !goal) {
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">本週菜單</h1>
        {plan && (
          <Link href="/plan/shopping" className="text-sm text-brand-700 hover:underline">
            檢視採購清單 →
          </Link>
        )}
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">產生參數</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="每餐預算 (NT$)" hint="兩人份單餐的總食材成本上限">
            <Input
              type="number"
              min={50}
              max={1000}
              value={perMealBudget}
              onChange={(e) => setPerMealBudget(Number(e.target.value))}
            />
          </Field>
          <div className="flex items-end">
            <Button type="button" onClick={handleGenerate}>
              {plan ? "重新產生 6 餐" : "產生 6 餐"}
            </Button>
          </div>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </Card>

      {plan && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-gray-500">本週食材總成本（依食譜原料）</p>
              <p className="mt-1 text-2xl font-bold">NT$ {plan.totalCostTwd.toLocaleString()}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">6 餐總熱量</p>
              <p className="mt-1 text-2xl font-bold">{plan.totalCalories.toLocaleString()} kcal</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">6 餐總蛋白質</p>
              <p className="mt-1 text-2xl font-bold">{plan.totalProteinG} g</p>
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {plan.entries.map((entry, idx) => {
              const recipe = findRecipe(entry.recipeId);
              const stats = statsForRecipe(recipe);
              return (
                <Card key={`${entry.recipeId}-${idx}`} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500">第 {idx + 1} 餐</p>
                      <h3 className="font-semibold mt-0.5">{recipe.name}</h3>
                    </div>
                    <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                      {recipe.totalMinutes} 分鐘
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 flex flex-wrap gap-x-3 gap-y-1">
                    <span>熱量 {stats.calories} kcal</span>
                    <span>蛋白 {stats.proteinG} g</span>
                    <span>碳水 {stats.carbG} g</span>
                    <span>脂肪 {stats.fatG} g</span>
                    <span>食材成本 NT$ {stats.costTwd}</span>
                  </div>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-brand-700">查看食材與步驟</summary>
                    <div className="mt-2 space-y-2">
                      <ul className="ml-5 list-disc text-xs space-y-0.5">
                        {recipe.ingredients.map((ri) => {
                          const ing = findIngredient(ri.ingredientId);
                          return (
                            <li key={ri.ingredientId}>
                              {ing.name} {ri.grams} g
                            </li>
                          );
                        })}
                      </ul>
                      <ol className="ml-5 list-decimal text-sm space-y-1">
                        {recipe.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                      <p className="text-xs text-gray-500">冷藏 {recipe.storageDays} 天內食用</p>
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
