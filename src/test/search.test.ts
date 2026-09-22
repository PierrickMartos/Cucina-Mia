import { describe, it, expect } from "vitest"
import { editDistance, normalize, stem, tokenize } from "@/lib/search/text"
import { LexicalIndex, applyConstraints, buildSearchDocuments, buildTagAliases, mergeResults, parseQuery, parseSearchExtras } from "@/lib/search"
import { parseEmbeddings, rankBySimilarity, selectSemanticHits } from "@/lib/search/semantic"
import type { RecipeSummary } from "@/types/recipe"

function recipe(slug: string, overrides: Partial<RecipeSummary> = {}): RecipeSummary {
  return {
    slug,
    title: slug,
    description: "",
    images: { cover: "", web: "" },
    prepTime: 10,
    cookTime: 10,
    servings: 2,
    difficulty: "Facile",
    category: "Secondi",
    tags: [],
    ...overrides,
  }
}

const recipes = [
  recipe("pasta-carbonara", {
    title: "Pasta alla Carbonara",
    description: "La vraie carbonara romaine avec guanciale croustillant.",
    category: "Pasta",
    tags: ["pâtes", "porc", "œufs"],
    translations: { en: { title: "Pasta alla Carbonara", tags: ["pasta", "pork", "eggs"] } },
  }),
  recipe("poulet-au-curry", {
    title: "Poulet au curry",
    description: "Un curry doux au lait de coco.",
    tags: ["poulet", "épicé"],
    translations: { en: { title: "Chicken curry", tags: ["chicken", "spicy"] } },
  }),
  recipe("curry-de-legumes", {
    title: "Curry de légumes",
    description: "Curry végétarien.",
    tags: ["végétarien", "légumes"],
    translations: { en: { title: "Vegetable curry", tags: ["vegetarian", "vegetables"] } },
  }),
  recipe("gaspacho-pasteque", { title: "Gaspacho de pastèque à la feta", tags: ["été", "froid"] }),
  recipe("omelette", { title: "Omelette", tags: ["œufs"] }),
  recipe("tiramisu", { title: "Tiramisù", category: "Dolci", tags: ["café"] }),
]

const extras = parseSearchExtras([
  { slug: "omelette", ingredients: { fr: "3 œufs · 1 courgette · 20g de beurre", en: "3 eggs · 1 zucchini" } },
  { slug: "unknown-shape" },
])

const index = new LexicalIndex(buildSearchDocuments(recipes, extras), buildTagAliases(recipes))
const run = (query: string) => index.search(parseQuery(query))
const search = (query: string) => run(query).hits.map((hit) => hit.slug)

describe("text helpers", () => {
  it("normalises accents, ligatures and punctuation", () => {
    expect(normalize("Œufs brouillés, crème-fraîche!")).toBe("oeufs brouilles creme fraiche")
  })

  it("folds plurals, final vowels and feminine forms", () => {
    expect(stem("tomates")).toBe(stem("tomate"))
    expect(stem("tomatoes")).toBe(stem("tomato"))
    expect(stem("pomodori")).toBe(stem("pomodoro"))
    expect(stem("végétarienne".normalize("NFD").replace(/[̀-ͯ]/g, ""))).toBe("vegetarien")
    expect(stem("cremeuse")).toBe(stem("cremeux"))
  })

  it("drops stopwords, units and numbers", () => {
    expect(tokenize("400 g de spaghetti et la sauce")).toEqual(["spaghett", "sauc"])
  })

  it("computes a bounded edit distance with transpositions", () => {
    expect(editDistance("carbonara", "carbonara", 2)).toBe(0)
    expect(editDistance("carbonra", "carbonara", 2)).toBe(1)
    expect(editDistance("gncohi", "gnochi", 2)).toBe(1)
    expect(editDistance("abc", "xyz", 1)).toBe(2)
  })
})

describe("lexical search", () => {
  it("matches across languages", () => {
    expect(search("chicken")).toEqual(["poulet-au-curry"])
    expect(search("pâtes")).toEqual(["pasta-carbonara"])
    expect(search("eggs")).toEqual(expect.arrayContaining(["pasta-carbonara", "omelette"]))
  })

  it("searches ingredients from the generated documents", () => {
    expect(search("courgettes")).toEqual(["omelette"])
    expect(search("zucchini")).toEqual(["omelette"])
  })

  it("matches translated category labels", () => {
    expect(search("dessert")).toEqual(["tiramisu"])
  })

  it("tolerates typos and missing accents", () => {
    expect(search("carbonra")).toEqual(["pasta-carbonara"])
    expect(search("tiramisu")).toEqual(["tiramisu"])
    expect(search("vegetarienne")).toEqual(["curry-de-legumes"])
  })

  it("matches prefixes while typing, but does not expand complete words", () => {
    expect(search("carbo")).toEqual(["pasta-carbonara"])
    expect(search("pastè")).toEqual(["gaspacho-pasteque"])
    expect(search("pasta")).toEqual(["pasta-carbonara"])
  })

  it("requires every known term and ignores words absent from the corpus", () => {
    expect(search("curry")).toEqual(expect.arrayContaining(["poulet-au-curry", "curry-de-legumes"]))
    expect(search("curry poulet")).toEqual(["poulet-au-curry"])
    expect(search("recette végétarienne")).toEqual(["curry-de-legumes"])
  })

  it("expands a few synonyms", () => {
    expect(search("veggie")).toEqual(["curry-de-legumes"])
  })

  it("ranks title matches above description matches", () => {
    expect(search("curry")[0]).not.toBe("pasta-carbonara")
    expect(run("carbonara").hits[0].exact).toBe(true)
  })

  it("reports queries without meaningful terms", () => {
    expect(run("de la").termCount).toBe(0)
  })
})

