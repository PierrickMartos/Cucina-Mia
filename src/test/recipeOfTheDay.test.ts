import { describe, it, expect } from "vitest"
import { recipeOfTheDay } from "@/lib/recipeOfTheDay"
import type { RecipeSummary } from "@/types/recipe"

const recipes = Array.from({ length: 50 }, (_, i) => ({ slug: `recipe-${i}` }) as RecipeSummary)

describe("recipeOfTheDay", () => {
  it("returns nothing without recipes", () => {
    expect(recipeOfTheDay([], new Date(2026, 10, 11))).toBeUndefined()
  })

  it("keeps the same recipe all day", () => {
    const morning = recipeOfTheDay(recipes, new Date(2026, 10, 11, 0, 0, 1))
    const evening = recipeOfTheDay(recipes, new Date(2026, 10, 11, 23, 59, 59))
    expect(morning).toBeDefined()
    expect(evening).toBe(morning)
  })

  it("changes from one day to the next and covers the list over time", () => {
    const slugs = Array.from({ length: 365 }, (_, day) => recipeOfTheDay(recipes, new Date(2026, 0, 1 + day))!.slug)
    const repeatedNextDay = slugs.filter((slug, i) => i > 0 && slug === slugs[i - 1]).length
    expect(repeatedNextDay).toBeLessThan(20)
    expect(new Set(slugs).size).toBeGreaterThan(45)
  })
})
