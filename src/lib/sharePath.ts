import { DEFAULT_LANGUAGE, type Language } from "../i18n/languages"

/**
 * Path (relative to the site base) of the static page carrying a recipe's link
 * preview, one per language: `r/{slug}/` in French, `r/{slug}/en/`, `r/{slug}/it/`.
 * Built by scripts/vite-plugin-share-pages.ts.
 */
export function sharePath(slug: string, lang: Language = DEFAULT_LANGUAGE): string {
  return lang === DEFAULT_LANGUAGE ? `r/${slug}/` : `r/${slug}/${lang}/`
}
