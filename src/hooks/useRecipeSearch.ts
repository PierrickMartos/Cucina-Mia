import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import type { RecipeSummary } from "@/types/recipe"
import { runWhenIdle } from "@/lib/utils"
import { loadSearchDocuments } from "@/lib/recipeData"
import {
  LexicalIndex,
  applyConstraints,
  buildSearchDocuments,
  buildTagAliases,
  mergeResults,
  parseQuery,
  parseSearchExtras,
  rankBySimilarity,
  selectSemanticHits,
  semanticEngine,
  type SearchExtras,
} from "@/lib/search"

const SEMANTIC_DEBOUNCE_MS = 200

let extrasPromise: Promise<SearchExtras> | null = null

function loadExtras() {
  extrasPromise ??= loadSearchDocuments()
    .then(parseSearchExtras)
    .catch(() => new Map())
  return extrasPromise
}

/**
 * Hybrid recipe search: the natural-language query is parsed (concepts, negations, duration,
 * difficulty), matched lexically (accents, plurals, typos, ingredients, all languages) and merged
 * with semantic matching once the in-browser embedding model is ready.
 * Returns the matching slugs in relevance order, or null when there is nothing to filter on.
 */
export function useRecipeSearch(recipes: RecipeSummary[], query: string) {
  const [extras, setExtras] = useState<SearchExtras>(() => new Map())
  const [embedded, setEmbedded] = useState<{ query: string; vector: Float32Array } | null>(null)
  const semanticStatus = useSyncExternalStore(semanticEngine.subscribe, semanticEngine.getStatus)
  const trimmed = query.trim()

  // Ingredient documents only refine search: load them once the page has settled, or right away
  // when the user starts typing, so they don't compete with the first render.
  const [wantExtras, setWantExtras] = useState(() => extrasPromise !== null)
  useEffect(() => (wantExtras ? undefined : runWhenIdle(() => setWantExtras(true), 3000)), [wantExtras])
  const searching = trimmed !== ""
  const needExtras = wantExtras || searching

  useEffect(() => {
    if (!needExtras) return
    let cancelled = false
    loadExtras().then((loaded) => {
      if (!cancelled) setExtras(loaded)
    })
    return () => { cancelled = true }
  }, [needExtras])

  // Built on the first search rather than on every page load
  const index = useMemo(
    () => (searching ? new LexicalIndex(buildSearchDocuments(recipes, extras), buildTagAliases(recipes)) : null),
    [recipes, extras, searching]
  )

  useEffect(() => {
    if (trimmed) semanticEngine.start()
  }, [trimmed])

  useEffect(() => {
    if (!trimmed || semanticStatus !== "ready") return
    let cancelled = false
    const timer = setTimeout(() => {
      semanticEngine
        .embed(trimmed)
        .then((vector) => {
          if (!cancelled && vector) setEmbedded({ query: trimmed, vector })
        })
        .catch(() => {})
    }, SEMANTIC_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmed, semanticStatus])

  const slugs = useMemo(() => {
    if (!trimmed || !index) return null
    const parsed = parseQuery(query)
    const lexical = index.search(parsed)
    const embeddings = semanticEngine.index
    let semantic = null
    if (embeddings && embedded?.query === trimmed) {
      const strict = lexical.hits.some((hit) => hit.exact)
      semantic = selectSemanticHits(rankBySimilarity(embeddings, embedded.vector), strict)
    }
    return applyConstraints(mergeResults(lexical, semantic), recipes, parsed, lexical.excluded)
  }, [index, recipes, query, trimmed, embedded])

  return { slugs, semanticStatus }
}
