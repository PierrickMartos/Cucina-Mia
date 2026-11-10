import { useEffect, useSyncExternalStore } from "react"
import { loadRecipe, loadRecipeIndex } from "@/lib/recipeData"
import { useFavorites } from "@/lib/savedRecipes"
import { runWhenIdle } from "@/lib/utils"

const BASE = import.meta.env.BASE_URL

/** Registers `sw.js` (built by scripts/vite-plugin-service-worker.ts) in production builds. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return
  const register = () => {
    navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE }).catch(() => { /* Unsupported or blocked */ })
  }
  if (document.readyState === "complete") register()
  else window.addEventListener("load", register, { once: true })
}

function saveData() {
  return (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
}

// Favourites already made available offline during this session
const warmed = new Set<string>()

/**
 * Favourites are the recipes most likely to be cooked: fetch their data and cover photo once the
 * browser is idle, so the service worker has them even if they were saved from a card and never opened.
 */
export function useOfflineFavorites() {
  const favorites = useFavorites()
  useEffect(() => {
    const missing = favorites.filter((slug) => !warmed.has(slug))
    if (missing.length === 0 || !navigator.serviceWorker?.controller || saveData()) return
    return runWhenIdle(() => {
      loadRecipeIndex()
        .then((recipes) => {
          const bySlug = new Map(recipes.map((r) => [r.slug, r]))
          for (const slug of missing) {
            const recipe = bySlug.get(slug)
            if (!recipe || warmed.has(slug)) continue
            warmed.add(slug)
            loadRecipe(slug).catch(() => warmed.delete(slug))
            fetch(`${BASE}${recipe.images.cover}`).catch(() => {})
          }
        })
        .catch(() => {})
    }, 10_000)
  }, [favorites])
}

function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener)
  window.addEventListener("offline", listener)
  return () => {
    window.removeEventListener("online", listener)
    window.removeEventListener("offline", listener)
  }
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
}
