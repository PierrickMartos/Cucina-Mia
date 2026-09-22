import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import type { RecipeSummary } from "@/types/recipe"
import {
  LexicalIndex,
  buildSearchDocuments,
  mergeResults,
  parseSearchExtras,
  rankBySimilarity,
  selectSemanticHits,
  semanticEngine,
  type SearchExtras,
} from "@/lib/search"

const DOCUMENTS_URL = `${import.meta.env.BASE_URL}data/search/documents.json`
const SEMANTIC_DEBOUNCE_MS = 200

let extrasPromise: Promise<SearchExtras> | null = null

function loadExtras() {
  extrasPromise ??= fetch(DOCUMENTS_URL)
    .then((res) => (res.ok ? res.json() : []))
    .then(parseSearchExtras)
    .catch(() => new Map())
  return extrasPromise
}

/**
 * Hybrid recipe search: instant lexical matching (accents, plurals, typos, ingredients, all
 * languages) merged with semantic matching once the in-browser embedding model is ready.
 * Returns the matching slugs in relevance order, or null when there is nothing to filter on.
 */
export function useRecipeSearch(recipes: RecipeSummary[], query: string) {
  const [extras, setExtras] = useState<SearchExtras>(() => new Map())
  const [embedded, setEmbedded] = useState<{ query: string; vector: Float32Array } | null>(null)
  const semanticStatus = useSyncExternalStore(semanticEngine.subscribe, semanticEngine.getStatus)
  const trimmed = query.trim()

  useEffect(() => {
    let cancelled = false
    loadExtras().then((loaded) => {
      if (!cancelled) setExtras(loaded)
    })
    return () => { cancelled = true }
  }, [])

  const index = useMemo(() => new LexicalIndex(buildSearchDocuments(recipes, extras)), [recipes, extras])

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
    if (!trimmed) return null
    const lexical = index.search(query)
    const embeddings = semanticEngine.index
    let semantic = null
    if (embeddings && embedded?.query === trimmed) {
      const strict = lexical.hits.some((hit) => hit.exact)
      semantic = selectSemanticHits(rankBySimilarity(embeddings, embedded.vector), strict)
    }
    return mergeResults(lexical, semantic)
  }, [index, query, trimmed, embedded])

  return { slugs, semanticStatus }
}
