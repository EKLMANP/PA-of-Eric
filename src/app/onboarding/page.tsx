"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { localStore } from "@/lib/storage";
import type {
  ActivityLevel,
  DietaryRestriction,
  Goal,
  KitchenEquipment,
  Profile,
  Sex,
} from "@/lib/types";

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "久坐（辦公室、無運動）" },
  { value: "light", label: "輕度（1-3 次/週運動）" },
  { value: "moderate", label: "中度（3-5 次/週運動）" },
  { value: "active", label: "高度（6-7 次/週運動）" },
  { value: "very_active", label: "非常活躍（每天運動 + 體力工作）" },
];

const RESTRICTIONS: { value: DietaryRestriction; label: string }[] = [
  { value: "vegetarian", label: "蛋奶素" },
  { value: "pescatarian", label: "魚素" },
  { value: "no_pork", label: "不吃豬肉" },
  { value: "no_beef", label: "不吃牛肉" },
  { value: "no_seafood", label: "不吃海鮮" },
  { value: "no_nuts", label: "堅果過敏" },
  { value: "no_dairy", label: "乳製品不耐" },
  { value: "no_gluten", label: "無麩質" },
];

const EQUIPMENT: { value: KitchenEquipment; label: string }[] = [
  { value: "stove", label: "瓦斯 / 電爐" },
  { value: "oven", label: "烤箱" },
  { value: "air_fryer", label: "氣炸鍋" },
  { value: "rice_cooker", label: "電子鍋 / 電鍋" },
  { value: "sous_vide", label: "舒肥機" },
  { value: "microwave", label: "微波爐" },
  { value: "instant_pot", label: "壓力鍋" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const existingProfile = typeof window !== "undefined" ? localStore.getProfile() : null;
  const existingGoal = typeof window !== "undefined" ? localStore.getGoal() : null;

  const [profile, setProfile] = useState<Profile>(
    existingProfile ?? {
      sex: "male",
      age: 30,
      heightCm: 170,
      activityLevel: "moderate",
      restrictions: [],
      equipment: ["stove", "rice_cooker"],
      dislikedIngredients: [],
    },
  );

  const [goal, setGoal] = useState<Goal>(
    existingGoal ?? {
      currentWeightKg: 70,
      currentBodyFatPct: 22,
      targetWeightKg: 65,
      targetBodyFatPct: 18,
      targetDate: new Date(Date.now() + 12 * 7 * 86_400_000).toISOString().slice(0, 10),
      description: "",
    },
  );

  function toggle<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    localStore.setProfile(profile);
    localStore.setGoal({ ...goal, targetDate: new Date(goal.targetDate).toISOString() });
    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h1 className="text-2xl font-bold">個人資料與目標</h1>

      <Card className="space-y-4">
        <h2 className="font-semibold">基本資料</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="性別">
            <Select
              value={profile.sex}
              onChange={(e) => setProfile({ ...profile, sex: e.target.value as Sex })}
            >
              <option value="male">男性</option>
              <option value="female">女性</option>
            </Select>
          </Field>
          <Field label="年齡">
            <Input
              type="number"
              min={13}
              max={100}
              value={profile.age}
              onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
              required
            />
          </Field>
          <Field label="身高 (cm)">
            <Input
              type="number"
              min={100}
              max={230}
              value={profile.heightCm}
              onChange={(e) =>
                setProfile({ ...profile, heightCm: Number(e.target.value) })
              }
              required
            />
          </Field>
          <Field label="活動量">
            <Select
              value={profile.activityLevel}
              onChange={(e) =>
                setProfile({ ...profile, activityLevel: e.target.value as ActivityLevel })
              }
            >
              {ACTIVITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">飲食限制與廚房設備</h2>
        <Field label="飲食限制 / 過敏">
          <div className="flex flex-wrap gap-2">
            {RESTRICTIONS.map((r) => {
              const active = profile.restrictions.includes(r.value);
              return (
                <button
                  type="button"
                  key={r.value}
                  onClick={() =>
                    setProfile({
                      ...profile,
                      restrictions: toggle(profile.restrictions, r.value),
                    })
                  }
                  className={
                    active
                      ? "rounded-full bg-brand-600 px-3 py-1 text-sm text-white"
                      : "rounded-full border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
                  }
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="廚房設備（有打勾才會出現在食譜建議中）">
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((e) => {
              const active = profile.equipment.includes(e.value);
              return (
                <button
                  type="button"
                  key={e.value}
                  onClick={() =>
                    setProfile({
                      ...profile,
                      equipment: toggle(profile.equipment, e.value),
                    })
                  }
                  className={
                    active
                      ? "rounded-full bg-brand-600 px-3 py-1 text-sm text-white"
                      : "rounded-full border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
                  }
                >
                  {e.label}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="不想吃的食材（用逗號分隔）" hint="例：青椒, 苦瓜">
          <Input
            value={profile.dislikedIngredients.join(", ")}
            onChange={(e) =>
              setProfile({
                ...profile,
                dislikedIngredients: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">目前狀況與目標</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="目前體重 (kg)">
            <Input
              type="number"
              step="0.1"
              value={goal.currentWeightKg}
              onChange={(e) =>
                setGoal({ ...goal, currentWeightKg: Number(e.target.value) })
              }
              required
            />
          </Field>
          <Field label="目前體脂率 (%)">
            <Input
              type="number"
              step="0.1"
              value={goal.currentBodyFatPct}
              onChange={(e) =>
                setGoal({ ...goal, currentBodyFatPct: Number(e.target.value) })
              }
              required
            />
          </Field>
          <Field label="目標體重 (kg)">
            <Input
              type="number"
              step="0.1"
              value={goal.targetWeightKg}
              onChange={(e) =>
                setGoal({ ...goal, targetWeightKg: Number(e.target.value) })
              }
              required
            />
          </Field>
          <Field label="目標體脂率 (%)">
            <Input
              type="number"
              step="0.1"
              value={goal.targetBodyFatPct}
              onChange={(e) =>
                setGoal({ ...goal, targetBodyFatPct: Number(e.target.value) })
              }
              required
            />
          </Field>
          <Field label="目標達成日期">
            <Input
              type="date"
              value={goal.targetDate.slice(0, 10)}
              onChange={(e) => setGoal({ ...goal, targetDate: e.target.value })}
              required
            />
          </Field>
          <Field label="體態描述（自由填寫）" hint="例：腰圍 30 吋、體態緊實">
            <Input
              value={goal.description ?? ""}
              onChange={(e) => setGoal({ ...goal, description: e.target.value })}
            />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">儲存並查看計畫</Button>
      </div>
    </form>
  );
}
