import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { matchPath, useLocation } from "react-router-dom"
import { toLanguage } from "@/i18n/languages"
import { sharePath } from "./sharePath"

const BASE = import.meta.env.BASE_URL

/**
 * Puts the recipe's share page path in front of the hash route, e.g. `r/{slug}/en/#/recipe/{slug}`.
 * Link unfurlers drop the hash, so a URL copied from the address bar then gets the recipe's preview.
 * The share page sends a visitor back to the recipe.
 */
export function useShareableAddress() {
  const { pathname } = useLocation()
  const { i18n } = useTranslation()
  const lang = toLanguage(i18n.resolvedLanguage)

  useEffect(() => {
    const slug = matchPath("/recipe/:slug", pathname)?.params.slug
    const path = slug ? `${BASE}${sharePath(slug, lang)}` : BASE
    if (window.location.pathname === path) return
    // replaceState keeps the router's history state, so back and forward still work
    window.history.replaceState(window.history.state, "", `${path}${window.location.search}${window.location.hash}`)
  }, [pathname, lang])
}
