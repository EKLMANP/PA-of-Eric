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
  sex: Sex;
  age: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  restrictions: DietaryRestriction[];
  equipment: KitchenEquipment[];
  dislikedIngredients: string[];
}

export interface Goal {
  currentWeightKg: number;
  currentBodyFatPct: number;
  targetWeightKg: number;
  targetBodyFatPct: number;
  targetDate: string; // ISO date
  description?: string;
}

export interface NutritionTargets {
  tdee: number;
  dailyCalories: number;
  proteinG: number;
  carbG: number;
  fatG: number;
  goalType: GoalType;
  weeklyDeltaKg: number;
  feasibility: "safe" | "aggressive" | "infeasible";
  notes: string[];
}

export interface ProgressLog {
  date: string; // ISO date
  weightKg: number;
  bodyFatPct?: number;
  note?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  costcoPackSize: string; // e.g. "2.5 kg"
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
  servings: number; // base servings (we'll multiply by 6/servings for batch)
  totalMinutes: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  equipment: KitchenEquipment[];
  restrictions: DietaryRestriction[]; // restrictions this recipe respects (i.e. compatible)
  tags: string[];
  batchFriendly: boolean;
  storageDays: number;
}

export interface MealPlanEntry {
  recipeId: string;
  servings: number;
  customNotes?: string;
}

export interface MealPlan {
  weekStart: string; // ISO date (Monday)
  entries: MealPlanEntry[]; // 6 meals
  totalCostTwd: number;
  totalCalories: number;
  totalProteinG: number;
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
