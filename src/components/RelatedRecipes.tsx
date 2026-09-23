import { useTranslation } from "react-i18next"
import { RecipeCard } from "@/components/RecipeCard"
import { AnimateInView } from "@/components/RecipeGrid"
import { useRecipeIndex } from "@/lib/recipeData"

/** "You might also like" cards at the end of a recipe, from its curated `related` slugs. */
export function RelatedRecipes({ slugs }: { slugs: string[] }) {
  const { t } = useTranslation()
  const { recipes } = useRecipeIndex()
  const bySlug = new Map(recipes.map((r) => [r.slug, r]))
  const related = slugs.flatMap((slug) => bySlug.get(slug) ?? [])
  if (related.length === 0) return null

  return (
    <section aria-labelledby="related-recipes-title" className="mt-12 max-w-6xl mx-auto print:hidden">
      <h2 id="related-recipes-title" className="font-headline text-2xl font-bold tracking-[-0.02em] mb-6 text-center">
        {t("recipe.related")}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {related.map((recipe, index) => (
          <AnimateInView key={recipe.slug} index={index}>
            <RecipeCard recipe={recipe} />
          </AnimateInView>
        ))}
      </div>
    </section>
  )
}
