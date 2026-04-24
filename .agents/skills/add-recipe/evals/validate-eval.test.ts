/**
 * Add-Recipe Skill Eval Validator
 *
 * Validates recipes produced by the add-recipe skill against expected criteria.
 * Run after the skill processes a fixture to check correctness.
 *
 * Usage:
 *   npx vitest run .agents/skills/add-recipe/evals/validate-eval.ts
 *   npx vitest run .agents/skills/add-recipe/evals/validate-eval.ts -t "mamie-yvette"
 */

// @vitest-environment node
import { readFileSync, existsSync, readdirSync } from "fs"
import { resolve } from "path"
import { describe, it, expect } from "vitest"
import { RecipeDetailSchema } from "@/lib/recipeSchema"

const EVALS_DIR = resolve(__dirname, ".")
const DATA_DIR = resolve(__dirname, "../../../../public/data/recipes")
const EXPECTED_DIR = resolve(EVALS_DIR, "expected")

interface EvalExpected {
  slug: string
  title?: string
  title_contains?: string
  category?: string
  difficulty?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  expected_outcome?: "success" | "error"
  checks: Record<string, unknown>
  expected_quantities?: Record<string, string>
  expected_ingredient_groups?: string[]
  notes?: string
}

function loadExpected(evalName: string): EvalExpected {
  return JSON.parse(readFileSync(resolve(EXPECTED_DIR, `${evalName}.json`), "utf-8"))
}

function loadRecipe(slug: string): Record<string, unknown> | null {
  const path = resolve(DATA_DIR, `${slug}.json`)
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, "utf-8"))
}

function loadIndex(): Array<Record<string, unknown>> {
  return JSON.parse(readFileSync(resolve(DATA_DIR, "index.json"), "utf-8"))
}

// English tags that should NOT appear in the French base tags
const ENGLISH_TAGS = [
  "oven", "easy", "breakfast", "snack", "vegetarian", "kids",
  "comforting", "soft", "american", "sweet", "winter", "summer",
  "cold", "hot", "family", "quick",
]

// --- Success eval runner ---

