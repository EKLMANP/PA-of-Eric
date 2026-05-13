import type {
  ActivityLevel,
  Goal,
  GoalType,
  HouseholdTargets,
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
// Protein targets (g per kg LBM) by goal
const PROTEIN_PER_KG_LBM: Record<GoalType, number> = {
  cut: 2.0,
  maintain: 1.8,
  bulk: 2.2,
};

/**
 * Lean body mass: removes fat mass from total weight.
 */
export function lbmKg(weightKg: number, bodyFatPct: number): number {
  return weightKg * (1 - bodyFatPct / 100);
}

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
 * Compute daily calorie target and macro split for a single person.
 * Protein is floored to 2 g/kg LBM to preserve lean mass.
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
      `每週體重變化 ${weeklyDeltaKg.toFixed(2)} kg 超過建議上限（體重的 1%），請延長目標時程。`,
    );
  } else if (weeklyLossPct > MAX_WEEKLY_LOSS_PCT) {
    feasibility = "aggressive";
    notes.push("目標較積極，建議搭配規律重訓並監測精神狀態。");
  }

  // Check if body fat target is consistent with weight target
  const currentLbm = lbmKg(goal.currentWeightKg, goal.currentBodyFatPct);
  const targetLbm = lbmKg(goal.targetWeightKg, goal.targetBodyFatPct);
  if (goalType === "cut" && targetLbm < currentLbm - 1) {
    notes.push(
      `目標體脂達標時瘦肉量預計減少 ${(currentLbm - targetLbm).toFixed(1)} kg，建議提高蛋白質攝取並加入重訓。`,
    );
  }

  // Clamp deficit/surplus
  let clampedDelta = dailyDeltaKcal;
  if (goalType === "cut" && Math.abs(dailyDeltaKcal) > maxDeficit) {
    clampedDelta = -maxDeficit;
    notes.push(
      `每日熱量赤字已限制在 TDEE 的 25%（約 ${Math.round(maxDeficit)} kcal）以保護代謝。`,
    );
  }
  if (goalType === "bulk" && dailyDeltaKcal > maxDeficit) {
    clampedDelta = maxDeficit;
    notes.push("增肌期建議每日盈餘不超過 TDEE 的 25%，避免過度脂肪累積。");
  }

  const dailyCalories = Math.max(1200, Math.round(t + clampedDelta));

  // Protein floor: 2 g/kg current LBM
  const proteinFloorG = Math.round(currentLbm * PROTEIN_PER_KG_LBM[goalType]);

  // Macro split by goal (starting point)
  let proteinPct: number;
  let carbPct: number;
  let fatPct: number;
  if (goalType === "cut") {
    proteinPct = 0.4; carbPct = 0.3; fatPct = 0.3;
  } else if (goalType === "bulk") {
    proteinPct = 0.3; carbPct = 0.45; fatPct = 0.25;
  } else {
    proteinPct = 0.3; carbPct = 0.45; fatPct = 0.25;
  }

  let proteinG = Math.round((dailyCalories * proteinPct) / 4);
  // Enforce protein floor
  if (proteinG < proteinFloorG) {
    proteinG = proteinFloorG;
    notes.push(
      `蛋白質已提高至下限 ${proteinFloorG} g/天（2 g/kg 瘦肉量 ${currentLbm.toFixed(1)} kg）。`,
    );
  }

  // Recompute carb/fat from remaining calories
  const remainingKcal = dailyCalories - proteinG * 4;
  const fatG = Math.round((remainingKcal * (fatPct / (carbPct + fatPct))) / 9);
  const carbG = Math.round((remainingKcal - fatG * 9) / 4);

  return {
    tdee: t,
    dailyCalories,
    lunchDinnerCalories: Math.round(dailyCalories * 0.75),
    proteinG,
    carbG,
    fatG,
    goalType,
    weeklyDeltaKg: Number(weeklyDeltaKg.toFixed(2)),
    lbmKg: Number(currentLbm.toFixed(1)),
    proteinFloorG,
    feasibility,
    notes,
  };
}

/**
 * Compute combined household targets for 1 or 2 people.
 * The meal plan covers lunch+dinner for both people for 5 days.
 */
export function computeHouseholdTargets(args: {
  primaryProfile: Profile;
  primaryGoal: Goal;
  partnerProfile?: Profile;
  partnerGoal?: Goal;
  today?: Date;
}): HouseholdTargets {
  const today = args.today ?? new Date();
  const primary = computeNutritionTargets(args.primaryProfile, args.primaryGoal, today);
  const partner =
    args.partnerProfile && args.partnerGoal
      ? computeNutritionTargets(args.partnerProfile, args.partnerGoal, today)
      : null;

  const totalDailyCalories = primary.dailyCalories + (partner?.dailyCalories ?? 0);
  const totalLunchDinnerCalories =
    primary.lunchDinnerCalories + (partner?.lunchDinnerCalories ?? 0);

  // Weekly protein: sum over 5 days of lunch+dinner (≈75% of daily protein)
  const weeklyProteinG = Math.round(
    (primary.proteinG * 0.75 + (partner?.proteinG ?? 0) * 0.75) * 5,
  );

  return { primary, partner, totalDailyCalories, totalLunchDinnerCalories, weeklyProteinG };
}
