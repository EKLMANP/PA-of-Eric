import { NextResponse } from "next/server";
import { z } from "zod";
import { findRecipe } from "@/data/recipes";
import { computeNutritionTargets } from "@/lib/nutrition";
import { customizeRecipe } from "@/lib/ai/recipe";
import type { Goal, Profile } from "@/lib/types";

const BodySchema = z.object({
  recipeId: z.string(),
  profile: z.any(),
  goal: z.any(),
  weeklyBudgetTwd: z.number(),
  numPeople: z.number(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new NextResponse("Bad request: " + parsed.error.message, { status: 400 });
  }

  const { recipeId, profile, goal, weeklyBudgetTwd, numPeople } = parsed.data;

  let recipe;
  try {
    recipe = findRecipe(recipeId);
  } catch {
    return new NextResponse(`Unknown recipe: ${recipeId}`, { status: 404 });
  }

  const targets = computeNutritionTargets(profile as Profile, goal as Goal);

  try {
    const result = await customizeRecipe({
      baseRecipe: recipe,
      profile: profile as Profile,
      targets,
      perMealBudgetTwd: Math.round(weeklyBudgetTwd / 6),
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new NextResponse(msg, { status: 500 });
  }
}
