import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { localizeRecipeSummary } from "@/lib/localize"
import { prefetchRecipe } from "@/lib/recipeData"
import { recipeOfTheDay } from "@/lib/recipeOfTheDay"
import type { RecipeSummary } from "@/types/recipe"

const BASE = import.meta.env.BASE_URL

/** Large cover card for today's recipe, at the top of the home page. */
export function RecipeOfTheDay({ recipes }: { recipes: RecipeSummary[] }) {
  const { t, i18n } = useTranslation()
  const recipe = useMemo(() => {
    const pick = recipeOfTheDay(recipes)
    return pick && localizeRecipeSummary(pick, i18n.language)
  }, [recipes, i18n.language])

  if (!recipe) return null

  return (
    <section aria-labelledby="recipe-of-the-day-title" className="mb-6">
      <Link
        to={`/recipe/${recipe.slug}`}
        onPointerEnter={() => prefetchRecipe(recipe.slug)}
        onFocus={() => prefetchRecipe(recipe.slug)}
        onTouchStart={() => prefetchRecipe(recipe.slug)}
        className="group block"
      >
        <article className="relative h-64 sm:h-80 lg:h-[26rem] overflow-hidden rounded-[1.5rem] editorial-grain">
          <picture>
            {/* The small photo is enough on phones; wide screens get the full-size cover */}
            <source media="(min-width: 640px)" srcSet={`${BASE}${recipe.images.cover}`} />
            <img
              src={`${BASE}${recipe.images.web}`}
              alt=""
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              // Largest image of the first screen: load it first
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <div className="vignette-overlay absolute inset-0 flex flex-col justify-end p-5 sm:p-7">
            <h2
              id="recipe-of-the-day-title"
              className="text-lemon-zest font-body uppercase tracking-widest text-xs font-semibold mb-1.5"
            >
              {t("home.recipeOfTheDay")}
            </h2>
            <p className="font-headline text-2xl leading-tight sm:text-4xl text-white font-bold tracking-[-0.02em] transition-transform duration-700 group-hover:-translate-y-1">
              {recipe.title}
            </p>
            <span className="text-white/80 font-body text-sm mt-1.5">
              {recipe.prepTime + recipe.cookTime} min · {t(`difficulties.${recipe.difficulty}`, recipe.difficulty)} ·{" "}
              {t(`categories.${recipe.category}`, recipe.category)}
            </span>
          </div>
        </article>
      </Link>
    </section>
  )
}
