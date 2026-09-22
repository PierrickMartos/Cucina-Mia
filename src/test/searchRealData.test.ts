// Regression tests on the real cookbook: natural-language queries must return sensible recipes.
import { readFileSync, readdirSync } from "node:fs"
import { describe, it, expect } from "vitest"
import {
  LexicalIndex,
  applyConstraints,
  buildSearchDocuments,
  buildTagAliases,
  mergeResults,
  parseQuery,
} from "@/lib/search"
import type { RecipeDetail, RecipeSummary } from "@/types/recipe"

const dir = "public/data/recipes"
const recipes: RecipeSummary[] = JSON.parse(readFileSync(`${dir}/index.json`, "utf8"))
const details: RecipeDetail[] = readdirSync(dir)
  .filter((file) => file.endsWith(".json") && file !== "index.json")
  .map((file) => JSON.parse(readFileSync(`${dir}/${file}`, "utf8")))
const extras = new Map(
  details.map((d) => [
    d.slug,
    {
      ingredients: [d.ingredients, ...Object.values(d.translations ?? {}).map((t) => t.ingredients ?? [])].map(
        (groups) => groups.flatMap((g) => g.items).join(" · ")
      ),
    },
  ])
)
const index = new LexicalIndex(buildSearchDocuments(recipes, extras), buildTagAliases(recipes))
const byslug = new Map(recipes.map((r) => [r.slug, r]))

function search(query: string) {
  const parsed = parseQuery(query)
  const lexical = index.search(parsed)
  return applyConstraints(mergeResults(lexical, null), recipes, parsed, lexical.excluded) ?? []
}

describe("search on the real recipes", () => {
  it("finds every curry, including those without 'curry' in the title", () => {
    const results = search("curry")
    expect(results).toEqual(expect.arrayContaining(["poulet-au-curry", "curry-vert-de-pierrick", "poulet-korma-riz-basmati", "poulet-tikka-massala"]))
    expect(results).not.toContain("biryani-agneau")
  })

  it("understands 'recettes qui proviennent de l'Inde avec poulet'", () => {
    const results = search("recettes qui proviennent de l'Inde avec poulet")
    expect(results.length).toBeGreaterThanOrEqual(3)
    for (const slug of results) {
      expect(byslug.get(slug)!.tags).toContain("indien")
      expect(byslug.get(slug)!.tags).toContain("poulet")
    }
  })

  it("understands meatless and pork-free requests", () => {
    for (const slug of search("un plat indien sans viande")) expect(byslug.get(slug)!.tags).toContain("végétarien")
    const pasta = search("pâtes sans porc")
    expect(pasta.length).toBeGreaterThan(5)
    expect(pasta).not.toContain("pasta-carbonara")
    expect(pasta).not.toContain("pasta-amatriciana")
  })

  it("applies duration and difficulty constraints", () => {
    const results = search("dessert facile en moins de 30 minutes")
    expect(results.length).toBeGreaterThan(0)
    for (const slug of results) {
      const r = byslug.get(slug)!
      expect(r.prepTime + r.cookTime).toBeLessThanOrEqual(30)
      expect(r.difficulty).toBe("Facile")
      expect(r.tags).toContain("dessert")
    }
  })

  it("does not let description-only words restrict the results", () => {
    expect(search("quick vegetarian dinner").length).toBeGreaterThan(10)
  })
})
