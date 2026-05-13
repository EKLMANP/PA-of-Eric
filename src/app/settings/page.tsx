"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, Input, Label } from "@/components/ui";
import { INGREDIENTS } from "@/data/ingredients";
import { localStore } from "@/lib/storage";
import type { Ingredient, KitchenEquipment } from "@/lib/types";

const EQUIPMENT_LABELS: Record<KitchenEquipment, string> = {
  stove: "瓦斯 / 電爐",
  oven: "烤箱",
  air_fryer: "氣炸鍋",
  rice_cooker: "電子鍋 / 電鍋",
  sous_vide: "舒肥機",
  microwave: "微波爐",
  instant_pot: "壓力鍋",
};

// Per-session price overrides stored in localStorage
const PRICE_KEY = "eatplan.priceOverrides";

function getPriceOverrides(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PRICE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function setPriceOverrides(overrides: Record<string, number>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRICE_KEY, JSON.stringify(overrides));
}

export default function SettingsPage() {
  const [equipment, setEquipment] = useState<KitchenEquipment[]>([]);
  const [budget, setBudget] = useState(1200);
  const [priceOverrides, setPriceOvr] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const profile = localStore.getPrimaryProfile();
    if (profile) setEquipment(profile.equipment);
    setBudget(localStore.getWeeklyBudget());
    setPriceOvr(getPriceOverrides());
  }, []);

  function toggleEquipment(eq: KitchenEquipment) {
    setEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq],
    );
  }

  function handleSave() {
    // Update primary profile equipment
    const primary = localStore.getPrimaryProfile();
    if (primary) {
      localStore.upsertProfile({ ...primary, equipment });
    }
    // Also update partner's equipment to match (shared kitchen)
    const partner = localStore.getPartnerProfile();
    if (partner) {
      localStore.upsertProfile({ ...partner, equipment });
    }
    localStore.setWeeklyBudget(budget);
    setPriceOverrides(priceOverrides);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updatePrice(id: string, value: string) {
    const num = Number(value);
    if (!value || isNaN(num)) {
      const next = { ...priceOverrides };
      delete next[id];
      setPriceOvr(next);
    } else {
      setPriceOvr({ ...priceOverrides, [id]: num });
    }
  }

  const proteinIngredients = INGREDIENTS.filter((i) => i.category === "protein");
  const otherIngredients = INGREDIENTS.filter((i) => i.category !== "protein");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>

      {/* Kitchen Equipment */}
      <Card className="space-y-3">
        <h2 className="font-semibold">廚房設備</h2>
        <p className="text-sm text-gray-500">影響食譜建議範圍，兩人共用同一組設備</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(EQUIPMENT_LABELS) as KitchenEquipment[]).map((eq) => {
            const active = equipment.includes(eq);
            return (
              <button
                key={eq}
                type="button"
                onClick={() => toggleEquipment(eq)}
                className={active
                  ? "rounded-full bg-brand-600 px-3 py-1.5 text-sm text-white"
                  : "rounded-full border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700"}
              >
                {EQUIPMENT_LABELS[eq]}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Weekly Budget */}
      <Card className="space-y-3">
        <h2 className="font-semibold">週採購預算</h2>
        <Field label="每週食材成本上限 (NT$)" hint="依實際使用克數計算，不含 Costco 包裝剩餘">
          <Input
            type="number" min={300} max={10000} step={100}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
        </Field>
      </Card>

      {/* Costco Price Editor */}
      <Card className="space-y-3">
        <h2 className="font-semibold">Costco 食材價格更新</h2>
        <p className="text-sm text-gray-500">
          留空 = 使用預設價格。Costco 調價時在此更新，影響採購清單估算。
        </p>
        <div className="space-y-3">
          <Label>蛋白質食材</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {proteinIngredients.map((ing) => (
              <PriceRow
                key={ing.id}
                ing={ing}
                override={priceOverrides[ing.id]}
                onChange={(v) => updatePrice(ing.id, v)}
              />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Label>其他食材</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {otherIngredients.map((ing) => (
              <PriceRow
                key={ing.id}
                ing={ing}
                override={priceOverrides[ing.id]}
                onChange={(v) => updatePrice(ing.id, v)}
              />
            ))}
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave}>儲存設定</Button>
        {saved && (
          <span className="text-sm text-emerald-600">已儲存</span>
        )}
      </div>
    </div>
  );
}

function PriceRow({
  ing,
  override,
  onChange,
}: {
  ing: Ingredient;
  override?: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{ing.name}</p>
        <p className="text-xs text-gray-400">{ing.costcoPackSize} · 預設 NT${ing.costcoPackPriceTwd}</p>
      </div>
      <div className="w-24">
        <Input
          type="number"
          min={1}
          placeholder={String(ing.costcoPackPriceTwd)}
          value={override ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="text-right text-sm"
        />
      </div>
    </div>
  );
}
