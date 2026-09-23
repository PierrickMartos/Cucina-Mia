#!/usr/bin/env node
// Suggests "related recipes" candidates from the recipe data (French base fields).
//
//   node scripts/suggest-related.mjs <slug> [...]   -> ranked candidates for these recipes
//   node scripts/suggest-related.mjs --all          -> candidates for every recipe, next to its current `related`
//
// Scores are lexical: shared tags and ingredient words weighted by rarity (IDF), same category,
// and a penalty between sweet and savoury dishes. They are only a starting point: the final
// `related` list (3 to 4 slugs) is picked by hand, see the add-recipe skill.

import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const recipesDir = path.join(root, "public/data/recipes")
const TOP = 8

const STOPWORDS = new Set(
  ("de du des la le les un une et ou au aux en a à pour avec sans sur dans par d l g kg ml cl l cs cc " +
    "cuillere cuilleres soupe cafe pincee pincees brin brins botte gousse gousses tranche tranches " +
    "morceau morceaux quelques qs quanto basta frais fraiche fraiches gros grosse petit petite petits " +
    "petites moyen moyenne entier entiere rape rapee hache hachee coupe coupes environ selon gout " +
    "sel poivre huile olive eau beurre sucre farine").split(" ")
)

// Tags describing the dish's nature: a sweet recipe should rarely point to a savoury one.
const SWEET_TAGS = new Set(["dessert", "goûter", "sucré", "chocolat", "petit-déjeuner"])

function fold(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
}

function ingredientWords(recipe) {
  const words = new Set()
  for (const item of recipe.ingredients.flatMap((g) => g.items)) {
    for (const raw of fold(item.replace(/\([^)]*\)/g, " ")).split(/[^a-z]+/)) {
      const word = raw.replace(/(x|s)$/, "")
      if (word.length > 2 && !STOPWORDS.has(word) && !STOPWORDS.has(raw)) words.add(word)
    }
  }
  return words
}

function isSweet(recipe) {
  return recipe.category === "Dolci" || recipe.tags.some((tag) => SWEET_TAGS.has(tag))
}

const recipes = readdirSync(recipesDir)
  .filter((f) => f.endsWith(".json") && f !== "index.json")
  .sort()
  .map((f) => JSON.parse(readFileSync(path.join(recipesDir, f), "utf8")))
  .map((recipe) => ({ recipe, tags: new Set(recipe.tags), words: ingredientWords(recipe), sweet: isSweet(recipe) }))

function idf(sets) {
  const counts = new Map()
  for (const set of sets) for (const key of set) counts.set(key, (counts.get(key) ?? 0) + 1)
  return (key) => Math.log(recipes.length / (counts.get(key) ?? 1))
}

const tagIdf = idf(recipes.map((r) => r.tags))
const wordIdf = idf(recipes.map((r) => r.words))

function score(a, b) {
  let s = 0
  for (const tag of a.tags) if (b.tags.has(tag)) s += 1.5 * tagIdf(tag)
  for (const word of a.words) if (b.words.has(word)) s += wordIdf(word)
  if (a.recipe.category === b.recipe.category) s += 3
  if (a.sweet !== b.sweet) s -= 8
  return s
}

function candidates(entry) {
  return recipes
    .filter((other) => other !== entry)
    .map((other) => ({ slug: other.recipe.slug, title: other.recipe.title, score: score(entry, other) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, TOP)
}

const args = process.argv.slice(2)
const targets = args.includes("--all") ? recipes : recipes.filter((r) => args.includes(r.recipe.slug))
if (targets.length === 0) {
  console.error("Usage: node scripts/suggest-related.mjs <slug> [...] | --all")
  process.exit(1)
}

for (const entry of targets) {
  const { slug, title, category, related } = entry.recipe
  console.log(`\n${slug} (${title}, ${category})${related ? `\n  current: ${related.join(", ")}` : ""}`)
  for (const c of candidates(entry)) console.log(`  ${c.score.toFixed(1).padStart(5)}  ${c.slug}  (${c.title})`)
}
