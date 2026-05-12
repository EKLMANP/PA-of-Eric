import { findIngredient } from "@/data/ingredients";
import { findRecipe } from "@/data/recipes";
import type { MealPlan, ShoppingListItem } from "./types";

/**
 * Aggregate ingredient grams across the meal plan, round up to whole Costco packs,
 * and report leftovers per ingredient.
 */
export function buildShoppingList(plan: MealPlan): {
  items: ShoppingListItem[];
  totalCostTwd: number;
} {
  const totals = new Map<string, number>();

  for (const entry of plan.entries) {
    const recipe = findRecipe(entry.recipeId);
    for (const ri of recipe.ingredients) {
      totals.set(ri.ingredientId, (totals.get(ri.ingredientId) ?? 0) + ri.grams);
    }
  }

  const items: ShoppingListItem[] = [];
  let totalCost = 0;
  for (const [id, grams] of totals) {
    const ing = findIngredient(id);
    const packsToBuy = Math.max(1, Math.ceil(grams / ing.unitGramsPerPack));
    const cost = packsToBuy * ing.costcoPackPriceTwd;
    const leftover = packsToBuy * ing.unitGramsPerPack - grams;
    totalCost += cost;
    items.push({
      ingredientId: id,
      name: ing.name,
      totalGramsNeeded: Math.round(grams),
      packsToBuy,
      estimatedCostTwd: cost,
      leftoverGrams: Math.round(leftover),
      freezable: ing.freezable,
    });
  }

  items.sort((a, b) => b.estimatedCostTwd - a.estimatedCostTwd);
  return { items, totalCostTwd: totalCost };
}
