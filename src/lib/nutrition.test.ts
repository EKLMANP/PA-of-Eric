import { describe, expect, it } from "vitest";
import { computeNutritionTargets, bmr, tdee, classifyGoal } from "./nutrition";
import type { Goal, Profile } from "./types";

const baseProfile: Profile = {
  sex: "male",
  age: 30,
  heightCm: 175,
  activityLevel: "moderate",
  restrictions: [],
  equipment: ["stove"],
  dislikedIngredients: [],
};

describe("nutrition", () => {
  it("computes BMR via Mifflin-St Jeor", () => {
    // 10*75 + 6.25*175 - 5*30 + 5 = 750 + 1093.75 - 150 + 5 = 1698.75
    expect(bmr(baseProfile, 75)).toBeCloseTo(1698.75, 1);
  });

  it("applies moderate activity multiplier for TDEE", () => {
    expect(tdee(baseProfile, 75)).toBe(Math.round(1698.75 * 1.55));
  });

  it("classifies cut/maintain/bulk by weight delta", () => {
    expect(classifyGoal({ currentWeightKg: 80, targetWeightKg: 70 } as Goal)).toBe("cut");
    expect(classifyGoal({ currentWeightKg: 70, targetWeightKg: 70 } as Goal)).toBe("maintain");
    expect(classifyGoal({ currentWeightKg: 70, targetWeightKg: 75 } as Goal)).toBe("bulk");
  });

  it("flags infeasible goals (>1.5% body weight loss per week)", () => {
    const goal: Goal = {
      currentWeightKg: 80,
      currentBodyFatPct: 25,
      targetWeightKg: 70,
      targetBodyFatPct: 18,
      targetDate: new Date(Date.now() + 4 * 7 * 86_400_000).toISOString(),
    };
    const out = computeNutritionTargets(baseProfile, goal, new Date());
    expect(out.feasibility).toBe("infeasible");
  });

  it("clamps deficit to 25% TDEE on aggressive cut", () => {
    const goal: Goal = {
      currentWeightKg: 80,
      currentBodyFatPct: 25,
      targetWeightKg: 75,
      targetBodyFatPct: 20,
      targetDate: new Date(Date.now() + 8 * 7 * 86_400_000).toISOString(),
    };
    const out = computeNutritionTargets(baseProfile, goal, new Date());
    const t = tdee(baseProfile, 80);
    expect(out.dailyCalories).toBeGreaterThanOrEqual(Math.round(t * 0.75));
    expect(out.goalType).toBe("cut");
  });

  it("uses cut macro split (40/30/30) when cutting", () => {
    const goal: Goal = {
      currentWeightKg: 80,
      currentBodyFatPct: 22,
      targetWeightKg: 75,
      targetBodyFatPct: 18,
      targetDate: new Date(Date.now() + 12 * 7 * 86_400_000).toISOString(),
    };
    const out = computeNutritionTargets(baseProfile, goal, new Date());
    const proteinKcal = out.proteinG * 4;
    expect(proteinKcal / out.dailyCalories).toBeCloseTo(0.4, 1);
  });
});
