"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { buildShoppingList } from "@/lib/shopping";
import { localStore } from "@/lib/storage";
import type { MealPlan } from "@/lib/types";

export default function ShoppingPage() {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  useEffect(() => setPlan(localStore.getPlan()), []);

  const result = useMemo(() => (plan ? buildShoppingList(plan) : null), [plan]);

  if (!plan) {
    return (
      <Card className="text-center space-y-3">
        <h2 className="font-semibold">尚未產生本週菜單</h2>
        <Link href="/plan"
          className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-white text-sm">
          前往產生
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Costco 採購清單</h1>
        <div className="flex gap-2 no-print">
          <Button variant="secondary" onClick={() => window.print()}>
            列印 / PDF
          </Button>
          <Link href="/plan"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
            返回菜單
          </Link>
        </div>
      </div>

      <Card>
        <p className="text-sm text-gray-500">本週（{plan.weekStart}）Costco 採購總價</p>
        <p className="mt-1 text-3xl font-bold">NT$ {result!.totalCostTwd.toLocaleString()}</p>
        <p className="mt-1 text-xs text-gray-500">
          食材成本（依使用克數）：NT$ {plan.totalIngredientCostTwd.toLocaleString()} ·
          差額為 Costco 大包裝的延用量，可冷凍備用。
        </p>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-800/60">
            <tr>
              <th className="px-4 py-2">食材</th>
              <th className="px-4 py-2 text-right">需用量</th>
              <th className="px-4 py-2 text-right">買幾包</th>
              <th className="px-4 py-2 text-right">小計</th>
              <th className="px-4 py-2 text-right">剩餘可留用</th>
            </tr>
          </thead>
          <tbody>
            {result!.items.map((item) => (
              <tr key={item.ingredientId} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3">
                  <div className="font-medium">{item.name}</div>
                  {item.freezable && (
                    <div className="text-xs text-gray-400">可冷凍延用</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">{item.totalGramsNeeded.toLocaleString()} g</td>
                <td className="px-4 py-3 text-right font-medium">{item.packsToBuy}</td>
                <td className="px-4 py-3 text-right font-medium">
                  NT$ {item.estimatedCostTwd.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-xs text-gray-500">
                  {item.leftoverGrams.toLocaleString()} g
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
