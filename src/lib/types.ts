export type Sex = "male" | "female";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export type GoalType = "cut" | "maintain" | "bulk";

export type DietaryRestriction =
  | "vegetarian"
  | "pescatarian"
  | "no_pork"
  | "no_beef"
  | "no_seafood"
  | "no_nuts"
  | "no_dairy"
  | "no_gluten";

export type KitchenEquipment =
  | "stove"
  | "oven"
  | "air_fryer"
  | "rice_cooker"
  | "sous_vide"
  | "microwave"
  | "instant_pot";

export interface Profile {
  id: "primary" | "partner";
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  restrictions: DietaryRestriction[];
  equipment: KitchenEquipment[];
  dislikedIngredients: string[];
}

export interface Goal {
  /** Which profile this goal belongs to */
  profileId: "primary" | "partner";
  currentWeightKg: number;
  currentBodyFatPct: number;
  targetWeightKg: number;
  targetBodyFatPct: number;
  targetDate: string; // ISO date
  description?: string;
  /** Current phase index (0-based) within the overall plan */
  currentPhase: number;
  /** Number of weeks per phase (default 4) */
  phaseWeeks: number;
}

export interface NutritionTargets {
  tdee: number;
  dailyCalories: number;
  /** Calories from lunch + dinner only (75% of daily) */
  lunchDinnerCalories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  goalType: GoalType;
  weeklyDeltaKg: number;
  lbmKg: number;
  proteinFloorG: number;
  feasibility: "safe" | "aggressive" | "infeasible";
  notes: string[];
}

/** Aggregated targets for the household (2 people) */
export interface HouseholdTargets {
  primary: NutritionTargets;
  partner: NutritionTargets | null;
  /** Total daily calories (both people) */
  totalDailyCalories: number;
  /** Total lunch+dinner calories per day */
  totalLunchDinnerCalories: number;
  /** Total protein for the week (both people × 5 days lunch+dinner) */
  weeklyProteinG: number;
}

export interface ProgressLog {
  date: string; // ISO date
  profileId: "primary" | "partner";
  weightKg: number;
  bodyFatPct?: number;
  note?: string;
}

export interface AdjustmentRecommendation {
  profileId: "primary" | "partner";
  deltaDailyKcal: number; // positive = add, negative = reduce
  reason: string;
}

export interface Ingredient {
  id: string;
  name: string;
  costcoPackSize: string;
  costcoPackPriceTwd: number;
  unitGramsPerPack: number;
  pricePerGram: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbPer100g: number;
  fatPer100g: number;
  freezable: boolean;
  category: "protein" | "carb" | "veg" | "fat" | "seasoning" | "dairy" | "other";
  tags: string[];
}

export interface RecipeIngredient {
  ingredientId: string;
  grams: number;
}

export interface Recipe {
  id: string;
  name: string;
  /** Base servings (1 person, 1 meal). Planner multiplies up for batch. */
  servings: number;
  totalMinutes: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  equipment: KitchenEquipment[];
  /** Dietary restrictions this recipe is compatible with */
  restrictions: DietaryRestriction[];
  tags: string[];
  batchFriendly: boolean;
  storageDays: number;
  mealType: "breakfast" | "lunch" | "dinner" | "any";
}

export interface MealPlanEntry {
  recipeId: string;
  /** How many single-serving portions this batch produces */
  batchServings: number;
}

export interface MealPlan {
  weekStart: string; // ISO date (Monday)
  phaseIndex: number;
  /** 6 recipes, each batched to produce portions for the week */
  entries: MealPlanEntry[];
  /** Total cost of the actual ingredient grams used (not Costco pack cost) */
  totalIngredientCostTwd: number;
  totalCaloriesForWeek: number;
  totalProteinGForWeek: number;
  weeklyBudgetTwd: number;
}

export interface ShoppingListItem {
  ingredientId: string;
  name: string;
  totalGramsNeeded: number;
  packsToBuy: number;
  estimatedCostTwd: number;
  leftoverGrams: number;
  freezable: boolean;
}
