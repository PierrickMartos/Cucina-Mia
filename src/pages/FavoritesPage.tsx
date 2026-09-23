import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Heart } from "lucide-react"
import { RecipeGrid } from "@/components/RecipeGrid"
import { useRecipeIndex } from "@/lib/recipeData"
import { localizeRecipeSummary } from "@/lib/localize"
import { useFavorites } from "@/lib/savedRecipes"

export function FavoritesPage() {
  const { t, i18n } = useTranslation()
  const { recipes, loading, error, retry } = useRecipeIndex()
  const favorites = useFavorites()

  // Most recently saved first; slugs of recipes removed from the cookbook are skipped
  const saved = useMemo(() => {
    const bySlug = new Map(recipes.map((r) => [r.slug, r]))
    return favorites.flatMap((slug) => {
      const recipe = bySlug.get(slug)
      return recipe ? [localizeRecipeSummary(recipe, i18n.language)] : []
    })
  }, [recipes, favorites, i18n.language])

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="font-headline text-3xl font-bold text-primary tracking-[-0.02em]">
          {t("favorites.title")}
        </h1>
        <span className="font-body text-secondary text-[10px] uppercase tracking-[0.2em] block mt-2">
          {!loading && saved.length > 0 && (
            <span className="mr-1 text-primary font-semibold">{saved.length} ·</span>
          )}
          {t("favorites.description")}
        </span>
      </div>

      {error ? (
        <div role="alert" className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <p className="text-sm text-muted-foreground">{t("common.loadError")}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-full bg-surface-high px-5 py-2 text-sm font-medium text-foreground hover:bg-surface-container transition-colors"
          >
            {t("common.tryAgain")}
          </button>
        </div>
      ) : !loading && saved.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 px-4 gap-3">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <Heart className="h-7 w-7" />
          </span>
          <p className="text-lg font-headline text-foreground">{t("favorites.empty")}</p>
          <p className="text-sm text-muted-foreground max-w-sm">{t("favorites.emptyHint")}</p>
          <Link
            to="/recipes"
            className="mt-3 inline-flex items-center justify-center rounded-full gradient-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {t("favorites.browse")}
          </Link>
        </div>
      ) : (
        <RecipeGrid recipes={saved} loading={loading} />
      )}
    </div>
  )
}
