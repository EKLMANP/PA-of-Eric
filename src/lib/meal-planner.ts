import { findIngredient } from "@/data/ingredients";
import { RECIPES } from "@/data/recipes";
import type {
  DietaryRestriction,
  HouseholdTargets,
  KitchenEquipment,
  MealPlan,
  MealPlanEntry,
  Profile,
  Recipe,
} from "./types";

export interface PlannerInput {
  primaryProfile: Profile;
  partnerProfile?: Profile;
  targets: HouseholdTargets;
  weeklyBudgetTwd: number;
  numPeople: 1 | 2;
  weekStart: string; // ISO date (Monday)
  phaseIndex: number;
  /** Recipe IDs used in the last phase — reduce repetition across phases */
  recentRecipeIds?: string[];
  excludeRecipeIds?: string[];
}

export interface RecipeStats {
  recipe: Recipe;
  /** Cost in TWD based on actual grams used (not Costco pack cost) */
  costTwd: number;
  calories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
}

export function statsForRecipe(recipe: Recipe, batchServings = 1): RecipeStats {
  const scale = batchServings / recipe.servings;
  let cost = 0, cal = 0, prot = 0, carb = 0, fat = 0;
  for (const ri of recipe.ingredients) {
    const ing = findIngredient(ri.ingredientId);
    const g = ri.grams * scale;
    cost += g * ing.pricePerGram;
    cal  += (g / 100) * ing.caloriesPer100g;
    prot += (g / 100) * ing.proteinPer100g;
    carb += (g / 100) * ing.carbPer100g;
    fat  += (g / 100) * ing.fatPer100g;
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

function mergedRestrictions(profiles: Profile[]): DietaryRestriction[] {
  // Union: if any profile has a restriction, the household respects it
  const set = new Set<DietaryRestriction>();
  for (const p of profiles) for (const r of p.restrictions) set.add(r);
  return [...set];
}

function mergedEquipment(profiles: Profile[]): KitchenEquipment[] {
  // Intersection: only equipment available to both (use primary profile)
  return profiles[0].equipment;
}

function mergedDisliked(profiles: Profile[]): string[] {
  const set = new Set<string>();
  for (const p of profiles) for (const d of p.dislikedIngredients) set.add(d);
  return [...set];
}

function ingredientOverlap(a: Recipe, b: Recipe): number {
  const idsA = new Set(a.ingredients.map((i) => i.ingredientId));
  const idsB = new Set(b.ingredients.map((i) => i.ingredientId));
  let shared = 0;
  for (const id of idsA) if (idsB.has(id)) shared++;
  return shared / Math.max(idsA.size, idsB.size);
}

/**
 * How many portions each recipe should batch-cook.
 *
 * Target: 2 people × 5 days × 2 meals = 20 person-meal servings per week.
 * 6 recipe slots → ~3.3 servings each → round up to 4 per recipe.
 */
function batchServingsFor(numPeople: number, numRecipes = 6): number {
  const targetPersonMeals = numPeople * 5 * 2; // 5 days × 2 meals
  return Math.ceil(targetPersonMeals / numRecipes);
}

/**
 * Select 6 diverse batch-friendly recipes for the week.
 * Scoring: macro protein fit (50%) + ingredient overlap with already-selected (35%)
 *          − repeat penalty from recent weeks (15%).
 */
export function generateMealPlan(input: PlannerInput): MealPlan {
  const NUM_SLOTS = 6;
  const numPeople = input.numPeople;
  const profiles = input.partnerProfile
    ? [input.primaryProfile, input.partnerProfile]
    : [input.primaryProfile];

  const restrictions = mergedRestrictions(profiles);
  const equipment = mergedEquipment(profiles);
  const disliked = mergedDisliked(profiles);

  const batchServings = batchServingsFor(numPeople, NUM_SLOTS);

  const candidates = RECIPES.filter(
    (r) =>
      r.batchFriendly &&
      r.totalMinutes <= 30 &&
      respectsRestrictions(r, restrictions) &&
      hasRequiredEquipment(r, equipment) &&
      !disliked.some((d) =>
        r.ingredients.some((ri) => findIngredient(ri.ingredientId).name.includes(d)),
      ) &&
      !input.excludeRecipeIds?.includes(r.id),
  );

  if (candidates.length === 0) {
    throw new Error(
      "找不到符合條件的食譜，請放寬飲食限制或新增廚房設備。",
    );
  }

  // Weekly cost budget per recipe slot
  const costPerSlot = input.weeklyBudgetTwd / NUM_SLOTS;

  const baseStats = candidates.map((r) => statsForRecipe(r, batchServings));
  const proteinTargetPerSlot = input.targets.weeklyProteinG / NUM_SLOTS;

  const recentSet = new Set(input.recentRecipeIds ?? []);
  const selected: RecipeStats[] = [];
  const usedCounts = new Map<string, number>();

  for (let i = 0; i < NUM_SLOTS; i++) {
    const withinBudget = baseStats.filter((s) => s.costTwd <= costPerSlot * 1.2);
    const pool = withinBudget.length > 0 ? withinBudget : baseStats;

    const scored = pool
      .map((s) => {
        const proteinFit =
          1 - Math.min(1, Math.abs(s.proteinG - proteinTargetPerSlot) / proteinTargetPerSlot);
        const overlap = selected.length
          ? Math.max(...selected.map((sel) => ingredientOverlap(s.recipe, sel.recipe)))
          : 0;
        const currentWeekRepeat = (usedCounts.get(s.recipe.id) ?? 0) * 0.4;
        const recentPhaseRepeat = recentSet.has(s.recipe.id) ? 0.2 : 0;
        const score =
          proteinFit * 0.5 +
          overlap * 0.35 -
          currentWeekRepeat -
          recentPhaseRepeat;
        return { stats: s, score };
      })
      .sort((a, b) => b.score - a.score);

    const pick = scored[0].stats;
    selected.push(pick);
    usedCounts.set(pick.recipe.id, (usedCounts.get(pick.recipe.id) ?? 0) + 1);
  }

  const entries: MealPlanEntry[] = selected.map((s) => ({
    recipeId: s.recipe.id,
    batchServings,
  }));

  return {
    weekStart: input.weekStart,
    phaseIndex: input.phaseIndex,
    entries,
    totalIngredientCostTwd: selected.reduce((sum, s) => sum + s.costTwd, 0),
    totalCaloriesForWeek: selected.reduce((sum, s) => sum + s.calories, 0),
    totalProteinGForWeek: selected.reduce((sum, s) => sum + s.proteinG, 0),
    weeklyBudgetTwd: input.weeklyBudgetTwd,
  };
}
