// Link previews (WhatsApp, Slack, Messenger, iMessage, X…) for shared recipes.
// Crawlers never run JS and never see the URL hash, so `#/recipe/{slug}` always
// previews as the home page. Each recipe gets a static page at `r/{slug}/` whose
// only job is to carry the Open Graph tags and send humans on to the app.
// The redirect is JS only: some unfurlers follow <meta http-equiv="refresh"> and
// would end up previewing the home page again.
// Kept free of Node APIs: rendered by the Vite plugin and unit tested.

export const SITE_NAME = "Cucina Mia"
export const SITE_DESCRIPTION =
  "Cucina Mia. Recettes de grand-mère, de grand-père, de belle-mère, de maman, de papa, des internets ou d'ailleurs. Buon appetito!"

// 1.91:1, the size every platform renders as a large card. JPEG because
// WhatsApp and some Slack/Messenger clients skip WebP previews.
export const SHARE_IMAGE_WIDTH = 1200
export const SHARE_IMAGE_HEIGHT = 630
export const SHARE_IMAGE_FILE = "og.jpg"

export interface ShareMeta {
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
}

export function sharePath(slug: string): string {
  return `r/${slug}/`
}

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
    `<meta property="og:locale" content="fr_FR" />`,
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
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${e(meta.title)} · ${SITE_NAME}</title>
    <link rel="canonical" href="${e(meta.url)}" />
    <meta name="description" content="${e(truncate(meta.description))}" />
    ${renderMetaTags(meta)}
    <meta name="theme-color" content="#DC2626" />
    <script>location.replace(${JSON.stringify(meta.redirectTo).replace(/</g, "\\u003c")})</script>
  </head>
  <body>
    <p><a href="${e(meta.redirectTo)}">${e(meta.title)} · ${SITE_NAME}</a></p>
  </body>
</html>
`
}