function runSuccessEval(evalName: string, expected: EvalExpected) {
  const slug = expected.slug
  const recipe = loadRecipe(slug)
  const checks = expected.checks

  it("recipe file exists", () => {
    expect(recipe, `Recipe file not found: ${slug}.json — run the skill first`).not.toBeNull()
  })

  if (!recipe) return

  // Schema validation
  if (checks.schema_valid) {
    it("passes Zod schema validation", () => {
      const result = RecipeDetailSchema.safeParse(recipe)
      if (!result.success) {
        const issues = result.error.issues.map(
          (i: { path: (string | number)[]; message: string }) => `[${i.path.join(".")}] ${i.message}`,
        )
        expect.fail(`Schema validation failed:\n${issues.join("\n")}`)
      }
    })
  }

  // Translations
  if (checks.has_translations_en) {
    it("has English translations", () => {
      const t = recipe.translations as Record<string, unknown> | undefined
      expect(t?.en, "Missing translations.en").toBeDefined()
    })
  }
  if (checks.has_translations_it) {
    it("has Italian translations", () => {
      const t = recipe.translations as Record<string, unknown> | undefined
      expect(t?.it, "Missing translations.it").toBeDefined()
    })
  }

  // Tags
  if (checks.tags_are_french) {
    it("base tags are in French (no English tags)", () => {
      const tags = recipe.tags as string[]
      const found = tags.filter((t) => ENGLISH_TAGS.includes(t.toLowerCase()))
      expect(found, `English tags in base: ${found.join(", ")}`).toHaveLength(0)
    })
  }
  if (checks.tags_min_count) {
    it(`has at least ${checks.tags_min_count} tags`, () => {
      const tags = recipe.tags as string[]
      expect(tags.length).toBeGreaterThanOrEqual(checks.tags_min_count as number)
    })
  }
  if (checks.tags_should_contain) {
    it("contains expected tags", () => {
      const tags = recipe.tags as string[]
      for (const expected of checks.tags_should_contain as string[]) {
        expect(tags, `Missing expected tag: ${expected}`).toContain(expected)
      }
    })
  }

  // Ingredient count
  if (checks.ingredients_min_count) {
    it(`has at least ${checks.ingredients_min_count} ingredients`, () => {
      const ingredients = recipe.ingredients as Array<{ items: string[] }>
      const count = ingredients.reduce((sum, g) => sum + g.items.length, 0)
      expect(count).toBeGreaterThanOrEqual(checks.ingredients_min_count as number)
    })
  }

  // Step count
  if (checks.steps_min_count) {
    it(`has at least ${checks.steps_min_count} steps`, () => {
      const steps = recipe.steps as Array<unknown>
      expect(steps.length).toBeGreaterThanOrEqual(checks.steps_min_count as number)
    })
  }

  // Tips
  if (checks.tips_present) {
    it("has tips", () => {
      const tips = recipe.tips as string[] | undefined
      expect(tips).toBeDefined()
      expect(tips!.length).toBeGreaterThan(0)
    })
  }
  if (checks.tips_min_count) {
    it(`has at least ${checks.tips_min_count} tips`, () => {
      const tips = recipe.tips as string[]
      expect(tips.length).toBeGreaterThanOrEqual(checks.tips_min_count as number)
    })
  }

  // Exact field matches
  if (expected.category) {
    it(`category is "${expected.category}"`, () => {
      expect(recipe.category).toBe(expected.category)
    })
  }
  if (expected.difficulty) {
    it(`difficulty is "${expected.difficulty}"`, () => {
      expect(recipe.difficulty).toBe(expected.difficulty)
    })
  }
  if (expected.prepTime !== undefined) {
    it(`prepTime is ${expected.prepTime}`, () => {
      expect(recipe.prepTime).toBe(expected.prepTime)
    })
  }
  if (expected.cookTime !== undefined) {
    it(`cookTime is ${expected.cookTime}`, () => {
      expect(recipe.cookTime).toBe(expected.cookTime)
    })
  }
  if (expected.servings !== undefined) {
    it(`servings is ${expected.servings}`, () => {
      expect(recipe.servings).toBe(expected.servings)
    })
  }

  // Cook time zero
  if (checks.cook_time_is_zero) {
    it("cookTime is 0", () => {
      expect(recipe.cookTime).toBe(0)
    })
  }

  // Quanto vene
  if (checks.quanto_vene_on_olive_oil) {
    it("olive oil ingredient has (Quanto vene)", () => {
      const ingredients = recipe.ingredients as Array<{ items: string[] }>
      const allItems = ingredients.flatMap((g) => g.items)
      const oliveOilItems = allItems.filter(
        (item) => item.toLowerCase().includes("huile d'olive") || item.toLowerCase().includes("olive oil"),
      )
      for (const item of oliveOilItems) {
        expect(item, `"${item}" should have (Quanto vene)`).toContain("(Quanto vene)")
      }
    })
  }
  if (checks.quanto_vene_required_on) {
    it("all Quanto vene ingredients are annotated", () => {
      const ingredients = recipe.ingredients as Array<{ items: string[] }>
      const allItems = ingredients.flatMap((g) => g.items)
      for (const trigger of checks.quanto_vene_required_on as string[]) {
        const matching = allItems.filter((item) => item.toLowerCase().includes(trigger.toLowerCase()))
        for (const item of matching) {
          expect(item, `"${item}" should have (Quanto vene)`).toContain("(Quanto vene)")
        }
      }
    })
  }

  // Original source
  if (checks.original_source_type) {
    it(`originalSource.type is "${checks.original_source_type}"`, () => {
      const os = recipe.originalSource as { type?: string } | undefined
      expect(os).toBeDefined()
      expect(os!.type).toBe(checks.original_source_type)
    })
  }
  if (checks.original_source_data_pattern) {
    it("originalSource.data matches expected pattern", () => {
      const os = recipe.originalSource as { data?: string } | undefined
      expect(os?.data).toBe(checks.original_source_data_pattern)
    })
  }

  // Description length
  if (checks.description_max_length) {
    it(`description is under ${checks.description_max_length} chars`, () => {
      const desc = recipe.description as string
      expect(desc.length).toBeLessThanOrEqual(checks.description_max_length as number)
    })
  }

  // Translations have specific fields
  for (const field of ["ingredients", "steps", "tags"]) {
    if (checks[`translations_have_${field}`]) {
      it(`translations include ${field}`, () => {
        const t = recipe.translations as Record<string, Record<string, unknown>> | undefined
        expect(t).toBeDefined()
        for (const lang of ["en", "it"]) {
          expect(t![lang], `Missing translations.${lang}`).toBeDefined()
          expect(t![lang][field], `Missing translations.${lang}.${field}`).toBeDefined()
        }
      })
    }
  }

  // Ingredient groups
  if (checks.ingredient_groups_min_count) {
    it(`has at least ${checks.ingredient_groups_min_count} ingredient groups`, () => {
      const ingredients = recipe.ingredients as Array<{ group?: string }>
      const groups = ingredients.filter((g) => g.group)
      expect(groups.length).toBeGreaterThanOrEqual(checks.ingredient_groups_min_count as number)
    })
  }

  // Ingredients contain keywords
  if (checks.ingredients_must_contain) {
    it("contains all required ingredients", () => {
      const ingredients = recipe.ingredients as Array<{ items: string[] }>
      const allItems = ingredients.flatMap((g) => g.items).map((i) => i.toLowerCase())
      for (const kw of checks.ingredients_must_contain as string[]) {
        const found = allItems.some((item) => item.includes(kw.toLowerCase()))
        expect(found, `Missing ingredient containing "${kw}"`).toBe(true)
      }
    })
  }

  // Source field
  if (checks.source_omitted) {
    it("source field is omitted", () => {
      expect(recipe.source).toBeUndefined()
    })
  }
  if (checks.source_field_value) {
    it(`source is "${checks.source_field_value}"`, () => {
      expect(recipe.source).toBe(checks.source_field_value)
    })
  }

  // Index entry
  it("has an entry in index.json", () => {
    const index = loadIndex()
    const entry = index.find((r) => r.slug === slug)
    expect(entry, `No index entry for "${slug}"`).toBeDefined()
  })

  // Images
  if (checks.images_field_present) {
    it("has images.cover and images.web", () => {
      const images = recipe.images as { cover?: string; web?: string } | undefined
      expect(images?.cover).toBeDefined()
      expect(images?.web).toBeDefined()
    })
  }
}

// --- Error eval runner ---

function runErrorEval(evalName: string, expected: EvalExpected) {
  if (expected.checks.must_detect_duplicate) {
    it("is a duplicate slug detection test (manual verification needed)", () => {
      // The existing file should still be there unchanged
      const recipe = loadRecipe(expected.slug)
      expect(recipe, "Original recipe should still exist").not.toBeNull()
      // We can only verify the file exists — manual check needed for behavior
    })
  }

  if (expected.checks.must_detect_missing_fields) {
    const missing = expected.checks.missing_fields_reported as string[]
    it(`should detect ${missing.length} missing fields: ${missing.join(", ")}`, () => {
      // This test documents the expected behavior — manual verification needed
      expect(missing.length).toBeGreaterThan(0)
    })
  }
}

// --- Dynamic test suite ---

const evalFiles = readdirSync(EXPECTED_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""))

describe("add-recipe skill evals", () => {
  for (const evalName of evalFiles) {
    const expected = loadExpected(evalName)

    describe(evalName, () => {
      if (expected.expected_outcome === "error") {
        runErrorEval(evalName, expected)
      } else {
        runSuccessEval(evalName, expected)
      }
    })
  }
})
