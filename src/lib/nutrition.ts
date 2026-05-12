import type {
  ActivityLevel,
  Goal,
  GoalType,
  NutritionTargets,
  Profile,
} from "./types";

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// 1 kg body fat ≈ 7700 kcal
const KCAL_PER_KG_FAT = 7700;
const MAX_WEEKLY_LOSS_PCT = 0.01; // 1% body weight per week
const MAX_DEFICIT_PCT = 0.25;

/**
 * Mifflin-St Jeor BMR (kcal/day).
 */
export function bmr(profile: Profile, weightKg: number): number {
  const base = 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.sex === "male" ? base + 5 : base - 161;
}

export function tdee(profile: Profile, weightKg: number): number {
  return Math.round(bmr(profile, weightKg) * ACTIVITY_MULTIPLIER[profile.activityLevel]);
}

export function classifyGoal(goal: Goal): GoalType {
  const delta = goal.targetWeightKg - goal.currentWeightKg;
  if (delta < -0.5) return "cut";
  if (delta > 0.5) return "bulk";
  return "maintain";
}

function weeksUntil(targetDate: string, today: Date = new Date()): number {
  const target = new Date(targetDate).getTime();
  const diffMs = target - today.getTime();
  const weeks = diffMs / (1000 * 60 * 60 * 24 * 7);
  return Math.max(1, weeks);
}

/**
 * Compute daily calorie target and macro split for the user's goal.
 */
export function computeNutritionTargets(
  profile: Profile,
  goal: Goal,
  today: Date = new Date(),
): NutritionTargets {
  const t = tdee(profile, goal.currentWeightKg);
  const goalType = classifyGoal(goal);
  const weeks = weeksUntil(goal.targetDate, today);
  const totalDeltaKg = goal.targetWeightKg - goal.currentWeightKg;
  const weeklyDeltaKg = totalDeltaKg / weeks;

  const dailyDeltaKcal = (weeklyDeltaKg * KCAL_PER_KG_FAT) / 7;
  const maxDeficit = t * MAX_DEFICIT_PCT;

  const notes: string[] = [];
  let feasibility: NutritionTargets["feasibility"] = "safe";

  const weeklyLossPct = Math.abs(weeklyDeltaKg) / goal.currentWeightKg;
  if (weeklyLossPct > MAX_WEEKLY_LOSS_PCT * 1.5) {
    feasibility = "infeasible";
    notes.push(
      `每週體重變化 ${weeklyDeltaKg.toFixed(2)} kg 超過建議上限（體重的 ${(MAX_WEEKLY_LOSS_PCT * 100).toFixed(0)}%），請延長目標時程。`,
    );
  } else if (weeklyLossPct > MAX_WEEKLY_LOSS_PCT) {
    feasibility = "aggressive";
    notes.push("目標較積極，建議搭配規律重訓並監測精神狀態。");
  }

  // Clamp deficit/surplus
  let clampedDelta = dailyDeltaKcal;
  if (goalType === "cut" && Math.abs(dailyDeltaKcal) > maxDeficit) {
    clampedDelta = -maxDeficit;
    notes.push(`每日熱量赤字已限制在 TDEE 的 25%（約 ${Math.round(maxDeficit)} kcal）以保護代謝。`);
  }
  if (goalType === "bulk" && dailyDeltaKcal > maxDeficit) {
    clampedDelta = maxDeficit;
    notes.push("增肌期建議每日盈餘不超過 TDEE 的 25%，避免過度脂肪累積。");
  }

  const dailyCalories = Math.max(1200, Math.round(t + clampedDelta));

  // Macro split by goal
  let proteinPct: number;
  let carbPct: number;
  let fatPct: number;
  if (goalType === "cut") {
    proteinPct = 0.4;
    carbPct = 0.3;
    fatPct = 0.3;
  } else if (goalType === "bulk") {
    proteinPct = 0.3;
    carbPct = 0.45;
    fatPct = 0.25;
  } else {
    proteinPct = 0.3;
    carbPct = 0.45;
    fatPct = 0.25;
  }

  return {
    tdee: t,
    dailyCalories,
    proteinG: Math.round((dailyCalories * proteinPct) / 4),
    carbG: Math.round((dailyCalories * carbPct) / 4),
    fatG: Math.round((dailyCalories * fatPct) / 9),
    goalType,
    weeklyDeltaKg: Number(weeklyDeltaKg.toFixed(2)),
    feasibility,
    notes,
  };
}
