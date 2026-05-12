import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { INGREDIENTS } from "@/data/ingredients";
import { RECIPES } from "@/data/recipes";
import type { NutritionTargets, Profile, Recipe } from "@/lib/types";

const CustomizedRecipeSchema = z.object({
  recipeId: z.string(),
  customizedName: z.string(),
  swaps: z.array(z.object({ from: z.string(), to: z.string(), reason: z.string() })),
  servingNote: z.string(),
  twoPersonBatchSteps: z.array(z.string()).min(3),
  storageTip: z.string(),
});

export type CustomizedRecipe = z.infer<typeof CustomizedRecipeSchema>;

const SYSTEM_PROMPT = `You are a Taiwan-based nutritionist and home-cook assistant.
You optimize batch-cooking recipes that fit:
- Costco Taiwan ingredients only (provided in the user message)
- Two-person meal prep, 6 meals per single 30-minute session
- The user's macro targets and dietary restrictions

Output strict JSON matching the schema. All Chinese text in 繁體中文.`;

function ingredientCatalogSummary(): string {
  return INGREDIENTS.map(
    (i) =>
      `${i.id} (${i.name}) — ${i.costcoPackSize}, NT$${i.costcoPackPriceTwd}, P/C/F per 100g: ${i.proteinPer100g}/${i.carbPer100g}/${i.fatPer100g}`,
  ).join("\n");
}

function recipeBlueprintsSummary(): string {
  return RECIPES.map(
    (r) =>
      `${r.id}: ${r.name} (${r.totalMinutes} min, eq: ${r.equipment.join(",")})`,
  ).join("\n");
}

/**
 * Ask Claude to customize a selected base recipe for the user.
 * Uses cache_control on the static catalog so repeated calls hit cache.
 */
export async function customizeRecipe(args: {
  baseRecipe: Recipe;
  profile: Profile;
  targets: NutritionTargets;
  perMealBudgetTwd: number;
}): Promise<CustomizedRecipe> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      recipeId: args.baseRecipe.id,
      customizedName: args.baseRecipe.name,
      swaps: [],
      servingNote: "未設定 ANTHROPIC_API_KEY，回傳原食譜骨架。",
      twoPersonBatchSteps: args.baseRecipe.steps,
      storageTip: `冷藏 ${args.baseRecipe.storageDays} 天內食用完畢。`,
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `# Costco 食材目錄
${ingredientCatalogSummary()}

# 食譜骨架庫
${recipeBlueprintsSummary()}

# 使用者資料
- 性別 ${args.profile.sex} / 年齡 ${args.profile.age} / 身高 ${args.profile.heightCm} cm
- 活動量 ${args.profile.activityLevel}
- 飲食限制: ${args.profile.restrictions.join(", ") || "無"}
- 不吃: ${args.profile.dislikedIngredients.join(", ") || "無"}
- 廚房設備: ${args.profile.equipment.join(", ")}

# 營養目標
- 每日總熱量 ${args.targets.dailyCalories} kcal
- 蛋白質 ${args.targets.proteinG} g / 碳水 ${args.targets.carbG} g / 脂肪 ${args.targets.fatG} g
- 目標型態 ${args.targets.goalType}

# 預算
- 每餐 NT$${args.perMealBudgetTwd}

# 要做的事
取得骨架 \`${args.baseRecipe.id}\`，為兩人 6 餐批次製作改寫步驟，
- 替換不合飲食限制的食材
- 步驟需顯示平行操作（電鍋與爐火同時）
- 確保 30 分鐘內完成
- 輸出嚴格 JSON：
{
  "recipeId": "${args.baseRecipe.id}",
  "customizedName": "...",
  "swaps": [{"from":"...","to":"...","reason":"..."}],
  "servingNote": "...",
  "twoPersonBatchSteps": ["...","..."],
  "storageTip": "..."
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: userMessage }],
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return JSON");
  const parsed = CustomizedRecipeSchema.parse(JSON.parse(jsonMatch[0]));
  return parsed;
}
