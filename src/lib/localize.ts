import type { RecipeDetail, RecipeSummary } from "@/types/recipe"

// The detected language can carry a region ("en-US"), translations are keyed by language only
function translationFor<T>(translations: { [lang: string]: T } | undefined, lang: string): T | undefined {
  return translations?.[lang] ?? translations?.[lang.slice(0, 2)]
}

export function localizeRecipeSummary(recipe: RecipeSummary, lang: string): RecipeSummary {
  const t = translationFor(recipe.translations, lang)
  if (!t) return recipe
  return {
    ...recipe,
    title: t.title ?? recipe.title,
    description: t.description ?? recipe.description,
    tags: t.tags ?? recipe.tags,
  }
}

export function localizeRecipeDetail(recipe: RecipeDetail, lang: string): RecipeDetail {
  const t = translationFor(recipe.translations, lang)
  if (!t) return recipe
  return {
    ...recipe,
    title: t.title ?? recipe.title,
    description: t.description ?? recipe.description,
    tags: t.tags ?? recipe.tags,
    ingredients: t.ingredients ?? recipe.ingredients,
    // Timers are only stored on the base steps: keep them on the translated step at the same position
    steps: t.steps ? t.steps.map((step, i) => ({ ...step, timers: recipe.steps[i]?.timers })) : recipe.steps,
    tips: t.tips ?? recipe.tips,
    history: t.history ?? recipe.history,
  }
}
