import type { RecipeDetail, RecipeSummary } from "@/types/recipe"

export function localizeRecipeSummary(recipe: RecipeSummary, lang: string): RecipeSummary {
  const t = recipe.translations?.[lang]
  if (!t) return recipe
  return {
    ...recipe,
    title: t.title ?? recipe.title,
    description: t.description ?? recipe.description,
    tags: t.tags ?? recipe.tags,
  }
}

export function localizeRecipeDetail(recipe: RecipeDetail, lang: string): RecipeDetail {
  const t = recipe.translations?.[lang]
  if (!t) return recipe
  return {
    ...recipe,
    title: t.title ?? recipe.title,
    description: t.description ?? recipe.description,
    tags: t.tags ?? recipe.tags,
    ingredients: t.ingredients ?? recipe.ingredients,
    steps: t.steps ?? recipe.steps,
    tips: t.tips ?? recipe.tips,
    history: t.history ?? recipe.history,
  }
}
