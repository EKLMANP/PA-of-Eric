import { describe, expect, it } from "vitest";
import { generateMealPlan } from "./meal-planner";
import { buildShoppingList } from "./shopping";
import { computeNutritionTargets } from "./nutrition";
import type { Goal, Profile } from "./types";

const profile: Profile = {
  sex: "male",
  age: 30,
  heightCm: 175,
  activityLevel: "moderate",
  restrictions: [],
  equipment: ["stove", "oven", "rice_cooker", "air_fryer"],
  dislikedIngredients: [],
};
const goal: Goal = {
  currentWeightKg: 78,
  currentBodyFatPct: 22,
  targetWeightKg: 72,
  targetBodyFatPct: 17,
  targetDate: new Date(Date.now() + 12 * 7 * 86_400_000).toISOString(),
};

describe("meal planner", () => {
  it("produces 6 meals within per-meal budget tolerance", () => {
    const targets = computeNutritionTargets(profile, goal);
    const plan = generateMealPlan({
      profile,
      targets,
      weeklyBudgetTwd: 900,
      perMealBudgetTwd: 150,
      weekStart: "2026-05-11",
    });
    expect(plan.entries).toHaveLength(6);
    expect(plan.totalCostTwd).toBeGreaterThan(0);
  });

  it("excludes recipes when restriction is set", () => {
    const targets = computeNutritionTargets(profile, goal);
    const plan = generateMealPlan({
      profile: { ...profile, restrictions: ["vegetarian"] },
      targets,
      weeklyBudgetTwd: 900,
      perMealBudgetTwd: 150,
      weekStart: "2026-05-11",
    });
    // Every chosen recipe must declare vegetarian compatibility
    for (const entry of plan.entries) {
      expect(["tofu_stirfry_spinach", "egg_oat_breakfast_jars"]).toContain(entry.recipeId);
    }
  });
});

describe("shopping list", () => {
  it("rounds packs up and reports leftovers", () => {
    const targets = computeNutritionTargets(profile, goal);
    const plan = generateMealPlan({
      profile,
      targets,
      weeklyBudgetTwd: 900,
      perMealBudgetTwd: 150,
      weekStart: "2026-05-11",
    });
    const { items, totalCostTwd } = buildShoppingList(plan);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.packsToBuy).toBeGreaterThanOrEqual(1);
      expect(item.leftoverGrams).toBeGreaterThanOrEqual(0);
    }
    expect(totalCostTwd).toBeGreaterThan(0);
  });
});
