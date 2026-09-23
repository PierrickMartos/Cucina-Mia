import path from "path"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import sharp from "sharp"
import type { Plugin } from "vite"
import {
  SHARE_IMAGE_FILE,
  SHARE_IMAGE_HEIGHT,
  SHARE_IMAGE_WIDTH,
  SITE_DESCRIPTION,
  SITE_NAME,
  renderMetaTags,
  renderSharePage,
  sharePath,
} from "./share-page.ts"
import { DEFAULT_LANGUAGE, LANGUAGES } from "../src/i18n/languages.ts"

interface IndexRecipe {
  slug: string
  title: string
  description?: string
  images: { cover: string; web?: string }
  translations?: { [lang: string]: { title?: string; description?: string } }
}

// Cover used for the home page preview
const HOME_IMAGE = "images/categories/pasta.webp"

// Link previews need absolute URLs. GitHub Pages serves the repo at
// https://{owner}.github.io/{repo}/, override with VITE_SITE_ORIGIN elsewhere.
const DEFAULT_ORIGIN = "https://pierrickmartos.github.io"

async function writeShareImage(source: string, target: string) {
  // Illustrations are 800x600 SVGs: rasterise them at a density that covers 1200px wide
  const input = source.endsWith(".svg") ? sharp(source, { density: 180 }) : sharp(source)
  await input
    .resize(SHARE_IMAGE_WIDTH, SHARE_IMAGE_HEIGHT, { fit: "cover", position: "attention" })
    .flatten({ background: "#FAF9F6" })
    // Kept well under WhatsApp's ~300 KB limit for large previews
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(target)
}

/**
 * Builds `r/{slug}/og.jpg` and one `index.html` per language (`r/{slug}/`,
 * `r/{slug}/en/`, `r/{slug}/it/`: the URLs the share button hands out) for every
 * recipe, and adds Open Graph tags to the home page.
 */
export function sharePages(): Plugin {
  let base = "/"
  let outDir = "dist"
  let publicDir = "public"
  const origin = (process.env.VITE_SITE_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, "")
  const absolute = (p: string) => `${origin}${base}${p}`

  return {
    name: "share-pages",
    configResolved(config) {
      base = config.base
      outDir = path.resolve(config.root, config.build.outDir)
      publicDir = config.publicDir
    },
    // Dev server: no generated pages, send share links straight to the recipe
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = req.url?.startsWith(`${base}r/`) && /\/r\/([^/?#]+)(?:\/[a-z]{2})?\/?(?:[?#].*)?$/.exec(req.url)
        if (!match) return next()
        res.statusCode = 302
        res.setHeader("Location", `${base}#/recipe/${match[1]}`)
        res.end()
      })
    },
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (ctx.server) return html
        const tags = renderMetaTags({
          lang: DEFAULT_LANGUAGE,
          url: absolute(""),
          redirectTo: absolute(""),
          title: SITE_NAME,
          description: SITE_DESCRIPTION,
          image: absolute(SHARE_IMAGE_FILE),
          imageAlt: SITE_NAME,
          type: "website",
        })
        return html.replace("</title>", `</title>\n    ${tags}`)
      },
    },
    async closeBundle() {
      const indexFile = path.join(outDir, "data/recipes/index.json")
      if (!existsSync(indexFile)) return
      const recipes = JSON.parse(readFileSync(indexFile, "utf8")) as IndexRecipe[]

      await writeShareImage(path.join(publicDir, HOME_IMAGE), path.join(outDir, SHARE_IMAGE_FILE))

      await Promise.all(recipes.map(async recipe => {
        const dir = path.join(outDir, sharePath(recipe.slug))
        mkdirSync(dir, { recursive: true })
        const image = recipe.images.web || recipe.images.cover
        await writeShareImage(path.join(publicDir, image), path.join(dir, SHARE_IMAGE_FILE))

        // Every language gets a page, even without a translation (the share button can
        // hand out any of them): the French text is used then
        const alternates = Object.fromEntries(LANGUAGES.map(lang => [lang, absolute(sharePath(recipe.slug, lang))]))
        for (const lang of LANGUAGES) {
          const translation = lang === DEFAULT_LANGUAGE ? undefined : recipe.translations?.[lang]
          const title = translation?.title || recipe.title
          const pageDir = path.join(outDir, sharePath(recipe.slug, lang))
          mkdirSync(pageDir, { recursive: true })
          writeFileSync(path.join(pageDir, "index.html"), renderSharePage({
            lang,
            url: alternates[lang],
            redirectTo: `${base}#/recipe/${recipe.slug}`,
            title,
            description: translation?.description || recipe.description || `${title} · ${SITE_NAME}`,
            image: absolute(`${sharePath(recipe.slug)}${SHARE_IMAGE_FILE}`),
            imageAlt: title,
            type: "article",
            alternates,
          }))
        }
      }))
    },
  }
}
