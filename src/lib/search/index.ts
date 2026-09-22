import type { RecipeSummary } from "@/types/recipe"
import en from "@/i18n/locales/en.json"
import fr from "@/i18n/locales/fr.json"
import it from "@/i18n/locales/it.json"
import type { LexicalResult, SearchDocument } from "./lexical"
import { hasConstraints, type ParsedQuery } from "./query"
import { tokenize } from "./text"
import type { SemanticHit } from "./semantic"

export { LexicalIndex } from "./lexical"
export { parseQuery, type ParsedQuery } from "./query"
export { semanticEngine, rankBySimilarity, selectSemanticHits, type SemanticStatus } from "./semantic"

/** Extra searchable text per recipe (see scripts/build-search-index.mjs). */
export type SearchExtras = Map<string, { ingredients: string[] }>

const CATEGORY_LABELS: Record<string, string>[] = [fr.categories, en.categories, it.categories]

export function parseSearchExtras(data: unknown): SearchExtras {
  const extras: SearchExtras = new Map()
  if (!Array.isArray(data)) return extras
  for (const entry of data) {
    if (!entry || typeof entry.slug !== "string" || !entry.ingredients || typeof entry.ingredients !== "object") continue
    const ingredients = Object.values(entry.ingredients as Record<string, unknown>).filter(
      (value): value is string => typeof value === "string"
    )
    extras.set(entry.slug, { ingredients })
  }
  return extras
}

/** One document per recipe, with every language merged so that "pasta", "pâtes" and "pasta" all match. */
export function buildSearchDocuments(recipes: RecipeSummary[], extras: SearchExtras = new Map()): SearchDocument[] {
  return recipes.map((recipe) => {
    const translations = Object.values(recipe.translations ?? {})
    return {
      slug: recipe.slug,
      fields: {
        title: [recipe.title, ...translations.map((t) => t.title ?? "")],
        tags: [...recipe.tags, ...translations.flatMap((t) => t.tags ?? [])],
        category: [recipe.category, ...CATEGORY_LABELS.map((labels) => labels[recipe.category] ?? "")],
        description: [recipe.description, ...translations.map((t) => t.description ?? "")],
        ingredients: extras.get(recipe.slug)?.ingredients ?? [],
      },
    }
  })
}

/**
 * Cross-language aliases learnt from the data: tags are translated position by position, so
 * "quick" / "veloce" are aliases of "rapide" even on recipes whose own translation says "fast".
 */
export function buildTagAliases(recipes: RecipeSummary[]): Map<string, string[]> {
  const aliases = new Map<string, Set<string>>()
  // Only translated word -> French tag: French tags exist on every recipe, and the reverse direction is
  // noisy ("dessert" -> "dolce" would also match the Italian "dolce-salato").
  const add = (from: string, to: string) => {
    if (from === to) return
    const set = aliases.get(from) ?? new Set()
    set.add(to)
    aliases.set(from, set)
  }
  for (const recipe of recipes) {
    for (const translation of Object.values(recipe.translations ?? {})) {
      const tags = translation.tags
      if (!tags || tags.length !== recipe.tags.length) continue
      tags.forEach((tag, i) => {
        const source = tokenize(recipe.tags[i])
        const target = tokenize(tag)
        // Single-word French tags only: "comfort-food" -> "réconfortant", but not "main-course" -> "plat-principal".
        if (source.length !== 1) return
        target.forEach((word) => add(word, source[0]))
      })
    }
  }
  return new Map([...aliases].map(([from, to]) => [from, [...to]]))
}

// Reciprocal rank fusion: robust to the very different score scales of BM25-like and cosine scores.
const RRF_K = 20
const SEMANTIC_WEIGHT = 0.8

/**
 * Merges lexical and semantic rankings. Returns null when the query has no meaningful term
 * (nothing to filter on).
 */
export function mergeResults(lexical: LexicalResult, semantic: SemanticHit[] | null): string[] | null {
  if (lexical.termCount === 0) return null
  if (!semantic || semantic.length === 0) return lexical.hits.map((hit) => hit.slug)

  const scores = new Map<string, number>()
  lexical.hits.forEach((hit, rank) => scores.set(hit.slug, 1 / (RRF_K + rank + 1)))
  semantic.forEach((hit, rank) => {
    scores.set(hit.slug, (scores.get(hit.slug) ?? 0) + SEMANTIC_WEIGHT / (RRF_K + rank + 1))
  })
  return [...scores].sort((a, b) => b[1] - a[1]).map(([slug]) => slug)
}

/**
 * Applies the structured part of the query (negations, "en moins de 30 minutes", "facile") to the
 * ranked slugs, or to every recipe when the query had no search term ("dessert" aside, e.g. "rapide et facile").
 */
export function applyConstraints(
  slugs: string[] | null,
  recipes: RecipeSummary[],
  query: ParsedQuery,
  excluded: Set<string>
): string[] | null {
  if (!hasConstraints(query)) return slugs
  const bySlug = new Map(recipes.map((recipe) => [recipe.slug, recipe]))
  return (slugs ?? recipes.map((recipe) => recipe.slug)).filter((slug) => {
    const recipe = bySlug.get(slug)
    if (!recipe || excluded.has(slug)) return false
    if (query.maxMinutes !== undefined && recipe.prepTime + recipe.cookTime > query.maxMinutes) return false
    if (query.difficulty && recipe.difficulty !== query.difficulty) return false
    return true
  })
}
