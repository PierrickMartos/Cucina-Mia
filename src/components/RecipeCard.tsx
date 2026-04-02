import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Clock, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { localizeRecipeSummary } from "@/lib/localize"
import type { RecipeSummary } from "@/types/recipe"

const BASE = import.meta.env.BASE_URL

export function RecipeCard({ recipe: rawRecipe }: { recipe: RecipeSummary }) {
  const { t, i18n } = useTranslation()
  const recipe = localizeRecipeSummary(rawRecipe, i18n.language)
  const totalTime = recipe.prepTime + recipe.cookTime

  return (
    <Link to={`/recipe/${recipe.slug}`}>
      <Card className="overflow-hidden py-0 border-border/50 hover:shadow-md transition-shadow h-full bg-card rounded-[1.5rem]">
        <div className="aspect-[4/3] overflow-hidden relative editorial-grain">
          <img
            src={`${BASE}${recipe.images.web}`}
            alt={recipe.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-accent text-accent-foreground text-[10px] uppercase tracking-wider">
              {t(`categories.${recipe.category}`, recipe.category)}
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
              {t(`difficulties.${recipe.difficulty}`, recipe.difficulty)}
            </Badge>
          </div>
          <h3 className="font-headline font-bold text-lg leading-tight mb-1 text-foreground">
            {recipe.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {recipe.description}
          </p>
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
        </CardContent>
      </Card>
    </Link>
  )
}
