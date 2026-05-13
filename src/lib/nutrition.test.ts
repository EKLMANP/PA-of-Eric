import { describe, expect, it } from "vitest";
import {
  computeNutritionTargets,
  computeHouseholdTargets,
  bmr,
  tdee,
  classifyGoal,
  lbmKg,
} from "./nutrition";
import type { Goal, Profile } from "./types";

const baseProfile: Profile = {
  id: "primary",
  name: "Test",
  sex: "male",
  age: 30,
  heightCm: 175,
  activityLevel: "moderate",
  restrictions: [],
  equipment: ["stove"],
  dislikedIngredients: [],
};

const baseGoal: Goal = {
  profileId: "primary",
  currentWeightKg: 78,
  currentBodyFatPct: 22,
  targetWeightKg: 72,
  targetBodyFatPct: 17,
  targetDate: new Date(Date.now() + 12 * 7 * 86_400_000).toISOString(),
  currentPhase: 0,
  phaseWeeks: 4,
};

describe("lbmKg", () => {
  it("computes lean body mass correctly", () => {
    expect(lbmKg(80, 20)).toBeCloseTo(64, 1);
    expect(lbmKg(60, 30)).toBeCloseTo(42, 1);
  });
});

describe("bmr", () => {
  it("computes Mifflin-St Jeor BMR", () => {
    // 10*75 + 6.25*175 - 5*30 + 5 = 1698.75
    expect(bmr({ ...baseProfile, age: 30, heightCm: 175 }, 75)).toBeCloseTo(1698.75, 1);
  });
});

describe("tdee", () => {
  it("applies moderate multiplier", () => {
    expect(tdee(baseProfile, 75)).toBe(Math.round(1698.75 * 1.55));
  });
});

describe("classifyGoal", () => {
  it("classifies cut/maintain/bulk", () => {
    expect(classifyGoal({ ...baseGoal, currentWeightKg: 80, targetWeightKg: 70 })).toBe("cut");
    expect(classifyGoal({ ...baseGoal, currentWeightKg: 70, targetWeightKg: 70 })).toBe("maintain");
    expect(classifyGoal({ ...baseGoal, currentWeightKg: 70, targetWeightKg: 75 })).toBe("bulk");
  });
});

describe("computeNutritionTargets", () => {
  it("flags infeasible goals (>1.5% body weight loss per week)", () => {
    const aggressiveGoal: Goal = {
      ...baseGoal,
      currentWeightKg: 80,
      targetWeightKg: 70,
      targetDate: new Date(Date.now() + 4 * 7 * 86_400_000).toISOString(),
    };
    const out = computeNutritionTargets(baseProfile, aggressiveGoal);
    expect(out.feasibility).toBe("infeasible");
  });

  it("clamps deficit to 25% TDEE", () => {
    const out = computeNutritionTargets(baseProfile, baseGoal);
    const t = tdee(baseProfile, baseGoal.currentWeightKg);
    expect(out.dailyCalories).toBeGreaterThanOrEqual(Math.round(t * 0.75));
  });

  it("enforces protein floor from LBM (2 g/kg for cut)", () => {
    const out = computeNutritionTargets(baseProfile, baseGoal);
    const expectedFloor = Math.round(lbmKg(78, 22) * 2.0);
    expect(out.proteinG).toBeGreaterThanOrEqual(expectedFloor);
    expect(out.proteinFloorG).toBe(expectedFloor);
  });

  it("includes lunchDinnerCalories (75% of daily)", () => {
    const out = computeNutritionTargets(baseProfile, baseGoal);
    expect(out.lunchDinnerCalories).toBe(Math.round(out.dailyCalories * 0.75));
  });
});

describe("computeHouseholdTargets", () => {
  it("sums daily calories for two people", () => {
    const partnerProfile: Profile = { ...baseProfile, id: "partner", name: "Partner", sex: "female", heightCm: 162 };
    const partnerGoal: Goal = { ...baseGoal, profileId: "partner" };
    const household = computeHouseholdTargets({
      primaryProfile: baseProfile,
      primaryGoal: baseGoal,
      partnerProfile,
      partnerGoal,
    });
    expect(household.totalDailyCalories)
      .toBe(household.primary.dailyCalories + household.partner!.dailyCalories);
  });

  it("partner is null when not provided", () => {
    const h = computeHouseholdTargets({ primaryProfile: baseProfile, primaryGoal: baseGoal });
    expect(h.partner).toBeNull();
  });
});
