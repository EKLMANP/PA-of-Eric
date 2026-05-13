"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Input } from "@/components/ui";
import { RECIPES } from "@/data/recipes";
import { statsForRecipe } from "@/lib/meal-planner";
import { cn } from "@/lib/cn";
import type { DietaryRestriction, KitchenEquipment } from "@/lib/types";

const MEAL_TYPES = [
  { value: "all", label: "全部" },
  { value: "breakfast", label: "早餐" },
  { value: "any", label: "午晚餐" },
] as const;

const RESTRICTION_FILTERS: { value: DietaryRestriction; label: string }[] = [
  { value: "vegetarian", label: "蛋奶素" },
  { value: "pescatarian", label: "魚素" },
  { value: "no_pork", label: "無豬" },
  { value: "no_beef", label: "無牛" },
  { value: "no_seafood", label: "無海鮮" },
  { value: "no_gluten", label: "無麩質" },
];

const EQUIPMENT_FILTERS: { value: KitchenEquipment; label: string }[] = [
  { value: "stove", label: "爐火" },
  { value: "oven", label: "烤箱" },
  { value: "air_fryer", label: "氣炸鍋" },
  { value: "rice_cooker", label: "電鍋" },
];

export default function RecipesPage() {
  const [search, setSearch] = useState("");
  const [mealType, setMealType] = useState<"all" | "breakfast" | "any">("all");
  const [restrictionFilter, setRestrictionFilter] = useState<DietaryRestriction | "">("");
  const [equipmentFilter, setEquipmentFilter] = useState<KitchenEquipment | "">("");

  const filtered = useMemo(() => {
    return RECIPES.filter((r) => {
      if (search && !r.name.includes(search) && !r.tags.some((t) => t.includes(search))) {
        return false;
      }
      if (mealType !== "all" && r.mealType !== mealType) return false;
      if (restrictionFilter && !r.restrictions.includes(restrictionFilter)) return false;
      if (equipmentFilter && !r.equipment.includes(equipmentFilter)) return false;
      return true;
    });
  }, [search, mealType, restrictionFilter, equipmentFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">食譜庫</h1>
        <span className="text-sm text-gray-500">{filtered.length} / {RECIPES.length} 道</span>
      </div>

      {/* Filters */}
      <Card className="space-y-3">
        <Input
          placeholder="搜尋食譜名稱或標籤…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPES.map((t) => (
            <FilterChip
              key={t.value}
              active={mealType === t.value}
              onClick={() => setMealType(t.value)}
            >
              {t.label}
            </FilterChip>
          ))}
          <span className="text-gray-300 dark:text-gray-600 self-center">|</span>
          {RESTRICTION_FILTERS.map((r) => (
            <FilterChip
              key={r.value}
              active={restrictionFilter === r.value}
              onClick={() =>
                setRestrictionFilter((prev) => (prev === r.value ? "" : r.value))
              }
            >
              {r.label}
            </FilterChip>
          ))}
          <span className="text-gray-300 dark:text-gray-600 self-center">|</span>
          {EQUIPMENT_FILTERS.map((eq) => (
            <FilterChip
              key={eq.value}
              active={equipmentFilter === eq.value}
              onClick={() =>
                setEquipmentFilter((prev) => (prev === eq.value ? "" : eq.value))
              }
            >
              {eq.label}
            </FilterChip>
          ))}
        </div>
      </Card>

      {filtered.length === 0 && (
        <Card className="text-center text-gray-500 py-8">
          沒有符合條件的食譜，請調整篩選條件。
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((recipe) => {
          const stats = statsForRecipe(recipe, recipe.servings);
          return (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
              <Card className="h-full hover:border-brand-400 transition cursor-pointer space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-snug">{recipe.name}</h3>
                  <span className="shrink-0 text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5">
                    {recipe.totalMinutes} 分
                  </span>
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-x-2 gap-y-0.5">
                  <span>{stats.calories} kcal</span>
                  <span>蛋白 {stats.proteinG} g</span>
                  <span>存 {recipe.storageDays} 天</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {recipe.mealType !== "any" && (
                    <TagBadge color="blue">
                      {recipe.mealType === "breakfast" ? "早餐" : "午晚餐"}
                    </TagBadge>
                  )}
                  {recipe.tags.slice(0, 3).map((t) => (
                    <TagBadge key={t}>{t}</TagBadge>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1 text-xs text-gray-400">
                  {recipe.equipment.map((eq) => (
                    <span key={eq}>{eq}</span>
                  ))}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs transition",
        active
          ? "bg-brand-600 text-white"
          : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800",
      )}
    >
      {children}
    </button>
  );
}

function TagBadge({ children, color = "gray" }: { children: React.ReactNode; color?: string }) {
  return (
    <span className={cn(
      "rounded-full px-2 py-0.5 text-xs",
      color === "blue"
        ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    )}>
      {children}
    </span>
  );
}
