import type { RecipeSummary } from "@/types/recipe"

/** Local calendar day, so the recipe changes at the visitor's midnight. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

// FNV-1a: spreads consecutive days across the whole list instead of walking it in file order
function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** The same recipe for everyone all day long, picked from the date alone (nothing to maintain). */
export function recipeOfTheDay(recipes: RecipeSummary[], date = new Date()): RecipeSummary | undefined {
  if (recipes.length === 0) return undefined
  return recipes[hash(dayKey(date)) % recipes.length]
}
