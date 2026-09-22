// Regression tests on the real cookbook: natural-language queries must return sensible recipes.
// Add a case here whenever the search lexicon is extended (see .agents/skills/search-lexicon).
import { describe, it, expect } from "vitest"
import { bySlug as byslug, search } from "./helpers/realSearch"

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

  it("maps place names to regional cuisines", () => {
    expect(search("recette de Milan")).toContain("risotto-a-la-milanaise")
  })

  it("understands 'sans' tags in every language", () => {
    for (const query of ["sans gluten", "senza glutine", "no cook", "senza cottura"]) {
      const results = search(query)
      expect(results.length, query).toBeGreaterThan(3)
    }
    for (const slug of search("senza glutine")) expect(byslug.get(slug)!.tags, slug).toContain("sans-gluten")
  })

  it("keeps a difficulty word that is part of a title", () => {
    expect(search("framboisier facile")).toContain("framboisier-facile-moelleux")
  })
})
