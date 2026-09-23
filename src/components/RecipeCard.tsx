import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Clock, Users, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { localizeRecipeSummary } from "@/lib/localize"
import { prefetchRecipe } from "@/lib/recipeData"
import type { ReactNode } from "react"
import type { RecipeSummary } from "@/types/recipe"

const BASE = import.meta.env.BASE_URL

// A press is almost always followed by the navigation: start the hero image download right away.
function preloadImage(src: string) {
  const img = new Image()
  img.src = src
}

/** `children` is shown under the description (e.g. the pantry match summary). */
export function RecipeCard({ recipe: rawRecipe, children }: { recipe: RecipeSummary; children?: ReactNode }) {
  const { t, i18n } = useTranslation()
  const recipe = localizeRecipeSummary(rawRecipe, i18n.language)
  const totalTime = recipe.prepTime + recipe.cookTime

  return (
    <Link
      to={`/recipe/${recipe.slug}`}
      className="group"
      // Fetch the recipe as soon as the user shows intent, so the page opens without a spinner
      onPointerEnter={() => prefetchRecipe(recipe.slug)}
      onFocus={() => prefetchRecipe(recipe.slug)}
      onTouchStart={() => prefetchRecipe(recipe.slug)}
      onPointerDown={() => preloadImage(`${BASE}${recipe.images.cover}`)}
    >
      <Card className="overflow-hidden py-0 h-full bg-surface-lowest rounded-[1.5rem] transition-all duration-300 hover:shadow-ambient">
        <div className="aspect-[4/3] overflow-hidden relative editorial-grain">
          <img
            src={`${BASE}${recipe.images.web}`}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        </div>
        <CardContent className="relative px-5 pb-5 pt-0">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
              {t(`categories.${recipe.category}`, recipe.category)}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground text-[10px]">
              {t(`difficulties.${recipe.difficulty}`, recipe.difficulty)}
            </Badge>
            {recipe.origin && recipe.origin !== "none" && (
              <Badge variant="outline" className="text-primary/80 border-primary/30 text-[10px]">
                {t(`origins.${recipe.origin}`, recipe.origin)}
              </Badge>
            )}
          </div>
          <h3 className="font-headline font-bold text-lg leading-tight mb-1.5 text-foreground tracking-[-0.02em]">
            {recipe.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {recipe.description}
          </p>
          {children}
          <div className="flex items-center gap-4 text-xs text-outline">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {totalTime} min
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {recipe.servings}
            </span>
          </div>
          <div className="absolute bottom-5 right-5 w-9 h-9 rounded-full border border-foreground/20 flex items-center justify-center text-foreground transition-all duration-700 group-hover:translate-x-1.5 hover:bg-primary hover:border-primary hover:text-primary-foreground">
            <ArrowRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
