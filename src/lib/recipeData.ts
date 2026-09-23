import { useCallback, useEffect, useState } from "react"
import type { RecipeDetail, RecipeSummary } from "@/types/recipe"

const BASE = import.meta.env.BASE_URL

// In-memory cache shared by all pages: index.json and each recipe detail are
// fetched once per session. Failed requests are evicted so a retry refetches.
let indexPromise: Promise<RecipeSummary[]> | null = null
let indexValue: RecipeSummary[] | undefined
const detailPromises = new Map<string, Promise<RecipeDetail | null>>()
const detailValues = new Map<string, RecipeDetail | null>()

export function loadRecipeIndex(): Promise<RecipeSummary[]> {
  indexPromise ??= fetch(`${BASE}data/recipes/index.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<RecipeSummary[]>
    })
    .then((data) => {
      indexValue = data
      return data
    })
    .catch((err) => {
      indexPromise = null
      throw err
    })
  return indexPromise
}

/** Resolves to null when the recipe does not exist. */
export function loadRecipe(slug: string): Promise<RecipeDetail | null> {
  let promise = detailPromises.get(slug)
  if (!promise) {
    promise = fetch(`${BASE}data/recipes/${slug}.json`)
      .then((res) => (res.ok ? (res.json() as Promise<RecipeDetail>) : null))
      .then((data) => {
        detailValues.set(slug, data)
        return data
      })
      .catch((err) => {
        detailPromises.delete(slug)
        throw err
      })
    detailPromises.set(slug, promise)
  }
  return promise
}

let documentsPromise: Promise<unknown> | null = null

/**
 * Generated per-recipe extras (ingredient lines in every language, see scripts/build-search-index.mjs),
 * shared by the search and the "what can I make with…" page. Failed requests are evicted so a retry refetches.
 */
export function loadSearchDocuments(): Promise<unknown> {
  documentsPromise ??= fetch(`${BASE}data/search/documents.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json() as Promise<unknown>
    })
    .catch((err) => {
      documentsPromise = null
      throw err
    })
  return documentsPromise
}

/** Warms the cache ahead of a likely navigation (hover, focus, touch). Errors are ignored. */
export function prefetchRecipe(slug: string) {
  loadRecipe(slug).catch(() => {})
}

export function clearRecipeCache() {
  indexPromise = null
  indexValue = undefined
  detailPromises.clear()
  detailValues.clear()
  documentsPromise = null
}

interface Resource<T> {
  data: T | undefined
  loading: boolean
  error: boolean
  retry: () => void
}

function useResource<T>(key: string | undefined, cached: () => T | undefined, load: () => Promise<T>): Resource<T> {
  const [state, setState] = useState<{ key?: string; data?: T; error: boolean }>(() => ({
    key,
    data: cached(),
    error: false,
  }))
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (key === undefined) return
    const hit = cached()
    if (hit !== undefined) {
      setState({ key, data: hit, error: false })
      return
    }
    let cancelled = false
    setState({ key, data: undefined, error: false })
    load()
      .then((data) => { if (!cancelled) setState({ key, data, error: false }) })
      .catch(() => { if (!cancelled) setState({ key, data: undefined, error: true }) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  const current = state.key === key
  return {
    data: current ? state.data : undefined,
    loading: key !== undefined && (!current || (state.data === undefined && !state.error)),
    error: current && state.error,
    retry,
  }
}

export function useRecipeIndex() {
  const { data, ...rest } = useResource("index", () => indexValue, loadRecipeIndex)
  return { recipes: data ?? [], ...rest }
}

export function useRecipe(slug: string | undefined) {
  const { data, ...rest } = useResource(
    slug,
    () => (slug !== undefined ? detailValues.get(slug) : undefined),
    () => loadRecipe(slug!)
  )
  return { recipe: data ?? null, ...rest }
}
