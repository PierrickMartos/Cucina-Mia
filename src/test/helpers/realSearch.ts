// Builds the search engine over the real cookbook (public/data/recipes) for regression tests,
// mirroring what the app does with index.json + the generated documents.json.
import { readFileSync, readdirSync } from "node:fs"
import {
  LexicalIndex,
  applyConstraints,
  buildSearchDocuments,
  buildTagAliases,
  mergeResults,
  parseQuery,
} from "@/lib/search"
import type { RecipeDetail, RecipeSummary } from "@/types/recipe"

const dir = "public/data/recipes"

export const recipes: RecipeSummary[] = JSON.parse(readFileSync(`${dir}/index.json`, "utf8"))

const details: RecipeDetail[] = readdirSync(dir)
  .filter((file) => file.endsWith(".json") && file !== "index.json")
  .map((file) => JSON.parse(readFileSync(`${dir}/${file}`, "utf8")))

const extras = new Map(
  details.map((d) => [
    d.slug,
    {
      ingredients: [d.ingredients, ...Object.values(d.translations ?? {}).map((t) => t.ingredients ?? [])].map(
        (groups) => groups.flatMap((g) => g.items).join(" · ")
      ),
    },
  ])
)

export const index = new LexicalIndex(buildSearchDocuments(recipes, extras), buildTagAliases(recipes))
export const bySlug = new Map(recipes.map((r) => [r.slug, r]))

/** Lexical search as the app runs it (without the semantic layer). Null means "no filter". */
export function searchSlugs(query: string): string[] | null {
  const parsed = parseQuery(query)
  const lexical = index.search(parsed)
  return applyConstraints(mergeResults(lexical, null), recipes, parsed, lexical.excluded)
}

export function search(query: string): string[] {
  return searchSlugs(query) ?? []
}
