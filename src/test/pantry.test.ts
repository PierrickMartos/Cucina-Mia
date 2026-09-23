// "What can I make with…" (src/lib/pantry.ts): catalog audit against the real recipes and ranking.
// When a new recipe adds an ingredient the catalog does not know, the audit lists the line: add a
// pattern to an existing item, or a new item (with its fr/en/it labels).
//   npx vitest run src/test/pantry.test.ts
import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import {
  PANTRY_ITEMS,
  matchIngredientLine,
  parsePantryDocuments,
  rankByPantry,
  recipeNeeds,
  usedItems,
  type PantryNeeds,
} from "@/lib/pantry"
import type { RecipeDetail } from "@/types/recipe"

const dir = "public/data/recipes"
const details: RecipeDetail[] = readdirSync(dir)
  .filter((file) => file.endsWith(".json") && file !== "index.json")
  .map((file) => JSON.parse(readFileSync(`${dir}/${file}`, "utf8")))

// Same text as documents.json (scripts/build-search-index.mjs)
const clean = (item: string) => item.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim()
const englishLines = (recipe: RecipeDetail) =>
  (recipe.translations?.en?.ingredients ?? recipe.ingredients).flatMap((g) => g.items).map(clean)

const realNeeds: PantryNeeds = new Map(details.map((d) => [d.slug, recipeNeeds(englishLines(d))]))

describe("pantry catalog audit", () => {
  it("has an English ingredient list aligned with the French one for every recipe", () => {
    const misaligned = details
      .filter((d) => {
        const en = d.translations?.en?.ingredients
        return !en || en.flatMap((g) => g.items).length !== d.ingredients.flatMap((g) => g.items).length
      })
      .map((d) => d.slug)
    expect(misaligned).toEqual([])
  })

  it("recognises every ingredient line", () => {
    const unknown = [...realNeeds].flatMap(([slug, needs]) =>
      needs.filter((need) => need.items.length === 0).map((need) => `${slug}: ${need.text}`)
    )
    expect(unknown).toEqual([])
  })

  it("has unique ids and no unused item", () => {
    const ids = PANTRY_ITEMS.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    const used = new Set(usedItems(realNeeds).map(({ item }) => item.id))
    expect(ids.filter((id) => !used.has(id))).toEqual([])
  })
})

describe("matchIngredientLine", () => {
  it("prefers the longest pattern", () => {
    expect(matchIngredientLine("400 ml coconut milk")).toEqual(["coconut-milk"])
    expect(matchIngredientLine("1 red bell pepper, diced")).toEqual(["bell-pepper"])
    expect(matchIngredientLine("2 sweet potatoes")).toEqual(["sweet-potato"])
    expect(matchIngredientLine("3 tablespoons rice vinegar")).toEqual(["vinegar"])
    expect(matchIngredientLine("4 ladles pasta cooking water")).toEqual(["staple"])
  })

  it("folds plurals and accents", () => {
    expect(matchIngredientLine("3 eggs")).toEqual(["eggs"])
    expect(matchIngredientLine("6 egg yolks")).toEqual(["eggs"])
    expect(matchIngredientLine("2 tbsp crème fraîche")).toEqual(["creme-fraiche"])
    expect(matchIngredientLine("Tomatoes")).toEqual(["tomato"])
  })
})

describe("recipeNeeds", () => {
  it("skips staples, groups alternatives and splits combined lines", () => {
    expect(
      recipeNeeds([
        "Salt and pepper",
        "Butter or oil for cooking",
        "200 g spaghetti or rigatoni",
        "Parmesan or gruyère for topping",
        "Lemon juice and chopped parsley",
        "50 g unsalted butter with salt crystals",
        "2 eggs",
        "1 egg yolk",
      ]).map((need) => need.items)
    ).toEqual([["pasta"], ["parmesan", "comte"], ["lemon"], ["parsley"], ["butter"], ["eggs"]])
  })

  it("keeps unknown lines as needs", () => {
    expect(recipeNeeds(["1 dragon fruit"])).toEqual([{ items: [], text: "1 dragon fruit" }])
  })
})

describe("rankByPantry", () => {
  const needs = parsePantryDocuments([
    { slug: "omelette", ingredients: { en: "3 eggs · 1 knob of butter · Salt and pepper" } },
    { slug: "cake", ingredients: { en: "3 eggs · 200 g flour · 150 g sugar · 100 g butter" } },
    { slug: "carbonara", ingredients: { en: "200 g spaghetti · 3 egg yolks · 50 g grated pecorino · 100 g guanciale" } },
    { slug: "salad", ingredients: { en: "1 lettuce · 2 tomatoes" } },
  ])

  it("returns nothing when nothing is ticked", () => {
    expect(rankByPantry(needs, new Set())).toEqual([])
  })

  it("ranks by ticked ingredients used, then by what is missing", () => {
    const ranked = rankByPantry(needs, new Set(["eggs", "butter", "flour"]))
    expect(ranked.map((r) => r.slug)).toEqual(["cake", "omelette", "carbonara"])
    expect(ranked[0].matched.sort()).toEqual(["butter", "eggs", "flour"])
    expect(ranked[0].missing.map((need) => need.items)).toEqual([["sugar"]])
    expect(ranked[1]).toMatchObject({ matched: ["eggs", "butter"], missing: [], total: 2 })
  })

  it("can put the most complete recipes first", () => {
    const ranked = rankByPantry(needs, new Set(["eggs", "butter", "flour"]), "missing")
    expect(ranked.map((r) => r.slug)).toEqual(["omelette", "cake", "carbonara"])
  })

  it("finds the real cookbook's pasta dishes from eggs, pasta and pecorino", () => {
    const ranked = rankByPantry(realNeeds, new Set(["eggs", "pasta", "pecorino", "guanciale"]))
    expect(ranked[0].slug).toBe("pasta-carbonara")
  })
})
