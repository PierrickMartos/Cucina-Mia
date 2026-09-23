// Audit of the search lexicon (src/lib/search/query.ts) against the real recipes.
// Run by the search-lexicon skill after every recipe addition. Hard checks fail the suite; the
// report lists what deserves a human/agent review:
//   npx vitest run src/test/searchLexicon.test.ts 
// Probe how queries are understood:
//   SEARCH_PROBE="curry;plat indien sans viande" npx vitest run src/test/searchLexicon.test.ts 
import { describe, it, expect } from "vitest"
import { parseQuery } from "@/lib/search"
import { CONCEPTS, DIFFICULTY_WORDS, FILLERS } from "@/lib/search/query"
import { normalize, stem, tokenize } from "@/lib/search/text"
import { bySlug, index, recipes, searchSlugs } from "./helpers/realSearch"

const LANGS = ["en", "it"] as const

function tagsOf(slug: string, lang: "fr" | (typeof LANGS)[number]) {
  const recipe = bySlug.get(slug)!
  return lang === "fr" ? recipe.tags : recipe.translations?.[lang]?.tags ?? []
}

// Stems that characterise recipes: titles and tags, in every language.
const titleTagStems = new Set<string>()
for (const recipe of recipes) {
  const texts = [recipe.title, ...recipe.tags]
  for (const t of Object.values(recipe.translations ?? {})) texts.push(t.title ?? "", ...(t.tags ?? []))
  texts.flatMap(tokenize).forEach((token) => titleTagStems.add(token))
}
// Anywhere in the index, ingredients and descriptions included.
const hasStem = (s: string) => index.search({ terms: [{ stems: [s] }], exclude: [], avoidTags: [], requireTags: [] }).hits.length > 0

describe("search lexicon audit", () => {
  it("translates tags position by position (needed for cross-language aliases)", () => {
    const misaligned = recipes.flatMap((recipe) =>
      LANGS.filter((lang) => {
        const tags = recipe.translations?.[lang]?.tags
        return tags !== undefined && tags.length !== recipe.tags.length
      }).map((lang) => `${recipe.slug} (${lang})`)
    )
    expect(misaligned).toEqual([])
  })

  it("never swallows a tag as a filler or difficulty word", () => {
    const swallowed = new Set<string>()
    for (const recipe of recipes) {
      for (const lang of ["fr", ...LANGS] as const) {
        for (const tag of tagsOf(recipe.slug, lang)) {
          const words = normalize(tag).split(" ")
          const parsed = parseQuery(tag + " ")
          if (parsed.terms.length === 0 && parsed.maxMinutes === undefined && !parsed.difficulty && parsed.exclude.length === 0 && words.some((w) => FILLERS.has(w))) {
            swallowed.add(`${lang}:${tag}`)
          }
        }
      }
    }
    expect([...swallowed]).toEqual([])
  })

  it("finds every recipe by each of its tags, in every language", () => {
    const missed: string[] = []
    for (const recipe of recipes) {
      for (const lang of ["fr", ...LANGS] as const) {
        for (const tag of tagsOf(recipe.slug, lang)) {
          const results = searchSlugs(tag.replace(/-/g, " ") + " ")
          if (results && !results.includes(recipe.slug)) missed.push(`${recipe.slug} ← ${lang}:${tag}`)
        }
      }
    }
    expect(missed).toEqual([])
  })

  it("finds every recipe by its title", () => {
    const missed = recipes.flatMap((recipe) => {
      const titles = [recipe.title, ...LANGS.map((lang) => recipe.translations?.[lang]?.title ?? recipe.title)]
      return titles.filter((title) => !(searchSlugs(title + " ") ?? []).slice(0, 5).includes(recipe.slug)).map((t) => `${recipe.slug} ← ${t}`)
    })
    expect(missed).toEqual([])
  })

  it("reports lexicon entries to review", () => {
    // 1. Concept targets that match nothing (typo in the lexicon, or anticipating future recipes).
    const deadTargets = Object.entries(CONCEPTS).flatMap(([word, targets]) =>
      targets.filter((target) => !hasStem(stem(target))).map((target) => `${word} → ${target}`)
    )
    // 2. French tags no concept points to, that look like a cuisine/origin (adjectives in -ien/-ais/-ain/-ois/-al/-ique).
    const conceptTargets = new Set(Object.values(CONCEPTS).flat().map(stem))
    const originLike = [...new Set(recipes.flatMap((r) => r.tags))]
      .filter((tag) => /^[a-zéèêïî]+(ien|ienne|ais|aise|ain|aine|ois|oise|ique)$/.test(tag))
      .filter((tag) => !conceptTargets.has(stem(tokenize(tag)[0] ?? "")))
    // 3. Filler / difficulty words that also occur in recipe titles or tags (check they really are noise).
    const fillersInCorpus = [...FILLERS, ...Object.keys(DIFFICULTY_WORDS)].filter((w) => titleTagStems.has(stem(w)))

    const report = [
      "── Search lexicon report ──",
      `Concept targets not found in the corpus (${deadTargets.length}): ${deadTargets.join(", ") || "none"}`,
      `Tags without a concept pointing to them, possibly origins/cuisines (${originLike.length}): ${originLike.join(", ") || "none"}`,
      `Filler/difficulty words also used in titles or tags (${fillersInCorpus.length}): ${fillersInCorpus.join(", ") || "none"}`,
    ]
    process.stdout.write(report.join("\n") + "\n")
    expect(report.length).toBeGreaterThan(0)
  })

  it.runIf(process.env.SEARCH_PROBE)("probes queries (SEARCH_PROBE)", () => {
    for (const query of (process.env.SEARCH_PROBE ?? "").split(";").filter(Boolean)) {
      const results = searchSlugs(query) ?? []
      process.stdout.write(`\n${query}\n  parsed: ${JSON.stringify(parseQuery(query))}\n  ${results.length} results: ${results.map((slug) => bySlug.get(slug)!.title).join(" | ")}\n`)
    }
  })
})
