import { useSyncExternalStore } from "react"

// Favourite and recently viewed recipes: lists of slugs, most recent first, kept in
// localStorage (per browser, no account) and shared by every component through a small store.
// Other tabs are kept in sync through the `storage` event.

interface SlugList {
  get(): string[]
  set(slugs: string[]): void
  use(): string[]
}

function createSlugList(key: string, max = Infinity): SlugList {
  const listeners = new Set<() => void>()

  function load(): string[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]")
      return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : []
    } catch {
      return []
    }
  }

  let slugs = typeof window === "undefined" ? [] : load()

  function emit() {
    for (const listener of listeners) listener()
  }

  function set(next: string[]) {
    slugs = next.slice(0, max)
    try {
      if (slugs.length) localStorage.setItem(key, JSON.stringify(slugs))
      else localStorage.removeItem(key)
    } catch { /* Storage unavailable */ }
    emit()
  }

  function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key !== key && event.key !== null) return
      slugs = load()
      emit()
    })
  }

  const get = () => slugs
  return { get, set, use: () => useSyncExternalStore(subscribe, get, get) }
}

const favorites = createSlugList("cucina-mia:favorites")
const recent = createSlugList("cucina-mia:recent", 8)

export const useFavorites = favorites.use
export const useRecentlyViewed = recent.use

export function isFavorite(slug: string) {
  return favorites.get().includes(slug)
}

export function toggleFavorite(slug: string) {
  const current = favorites.get()
  favorites.set(current.includes(slug) ? current.filter((s) => s !== slug) : [slug, ...current])
}

export function markViewed(slug: string) {
  recent.set([slug, ...recent.get().filter((s) => s !== slug)])
}

export function clearRecentlyViewed() {
  recent.set([])
}

/** Test helper: empties both lists. */
export function resetSavedRecipes() {
  favorites.set([])
  recent.set([])
}
