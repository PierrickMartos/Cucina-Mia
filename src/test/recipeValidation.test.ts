// @vitest-environment node
import { readFileSync, readdirSync } from "fs"
import { resolve } from "path"
import { describe, it, expect } from "vitest"
import { RecipeDetailSchema, RecipeIndexSchema } from "@/lib/recipeSchema"
import { scaleIngredient } from "@/lib/scaleIngredient"
import type { RecipeDetail } from "@/types/recipe"

const DATA_DIR = resolve(__dirname, "../../public/data/recipes")

describe("recipe index", () => {
  it("index.json is valid", () => {
    const raw = readFileSync(resolve(DATA_DIR, "index.json"), "utf-8")
    const data = JSON.parse(raw)
    const result = RecipeIndexSchema.safeParse(data)
    if (!result.success) {
      throw new Error(
        `index.json validation failed:\n${result.error.issues
          .map((i) => `  [${i.path.join(".")}] ${i.message}`)
          .join("\n")}`
      )
    }
    expect(result.success).toBe(true)
  })
})

describe("recipe detail files", () => {
  const slugs: string[] = readdirSync(DATA_DIR)
    .filter((f: string) => f.endsWith(".json") && f !== "index.json")
    .map((f: string) => f.replace(".json", ""))

  it.each(slugs)("%s.json is valid", (...args: unknown[]) => {
    const slug = args[0] as string
    const raw = readFileSync(resolve(DATA_DIR, `${slug}.json`), "utf-8")
    const data = JSON.parse(raw)
    const result = RecipeDetailSchema.safeParse(data)
    if (!result.success) {
      throw new Error(
        `${slug}.json validation failed:\n${result.error.issues
          .map((i) => `  [${i.path.join(".")}] ${i.message}`)
          .join("\n")}`
      )
    }
    expect(result.success).toBe(true)
  })
})

// Servings scaling parses the quantities at the start of each ingredient line (see src/lib/scaleIngredient.ts).
// A translation must keep them where the French line has them, or the same recipe scales in one language only.
describe("ingredient quantities scale in every language", () => {
  const slugs: string[] = readdirSync(DATA_DIR)
    .filter((f: string) => f.endsWith(".json") && f !== "index.json")
    .map((f: string) => f.replace(".json", ""))

  it.each(slugs)("%s", (...args: unknown[]) => {
    const slug = args[0] as string
    const recipe: RecipeDetail = JSON.parse(readFileSync(resolve(DATA_DIR, `${slug}.json`), "utf-8"))
    const scales = (item: string, lang: string) => scaleIngredient(item, 2, lang) !== item
    const base = recipe.ingredients.flatMap((group) => group.items.map((item) => scales(item, "fr")))
    const mismatches: string[] = []
    for (const [lang, translation] of Object.entries(recipe.translations ?? {})) {
      const items = translation.ingredients?.flatMap((group) => group.items) ?? []
      if (items.length !== base.length) continue
      items.forEach((item, i) => {
        if (scales(item, lang) !== base[i]) mismatches.push(`${lang}[${i}] "${item}" (fr scales: ${base[i]})`)
      })
    }
    expect(mismatches).toEqual([])
  })
})

describe("recipe cross-checks", () => {
  const recipes = readdirSync(DATA_DIR)
    .filter((f: string) => f.endsWith(".json") && f !== "index.json")
    .map((f: string) => JSON.parse(readFileSync(resolve(DATA_DIR, f), "utf-8")))
  const slugs = new Set(recipes.map((r) => r.slug as string))

  it.each(recipes.map((r) => [r.slug, r]))("%s has 3-4 valid related recipes", (...args: unknown[]) => {
    const [slug, recipe] = args as [string, { related?: string[] }]
    const related = recipe.related ?? []
    expect(related.length, "related must list 3 to 4 slugs").toBeGreaterThanOrEqual(3)
    expect(related.length).toBeLessThanOrEqual(4)
    expect(related, "related must not include the recipe itself").not.toContain(slug)
    expect(new Set(related).size, "related must not contain duplicates").toBe(related.length)
    for (const other of related) expect(slugs.has(other), `unknown related slug "${other}"`).toBe(true)
  })

  it.each(recipes.map((r) => [r.slug, r]))("%s timers match its steps", (...args: unknown[]) => {
    const [, recipe] = args as [
      string,
      { steps: { text: string; timers?: number[] }[]; translations?: Record<string, { steps?: unknown[] }> },
    ]
    // Translated steps reuse the base timers by position, so they must stay aligned
    for (const [lang, translation] of Object.entries(recipe.translations ?? {})) {
      if (translation.steps) expect(translation.steps.length, `${lang} steps count`).toBe(recipe.steps.length)
    }
    // A timer is always backed by a duration written in the step
    recipe.steps.forEach((step, i) => {
      if (!step.timers) return
      expect(step.text, `step ${i + 1} has timers but no duration in its text`).toMatch(
        /\b(\d+|une?|quinzaine|dizaine|vingtaine|demi)[- ]?(h|heures?|min|minutes?|mn|s|secondes?)\b|minutes/i
      )
    })
  })
})
