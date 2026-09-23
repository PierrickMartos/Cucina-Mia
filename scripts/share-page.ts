// Link previews (WhatsApp, Slack, Messenger, iMessage, X…) for shared recipes.
// Crawlers never run JS and never see the URL hash, so `#/recipe/{slug}` always
// previews as the home page. Each recipe gets a static page at `r/{slug}/` whose
// only job is to carry the Open Graph tags and send humans on to the app.
// The redirect is JS only: some unfurlers follow <meta http-equiv="refresh"> and
// would end up previewing the home page again.
// One page per language (`r/{slug}/` in French, `r/{slug}/en/`, `r/{slug}/it/`):
// crawlers can't know the sharer's locale, so it has to be in the URL.
// Kept free of Node APIs: rendered by the Vite plugin and unit tested.

import { DEFAULT_LANGUAGE, LANGUAGES, LANG_STORAGE_KEY, type Language } from "../src/i18n/languages.ts"

export const SITE_NAME = "Cucina Mia"
export const SITE_DESCRIPTION =
  "Cucina Mia. Recettes de grand-mère, de grand-père, de belle-mère, de maman, de papa, des internets ou d'ailleurs. Buon appetito!"

// 1.91:1, the size every platform renders as a large card. JPEG because
// WhatsApp and some Slack/Messenger clients skip WebP previews.
export const SHARE_IMAGE_WIDTH = 1200
export const SHARE_IMAGE_HEIGHT = 630
export const SHARE_IMAGE_FILE = "og.jpg"

const OG_LOCALES: Record<Language, string> = { fr: "fr_FR", en: "en_US", it: "it_IT" }

export interface ShareMeta {
  lang: Language
  /** Absolute URL of the page being shared (canonical, og:url) */
  url: string
  /** URL a human is sent to (the app route) */
  redirectTo: string
  title: string
  description: string
  /** Absolute URL of the JPEG preview image */
  image: string
  imageAlt: string
  type: "website" | "article"
  /** Absolute URL of the page in every language, for hreflang alternates */
  alternates?: Partial<Record<Language, string>>
}

export { sharePath } from "../src/lib/sharePath.ts"

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Previews truncate around 200 characters anyway, cut on a word boundary
export function truncate(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.]+$/, "")}…`
}

/** Open Graph + Twitter tags, shared by the recipe pages and the home page */
export function renderMetaTags(meta: ShareMeta): string {
  const e = (value: string) => escapeHtml(value)
  const description = truncate(meta.description)
  return [
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="${OG_LOCALES[meta.lang]}" />`,
    ...LANGUAGES.filter(l => l !== meta.lang).map(l => `<meta property="og:locale:alternate" content="${OG_LOCALES[l]}" />`),
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:url" content="${e(meta.url)}" />`,
    `<meta property="og:title" content="${e(meta.title)}" />`,
    `<meta property="og:description" content="${e(description)}" />`,
    `<meta property="og:image" content="${e(meta.image)}" />`,
    `<meta property="og:image:secure_url" content="${e(meta.image)}" />`,
    `<meta property="og:image:type" content="image/jpeg" />`,
    `<meta property="og:image:width" content="${SHARE_IMAGE_WIDTH}" />`,
    `<meta property="og:image:height" content="${SHARE_IMAGE_HEIGHT}" />`,
    `<meta property="og:image:alt" content="${e(meta.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${e(meta.title)}" />`,
    `<meta name="twitter:description" content="${e(description)}" />`,
    `<meta name="twitter:image" content="${e(meta.image)}" />`,
    `<meta name="twitter:image:alt" content="${e(meta.imageAlt)}" />`,
  ].join("\n    ")
}

export function renderSharePage(meta: ShareMeta): string {
  const e = (value: string) => escapeHtml(value)
  return `<!doctype html>
<html lang="${meta.lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${e(meta.title)} · ${SITE_NAME}</title>
    <link rel="canonical" href="${e(meta.url)}" />
    ${renderAlternates(meta.alternates)}
    <meta name="description" content="${e(truncate(meta.description))}" />
    ${renderMetaTags(meta)}
    <meta name="theme-color" content="#DC2626" />
    <script>${renderRedirect(meta)}</script>
  </head>
  <body>
    <p><a href="${e(meta.redirectTo)}">${e(meta.title)} · ${SITE_NAME}</a></p>
  </body>
</html>
`
}

function renderAlternates(alternates: ShareMeta["alternates"]): string {
  if (!alternates) return ""
  const links = LANGUAGES.filter(l => alternates[l]).map(l => `<link rel="alternate" hreflang="${l}" href="${escapeHtml(alternates[l]!)}" />`)
  if (alternates[DEFAULT_LANGUAGE]) {
    links.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(alternates[DEFAULT_LANGUAGE]!)}" />`)
  }
  return links.join("\n    ")
}

// First-time visitors land in the language of the preview they clicked; anyone
// who already has a language on the site (picked or detected) keeps theirs.
function renderRedirect(meta: ShareMeta): string {
  const json = (value: string) => JSON.stringify(value).replace(/</g, "\\u003c")
  return `try{if(!localStorage.getItem(${json(LANG_STORAGE_KEY)}))localStorage.setItem(${json(LANG_STORAGE_KEY)},${json(meta.lang)})}catch(e){}location.replace(${json(meta.redirectTo)})`
}
