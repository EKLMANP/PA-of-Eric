"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Label, Select } from "@/components/ui";
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

const EIGHT_WEEKS_MS = 8 * 7 * 86_400_000;

function defaultProfile(id: "primary" | "partner", name: string): Profile {
  return {
    id,
    name,
    sex: "male",
    age: 30,
    heightCm: 170,
    activityLevel: "moderate",
    restrictions: [],
    equipment: ["stove", "rice_cooker"],
    dislikedIngredients: [],
  };
}

function defaultGoal(profileId: "primary" | "partner"): Goal {
  return {
    profileId,
    currentWeightKg: 70,
    currentBodyFatPct: 22,
    targetWeightKg: 65,
    targetBodyFatPct: 18,
    targetDate: new Date(Date.now() + EIGHT_WEEKS_MS).toISOString().slice(0, 10),
    description: "",
    currentPhase: 0,
    phaseWeeks: 4,
  };
}

function ProfileForm({
  title,
  profile,
  goal,
  onChange,
}: {
  title: string;
  profile: Profile;
  goal: Goal;
  onChange: (p: Profile, g: Goal) => void;
}) {
  function toggle<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function p(patch: Partial<Profile>) {
    onChange({ ...profile, ...patch }, goal);
  }
  function g(patch: Partial<Goal>) {
    onChange(profile, { ...goal, ...patch });
  }

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold text-lg">{title}</h2>

      <Field label="名稱 / 暱稱">
        <Input value={profile.name} onChange={(e) => p({ name: e.target.value })} required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="性別">
          <Select value={profile.sex} onChange={(e) => p({ sex: e.target.value as Sex })}>
            <option value="male">男性</option>
            <option value="female">女性</option>
          </Select>
        </Field>
        <Field label="年齡">
          <Input type="number" min={13} max={100} value={profile.age}
            onChange={(e) => p({ age: Number(e.target.value) })} required />
        </Field>
        <Field label="身高 (cm)">
          <Input type="number" min={100} max={230} value={profile.heightCm}
            onChange={(e) => p({ heightCm: Number(e.target.value) })} required />
        </Field>
      </div>

      <Field label="活動量">
        <Select value={profile.activityLevel}
          onChange={(e) => p({ activityLevel: e.target.value as ActivityLevel })}>
          {ACTIVITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="目前體重 (kg)">
          <Input type="number" step="0.1" value={goal.currentWeightKg}
            onChange={(e) => g({ currentWeightKg: Number(e.target.value) })} required />
        </Field>
        <Field label="目前體脂率 (%)">
          <Input type="number" step="0.1" value={goal.currentBodyFatPct}
            onChange={(e) => g({ currentBodyFatPct: Number(e.target.value) })} required />
        </Field>
        <Field label="目標體重 (kg)">
          <Input type="number" step="0.1" value={goal.targetWeightKg}
            onChange={(e) => g({ targetWeightKg: Number(e.target.value) })} required />
        </Field>
        <Field label="目標體脂率 (%)">
          <Input type="number" step="0.1" value={goal.targetBodyFatPct}
            onChange={(e) => g({ targetBodyFatPct: Number(e.target.value) })} required />
        </Field>
        <Field label="目標達成日期">
          <Input type="date" value={goal.targetDate.slice(0, 10)}
            onChange={(e) => g({ targetDate: e.target.value })} required />
        </Field>
        <Field label="體態描述（選填）" hint="例：腰圍 30 吋、體態緊實">
          <Input value={goal.description ?? ""}
            onChange={(e) => g({ description: e.target.value })} />
        </Field>
      </div>

      <Field label="飲食限制 / 過敏">
        <div className="flex flex-wrap gap-2 mt-1">
          {RESTRICTIONS.map((r) => {
            const active = profile.restrictions.includes(r.value);
            return (
              <button type="button" key={r.value}
                onClick={() => p({ restrictions: toggle(profile.restrictions, r.value) })}
                className={active
                  ? "rounded-full bg-brand-600 px-3 py-1 text-sm text-white"
                  : "rounded-full border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"}>
                {r.label}
              </button>
            );
          })}
        </div>
      </Field>

      {profile.id === "primary" && (
        <Field label="廚房設備（影響食譜建議）">
          <div className="flex flex-wrap gap-2 mt-1">
            {EQUIPMENT.map((eq) => {
              const active = profile.equipment.includes(eq.value);
              return (
                <button type="button" key={eq.value}
                  onClick={() => p({ equipment: toggle(profile.equipment, eq.value) })}
                  className={active
                    ? "rounded-full bg-brand-600 px-3 py-1 text-sm text-white"
                    : "rounded-full border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"}>
                  {eq.label}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      <Field label="不想吃的食材（逗號分隔）" hint="例：青椒, 苦瓜">
        <Input
          value={profile.dislikedIngredients.join(", ")}
          onChange={(e) =>
            p({
              dislikedIngredients: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
        />
      </Field>
    </Card>
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  const [primaryProfile, setPrimaryProfile] = useState<Profile>(
    () => localStore.getPrimaryProfile() ?? defaultProfile("primary", "我"),
  );
  const [primaryGoal, setPrimaryGoal] = useState<Goal>(
    () => localStore.getPrimaryGoal() ?? defaultGoal("primary"),
  );

  const [hasPartner, setHasPartner] = useState(
    () => localStore.getPartnerProfile() !== null,
  );
  const [partnerProfile, setPartnerProfile] = useState<Profile>(
    () => localStore.getPartnerProfile() ?? defaultProfile("partner", "另一半"),
  );
  const [partnerGoal, setPartnerGoal] = useState<Goal>(
    () => localStore.getPartnerGoal() ?? defaultGoal("partner"),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    localStore.upsertProfile(primaryProfile);
    localStore.upsertGoal({
      ...primaryGoal,
      targetDate: new Date(primaryGoal.targetDate).toISOString(),
    });
    if (hasPartner) {
      localStore.upsertProfile(partnerProfile);
      localStore.upsertGoal({
        ...partnerGoal,
        targetDate: new Date(partnerGoal.targetDate).toISOString(),
      });
    } else {
      localStore.removePartner();
    }
    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h1 className="text-2xl font-bold">個人資料與目標</h1>

      <ProfileForm
        title="主要使用者"
        profile={primaryProfile}
        goal={primaryGoal}
        onChange={(p, g) => { setPrimaryProfile(p); setPrimaryGoal(g); }}
      />

      {hasPartner ? (
        <>
          <ProfileForm
            title="另一半 / 同伴"
            profile={partnerProfile}
            goal={partnerGoal}
            onChange={(p, g) => { setPartnerProfile(p); setPartnerGoal(g); }}
          />
          <button
            type="button"
            onClick={() => setHasPartner(false)}
            className="text-sm text-rose-600 hover:underline"
          >
            移除同伴
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setHasPartner(true)}
          className="text-sm text-brand-700 hover:underline"
        >
          + 加入另一半 / 同伴（合併菜單）
        </button>
      )}

      <Card className="space-y-2">
        <Label>週採購預算 (NT$)</Label>
        <Input
          type="number"
          min={300}
          max={10000}
          defaultValue={localStore.getWeeklyBudget()}
          onChange={(e) => localStore.setWeeklyBudget(Number(e.target.value))}
        />
        <p className="text-xs text-gray-500">此為全週食材成本（依實際使用克數）上限</p>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">儲存並查看計畫</Button>
      </div>
    </form>
  );
}
