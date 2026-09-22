import type { RecipeSummary } from "@/types/recipe"
import en from "@/i18n/locales/en.json"
import fr from "@/i18n/locales/fr.json"
import it from "@/i18n/locales/it.json"
import type { LexicalResult, SearchDocument } from "./lexical"
import type { SemanticHit } from "./semantic"

export { LexicalIndex } from "./lexical"
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
