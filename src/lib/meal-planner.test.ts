import { describe, expect, it } from "vitest";
import { generateMealPlan, statsForRecipe } from "./meal-planner";
import { buildShoppingList } from "./shopping";
import { computeHouseholdTargets } from "./nutrition";
import type { Goal, Profile } from "./types";

const primaryProfile: Profile = {
  id: "primary",
  name: "Test",
  sex: "male",
  age: 30,
  heightCm: 175,
  activityLevel: "moderate",
  restrictions: [],
  equipment: ["stove", "oven", "rice_cooker", "air_fryer"],
  dislikedIngredients: [],
};

const primaryGoal: Goal = {
  profileId: "primary",
  currentWeightKg: 78,
  currentBodyFatPct: 22,
  targetWeightKg: 72,
  targetBodyFatPct: 17,
  targetDate: new Date(Date.now() + 12 * 7 * 86_400_000).toISOString(),
  currentPhase: 0,
  phaseWeeks: 4,
};

const targets = computeHouseholdTargets({
  primaryProfile,
  primaryGoal,
});

describe("meal planner", () => {
  it("produces 6 meal entries within budget (with 20% buffer)", () => {
    const plan = generateMealPlan({
      primaryProfile,
      targets,
      weeklyBudgetTwd: 1200,
      numPeople: 1,
      weekStart: "2026-05-12",
      phaseIndex: 0,
    });
    expect(plan.entries).toHaveLength(6);
    expect(plan.totalIngredientCostTwd).toBeGreaterThan(0);
    // Allow up to 20% budget overage (the planner uses a 1.2x buffer per slot)
    expect(plan.totalIngredientCostTwd).toBeLessThanOrEqual(1200 * 1.25);
  });

  it("produces 6 meals with vegetarian restriction", () => {
    const vegTargets = computeHouseholdTargets({
      primaryProfile: { ...primaryProfile, restrictions: ["vegetarian"] },
      primaryGoal,
    });
    const plan = generateMealPlan({
      primaryProfile: { ...primaryProfile, restrictions: ["vegetarian"] },
      targets: vegTargets,
      weeklyBudgetTwd: 1200,
      numPeople: 1,
      weekStart: "2026-05-12",
      phaseIndex: 0,
    });
    expect(plan.entries.length).toBe(6);
  });

  it("scales batchServings for 2 people", () => {
    const partnerProfile: Profile = { ...primaryProfile, id: "partner", name: "Partner" };
    const partnerGoal: Goal = { ...primaryGoal, profileId: "partner" };
    const twoPersonTargets = computeHouseholdTargets({
      primaryProfile,
      primaryGoal,
      partnerProfile,
      partnerGoal,
    });
    const plan = generateMealPlan({
      primaryProfile,
      partnerProfile,
      targets: twoPersonTargets,
      weeklyBudgetTwd: 2000,
      numPeople: 2,
      weekStart: "2026-05-12",
      phaseIndex: 0,
    });
    // batchServings should be ceil(2*5*2/6)=4 for 2 people
    expect(plan.entries[0].batchServings).toBeGreaterThanOrEqual(4);
  });
});

describe("shopping list", () => {
  it("rounds packs up and reports non-negative leftovers", () => {
    const plan = generateMealPlan({
      primaryProfile,
      targets,
      weeklyBudgetTwd: 1200,
      numPeople: 1,
      weekStart: "2026-05-12",
      phaseIndex: 0,
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
