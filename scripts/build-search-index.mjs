#!/usr/bin/env node
// Builds the static search assets served from public/data/search/.
//
//   node scripts/build-search-index.mjs               -> documents.json (lexical extras: ingredients)
//   node scripts/build-search-index.mjs --embeddings  -> documents.json + embeddings.json (semantic vectors)
//
// Both files are generated (git-ignored). documents.json is rebuilt before every dev/build.
// embeddings.json needs to download the embedding model from Hugging Face, so it is built in CI
// before deploying. The app degrades gracefully to lexical-only search when it is missing.

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Keep in sync with src/lib/search/semantic.ts (the browser embeds queries with the same model).
const MODEL_ID = "Xenova/multilingual-e5-small"
const MODEL_DTYPE = "q8"
const BASE_LANG = "fr"
const LANGS = ["fr", "en", "it"]

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const recipesDir = path.join(root, "public/data/recipes")
const outDir = path.join(root, "public/data/search")
const localesDir = path.join(root, "src/i18n/locales")

function cleanIngredient(item) {
  return item
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function localized(recipe, lang) {
  const t = lang === BASE_LANG ? {} : recipe.translations?.[lang] ?? {}
  return {
    title: t.title ?? recipe.title,
    description: t.description ?? recipe.description,
    tags: t.tags ?? recipe.tags,
    ingredients: (t.ingredients ?? recipe.ingredients ?? []).flatMap((g) => g.items).map(cleanIngredient),
  }
}

async function loadRecipes() {
  const files = (await readdir(recipesDir)).filter((f) => f.endsWith(".json") && f !== "index.json").sort()
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(recipesDir, f), "utf8"))))
}

async function loadCategoryLabels() {
  const labels = {}
  for (const lang of LANGS) {
    const locale = JSON.parse(await readFile(path.join(localesDir, `${lang}.json`), "utf8"))
    labels[lang] = locale.categories ?? {}
  }
  return labels
}

function buildDocuments(recipes) {
  return recipes.map((recipe) => ({
    slug: recipe.slug,
    ingredients: Object.fromEntries(LANGS.map((lang) => [lang, localized(recipe, lang).ingredients.join(" · ")])),
  }))
}

function passageText(recipe, lang, categoryLabels) {
  const r = localized(recipe, lang)
  const category = categoryLabels[lang]?.[recipe.category] ?? recipe.category
  return [
    `passage: ${r.title}.`,
    r.description,
    `${category}.`,
    r.tags.map((tag) => tag.replace(/-/g, " ")).join(", ") + ".",
    r.ingredients.join(", ") + ".",
  ].join(" ")
}

// Normalised vectors are stored as int8 with a per-vector scale, base64 encoded (~4x smaller than JSON floats).
function quantize(vector) {
  let max = 0
  for (const v of vector) max = Math.max(max, Math.abs(v))
  const scale = max / 127 || 1
  const bytes = new Int8Array(vector.length)
  for (let i = 0; i < vector.length; i++) bytes[i] = Math.round(vector[i] / scale)
  return { s: Number(scale.toPrecision(6)), v: Buffer.from(bytes.buffer).toString("base64") }
}

async function buildEmbeddings(recipes) {
  const { pipeline, env } = await import("@huggingface/transformers")
  env.cacheDir = path.join(root, ".cache/transformers")
  const extractor = await pipeline("feature-extraction", MODEL_ID, { dtype: MODEL_DTYPE })
  const categoryLabels = await loadCategoryLabels()

  const vectors = {}
  let dim = 0
  for (const recipe of recipes) {
    const texts = LANGS.map((lang) => passageText(recipe, lang, categoryLabels))
    const output = await extractor(texts, { pooling: "mean", normalize: true })
    const rows = output.tolist()
    dim = rows[0].length
    vectors[recipe.slug] = rows.map(quantize)
  }
  return { model: MODEL_ID, dtype: MODEL_DTYPE, dim, vectors }
}

async function main() {
  const recipes = await loadRecipes()
  await mkdir(outDir, { recursive: true })

  await writeFile(path.join(outDir, "documents.json"), JSON.stringify(buildDocuments(recipes)))
  console.log(`search: documents.json (${recipes.length} recipes)`)

  if (process.argv.includes("--embeddings")) {
    const embeddings = await buildEmbeddings(recipes)
    await writeFile(path.join(outDir, "embeddings.json"), JSON.stringify(embeddings))
    console.log(`search: embeddings.json (${recipes.length} recipes × ${LANGS.length} langs, dim ${embeddings.dim})`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
