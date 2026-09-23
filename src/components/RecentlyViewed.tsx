import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { localizeRecipeSummary } from "@/lib/localize"
import { prefetchRecipe } from "@/lib/recipeData"
import { clearRecentlyViewed, useRecentlyViewed } from "@/lib/savedRecipes"
import type { RecipeSummary } from "@/types/recipe"

const BASE = import.meta.env.BASE_URL

/** Horizontal row of the last opened recipes, hidden until one has been opened. */
export function RecentlyViewed({ recipes }: { recipes: RecipeSummary[] }) {
  const { t, i18n } = useTranslation()
  const recent = useRecentlyViewed()

  const items = useMemo(() => {
    const bySlug = new Map(recipes.map((r) => [r.slug, r]))
    return recent.flatMap((slug) => {
      const recipe = bySlug.get(slug)
      return recipe ? [localizeRecipeSummary(recipe, i18n.language)] : []
    })
  }, [recipes, recent, i18n.language])

  if (items.length === 0) return null

  return (
    <section aria-labelledby="recently-viewed-title" className="mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 id="recently-viewed-title" className="font-body text-[10px] uppercase tracking-[0.2em] font-semibold text-secondary">
          {t("home.recentlyViewed")}
        </h2>
        <button
          type="button"
          onClick={clearRecentlyViewed}
          className="cursor-pointer text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          {t("home.clearRecent")}
        </button>
      </div>
      <ul className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none]">
        {items.map((recipe) => (
          <li key={recipe.slug} className="snap-start shrink-0 w-36">
            <Link
              to={`/recipe/${recipe.slug}`}
              onPointerEnter={() => prefetchRecipe(recipe.slug)}
              onFocus={() => prefetchRecipe(recipe.slug)}
              onTouchStart={() => prefetchRecipe(recipe.slug)}
              className="group block"
            >
              <div className="aspect-square overflow-hidden rounded-2xl editorial-grain relative">
                <img
                  src={`${BASE}${recipe.images.web}`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <p className="mt-2 text-sm font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                {recipe.title}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