describe("query understanding", () => {
  it("drops filler words and maps origins to cuisine tags", () => {
    const parsed = parseQuery("recettes qui proviennent de l'Inde avec poulet")
    expect(parsed.terms.map((t) => t.stems)).toEqual([["inde", "indien"], ["poulet"]])
  })

  it("expands dish families", () => {
    expect(parseQuery("curry").terms[0].stems).toEqual(expect.arrayContaining(["curry", "korm", "tikk"]))
  })

  it("parses durations and difficulty", () => {
    expect(parseQuery("dessert facile en moins de 30 minutes")).toMatchObject({
      terms: [{ stems: ["dessert"] }],
      maxMinutes: 30,
      difficulty: "Facile",
    })
    expect(parseQuery("prêt en 1h30").maxMinutes).toBe(90)
    expect(parseQuery("under 20 min").maxMinutes).toBe(20)
  })

  it("understands negations", () => {
    expect(parseQuery("pâtes sans porc").exclude[0].stems).toEqual(expect.arrayContaining(["porc", "jambon"]))
    expect(parseQuery("plat sans viande").terms.map((t) => t.stems)).toEqual([["vegetarien"]])
    expect(parseQuery("sans gluten").exclude).toEqual([])
    expect(parseQuery("sans gluten").terms).toHaveLength(2)
  })

  it("excludes negated ingredients but not description mentions", () => {
    expect(search("sans porc")).toEqual([])
    const parsed = parseQuery("sans porc")
    const { excluded } = index.search(parsed)
    expect(applyConstraints(null, recipes, parsed, excluded)).not.toContain("pasta-carbonara")
    expect(applyConstraints(null, recipes, parsed, excluded)).toContain("tiramisu")
  })

  it("filters on duration and difficulty", () => {
    const quick = [recipe("a", { prepTime: 5, cookTime: 10 }), recipe("b", { prepTime: 30, cookTime: 30, difficulty: "Medio" })]
    const parsed = parseQuery("en moins de 20 minutes")
    expect(applyConstraints(null, quick, parsed, new Set())).toEqual(["a"])
    expect(applyConstraints(null, quick, parseQuery("moyen"), new Set())).toEqual(["b"])
    expect(applyConstraints(["b", "a"], quick, parseQuery("poulet"), new Set())).toEqual(["b", "a"])
  })

  it("learns cross-language aliases from aligned tags", () => {
    const aliases = buildTagAliases([
      recipe("x", { tags: ["rapide", "réconfortant"], translations: { en: { tags: ["fast", "comfort-food"] } } }),
    ])
    expect(aliases.get("fast")).toEqual(["rapid"])
    expect(aliases.get("comfort")).toEqual(["reconfortant"])
    expect(aliases.has("rapid")).toBe(false)
  })
})

function encode(vector: number[]) {
  const bytes = new Int8Array(vector.map((v) => Math.round(v * 127)))
  let binary = ""
  bytes.forEach((b) => (binary += String.fromCharCode(b & 0xff)))
  return { s: 1 / 127, v: btoa(binary) }
}

describe("semantic search", () => {
  const embeddings = parseEmbeddings({
    model: "test-model",
    dtype: "q8",
    dim: 2,
    vectors: {
      "poulet-au-curry": [encode([1, 0]), encode([0.8, 0.6])],
      "curry-de-legumes": [encode([0.6, 0.8])],
      tiramisu: [encode([0, 1])],
    },
  })!

  it("decodes int8 vectors", () => {
    expect(embeddings.model).toBe("test-model")
    expect(embeddings.vectors.get("tiramisu")![0][1]).toBeCloseTo(1, 2)
  })

  it("rejects invalid files", () => {
    expect(parseEmbeddings([])).toBeNull()
    expect(parseEmbeddings({ model: "x", dtype: "q8", vectors: {} })).toBeNull()
  })

  it("ranks recipes by their best language vector", () => {
    const ranked = rankBySimilarity(embeddings, new Float32Array([0.8, 0.6]))
    expect(ranked.map((hit) => hit.slug)).toEqual(["poulet-au-curry", "curry-de-legumes", "tiramisu"])
    expect(ranked[0].score).toBeCloseTo(1, 2)
  })

  it("keeps only hits close to the best one", () => {
    const hits = selectSemanticHits([
      { slug: "a", score: 0.9 },
      { slug: "b", score: 0.87 },
      { slug: "c", score: 0.8 },
    ])
    expect(hits.map((hit) => hit.slug)).toEqual(["a", "b"])
    expect(selectSemanticHits([{ slug: "a", score: 0.9 }, { slug: "b", score: 0.87 }], true)).toHaveLength(1)
    expect(selectSemanticHits([{ slug: "a", score: 0.5 }])).toEqual([])
  })
})

describe("hybrid merge", () => {
  const lexical = run("curry")

  it("returns null when there is nothing to filter on", () => {
    expect(mergeResults(run("le"), null)).toBeNull()
  })

  it("falls back to lexical results without semantic hits", () => {
    expect(mergeResults(lexical, null)).toEqual(lexical.hits.map((hit) => hit.slug))
  })

  it("adds semantic-only recipes and boosts recipes found by both", () => {
    const merged = mergeResults(lexical, [
      { slug: "curry-de-legumes", score: 0.9 },
      { slug: "gaspacho-pasteque", score: 0.88 },
    ])!
    expect(merged[0]).toBe("curry-de-legumes")
    expect(merged).toContain("gaspacho-pasteque")
    expect(merged).toContain("poulet-au-curry")
  })
})
