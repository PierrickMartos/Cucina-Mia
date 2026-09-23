// Regression tests on the real cookbook: natural-language queries must return sensible recipes.
// Add a case here whenever the search lexicon is extended (see .agents/skills/search-lexicon).
import { describe, it, expect } from "vitest"
import { bySlug as byslug, recipes, search } from "./helpers/realSearch"

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

  it("maps countries and regions to their recipes", () => {
    const cases: [string, string[]][] = [
      ["cuisine espagnole", ["gaspacho-pasteque-tomates", "gaspacho-de-pasteque-a-la-feta"]],
      ["recette tunisienne", ["chakchouka-du-brunch"]],
      ["plat du moyen-orient", ["chakchouka-du-brunch", "poke-bowl-falafel-mangue"]],
      ["korean food", ["mayak-gyeran"]],
      ["recette vietnamienne", ["rouleaux-de-printemps"]],
      ["recette romaine", ["pasta-carbonara", "pasta-amatriciana"]],
      ["cuisine belge", ["gaufre-liegeoise"]],
      ["piatto di Napoli", ["gnocchi-alla-sorrentina"]],
      ["cuisine japonaise", ["katsudon"]],
      ["dessert tropical", ["crumble-ananas-mangue", "tarte-tatin-mangue-espelette"]],
    ]
    for (const [query, expected] of cases) expect(search(query), query).toEqual(expect.arrayContaining(expected))
    for (const slug of search("cuisine française")) expect(byslug.get(slug)!.tags, slug).toContain("français")
  })

  it("matches compound 'sans' tags exactly", () => {
    expect(search("sans sucre")).toEqual(["galette-banane"])
    const glutenFree = search("sans gluten")
    for (const query of ["gluten free", "senza glutine", "sans glu"]) expect(search(query).sort(), query).toEqual([...glutenFree].sort())
    for (const slug of search("sans gluten ni lactose")) {
      expect(byslug.get(slug)!.tags).toEqual(expect.arrayContaining(["sans-gluten", "sans-lactose"]))
    }
  })

  it("excludes eggs, cheese and pork with 'sans'", () => {
    for (const [query, group] of [["dessert sans œufs", /œuf|oeuf/i], ["pâtes sans fromage", /fromage|parmesan|pecorino|mozzarella|feta|chèvre|ricotta|mascarpone/i]] as const) {
      const results = search(query)
      expect(results.length, query).toBeGreaterThan(0)
      for (const slug of results) expect(byslug.get(slug)!.tags.join(" "), `${query}: ${slug}`).not.toMatch(group)
    }
  })

  it("understands dish families and styles", () => {
    expect(search("soupe froide")).toEqual(expect.arrayContaining(["gaspacho-pasteque-tomates", "gaspacho-de-pasteque-a-la-feta"]))
    expect(search("sandwich")).toEqual(expect.arrayContaining(["tartine-oeufs-chorizo", "avocado-toast", "pita-dwich-italian-style"]))
    for (const slug of search("plat piquant")) expect(byslug.get(slug)!.tags, slug).toContain("épicé")
    for (const slug of search("repas de noël")) expect(byslug.get(slug)!.tags, slug).toContain("festif")
    for (const slug of search("recette pas chère")) expect(byslug.get(slug)!.tags, slug).toContain("économique")
    expect(search("bbq")).toContain("effiloche-de-porc")
  })

  it("keeps semantic suggestions consistent with the query", () => {
    // Worst case: the embedding layer ranks every recipe, cold summer soups first.
    const everything = recipes.map((r) => r.slug).sort((a, b) => Number(b.includes("gaspacho")) - Number(a.includes("gaspacho")))
    const winter = search("quelque chose de réconfortant pour l'hiver", everything)
    expect(winter).toEqual(expect.arrayContaining(["biryani-agneau", "polpette-al-sugo"]))
    expect(winter.some((slug) => slug.includes("gaspacho"))).toBe(false)
    for (const slug of winter) {
      const tags = byslug.get(slug)!.tags
      expect(tags, slug).not.toContain("été")
      expect(tags, slug).not.toContain("froid")
      expect(tags.some((t) => t === "réconfortant" || t === "hiver"), slug).toBe(true)
    }
    for (const slug of search("plat réconfortant sans viande", everything)) {
      expect(byslug.get(slug)!.tags, slug).toContain("végétarien")
    }
  })
})
