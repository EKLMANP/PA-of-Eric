import { findIngredient } from "@/data/ingredients";
import { RECIPES } from "@/data/recipes";
import type {
  DietaryRestriction,
  KitchenEquipment,
  MealPlan,
  MealPlanEntry,
  NutritionTargets,
  Profile,
  Recipe,
} from "./types";

export interface PlannerInput {
  profile: Profile;
  targets: NutritionTargets;
  weeklyBudgetTwd: number;
  perMealBudgetTwd?: number;
  numMeals?: number; // default 6
  weekStart: string; // ISO date
  excludeRecipeIds?: string[];
}

export interface RecipeStats {
  recipe: Recipe;
  costTwd: number;
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

export function statsForRecipe(recipe: Recipe): RecipeStats {
  let cost = 0;
  let cal = 0;
  let prot = 0;
  let carb = 0;
  let fat = 0;
  for (const ri of recipe.ingredients) {
    const ing = findIngredient(ri.ingredientId);
    cost += ri.grams * ing.pricePerGram;
    cal += (ri.grams / 100) * ing.caloriesPer100g;
    prot += (ri.grams / 100) * ing.proteinPer100g;
    carb += (ri.grams / 100) * ing.carbPer100g;
    fat += (ri.grams / 100) * ing.fatPer100g;
  }
  return {
    recipe,
    costTwd: Math.round(cost),
    calories: Math.round(cal),
    proteinG: Math.round(prot),
    carbG: Math.round(carb),
    fatG: Math.round(fat),
  };
}

function respectsRestrictions(
  recipe: Recipe,
  restrictions: DietaryRestriction[],
): boolean {
  if (restrictions.length === 0) return true;
  return restrictions.every((r) => recipe.restrictions.includes(r));
}

function hasRequiredEquipment(
  recipe: Recipe,
  available: KitchenEquipment[],
): boolean {
  return recipe.equipment.every((e) => available.includes(e));
}

function ingredientOverlap(a: Recipe, b: Recipe): number {
  const idsA = new Set(a.ingredients.map((i) => i.ingredientId));
  const idsB = new Set(b.ingredients.map((i) => i.ingredientId));
  let shared = 0;
  for (const id of idsA) if (idsB.has(id)) shared++;
  return shared / Math.max(idsA.size, idsB.size);
}

/**
 * Greedy 6-meal selection: prefer recipes that
 * 1. fit restrictions and equipment
 * 2. are within per-meal budget
 * 3. share ingredients with already-selected meals (to minimize Costco waste)
 * 4. push the day's macro profile toward the protein target
 */
export function generateMealPlan(input: PlannerInput): MealPlan {
  const numMeals = input.numMeals ?? 6;
  const candidates = RECIPES.filter(
    (r) =>
      r.batchFriendly &&
      r.totalMinutes <= 30 &&
      respectsRestrictions(r, input.profile.restrictions) &&
      hasRequiredEquipment(r, input.profile.equipment) &&
      !input.profile.dislikedIngredients.some((d) =>
        r.ingredients.some((ri) => findIngredient(ri.ingredientId).name.includes(d)),
      ) &&
      !input.excludeRecipeIds?.includes(r.id),
  );

  if (candidates.length === 0) {
    throw new Error(
      "找不到符合條件的食譜，請放寬飲食限制或新增廚房設備。",
    );
  }

  const perMealBudget =
    input.perMealBudgetTwd ?? Math.floor(input.weeklyBudgetTwd / numMeals);

  const stats = candidates.map(statsForRecipe);
  const proteinTargetPerMeal = input.targets.proteinG / 3; // 6 meals ≈ 3 days × 2

  const selected: RecipeStats[] = [];
  const usedCounts = new Map<string, number>();

  for (let i = 0; i < numMeals; i++) {
    const scored = stats
      .filter((s) => s.costTwd <= perMealBudget * 1.15) // 15% buffer
      .map((s) => {
        const proteinFit = 1 - Math.min(1, Math.abs(s.proteinG - proteinTargetPerMeal) / proteinTargetPerMeal);
        const overlap = selected.length
          ? Math.max(...selected.map((sel) => ingredientOverlap(s.recipe, sel.recipe)))
          : 0;
        const repeatPenalty = (usedCounts.get(s.recipe.id) ?? 0) * 0.35;
        const score = proteinFit * 0.5 + overlap * 0.35 - repeatPenalty;
        return { stats: s, score };
      })
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      // budget too tight — relax
      const fallback = [...stats].sort((a, b) => a.costTwd - b.costTwd)[0];
      selected.push(fallback);
      usedCounts.set(fallback.recipe.id, (usedCounts.get(fallback.recipe.id) ?? 0) + 1);
      continue;
    }
    const pick = scored[0].stats;
    selected.push(pick);
    usedCounts.set(pick.recipe.id, (usedCounts.get(pick.recipe.id) ?? 0) + 1);
  }

  const entries: MealPlanEntry[] = selected.map((s) => ({
    recipeId: s.recipe.id,
    servings: s.recipe.servings,
  }));

  return {
    weekStart: input.weekStart,
    entries,
    totalCostTwd: selected.reduce((sum, s) => sum + s.costTwd, 0),
    totalCalories: selected.reduce((sum, s) => sum + s.calories, 0),
    totalProteinG: selected.reduce((sum, s) => sum + s.proteinG, 0),
  };
}
