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
