import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Refrigerator, Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { RecipeGrid, RecipesNotFound, AnimateInView } from "@/components/RecipeGrid"
import { sortCategories } from "@/lib/categories"
import { useRecipeIndex } from "@/lib/recipeData"
import { localizeRecipeSummary } from "@/lib/localize"
import { useRecipeSearch } from "@/hooks/useRecipeSearch"
import { SemanticSearchIndicator } from "@/components/SemanticSearchIndicator"
import { RecentlyViewed } from "@/components/RecentlyViewed"
import { useTranslation } from "react-i18next"
import type { RecipeSummary } from "@/types/recipe"

const BASE = import.meta.env.BASE_URL

// Category covers: `{name}.webp` at `width`, plus `{name}-640.webp` and `{name}-960.webp`
// (when wider than 960) so small screens don't download the full-size photo.
const CATEGORY_IMAGES: Record<string, { name: string; width: number }> = {
  Antipasti: { name: "antipasti", width: 1280 },
  Zuppe: { name: "zuppe", width: 1280 },
  Pasta: { name: "pasta", width: 1280 },
  Gnocchi: { name: "gnocchi", width: 1280 },
  Risotto: { name: "risotto", width: 1280 },
  Insalate: { name: "insalate", width: 960 },
  Secondi: { name: "secondi", width: 1280 },
  Contorni: { name: "contorni", width: 1280 },
  Pizze: { name: "pizza", width: 1280 },
  Pane: { name: "focacia", width: 1280 },
  Dolci: { name: "dolci", width: 1086 },
  Gelati: { name: "gelati", width: 1280 },
  Conserve: { name: "conserve", width: 1280 },
  Bambini: { name: "bambini", width: 1280 },
  Breakfast: { name: "breakfast", width: 1280 },
  Brunch: { name: "brunch", width: 1024 },
}

// Matches the grid below: 1 column, then 2 from `sm`, then 3 from `lg`.
const CATEGORY_IMAGE_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"

function categoryImage(category: string, fallback: string) {
  const image = CATEGORY_IMAGES[category]
  if (!image) return { src: `${BASE}${fallback}` }
  const path = `${BASE}images/categories/${image.name}`
  const widths = [640, 960].filter((w) => w < image.width)
  return {
    src: `${path}.webp`,
    srcSet: [...widths.map((w) => `${path}-${w}.webp ${w}w`), `${path}.webp ${image.width}w`].join(", "),
    sizes: CATEGORY_IMAGE_SIZES,
  }
}

interface CategoryCard {
  category: string
  label: string
  image: { src: string; srcSet?: string; sizes?: string }
  count: number
}

export function HomePage() {
  const { recipes, loading, error, retry } = useRecipeIndex()
  const [search, setSearch] = useState("")
  const { t, i18n } = useTranslation()
  const localizedRecipes = useMemo(
    () => recipes.map((r) => localizeRecipeSummary(r, i18n.language)),
    [recipes, i18n.language]
  )

  const categories = useMemo<CategoryCard[]>(() => {
    const map = new Map<string, RecipeSummary[]>()
    for (const r of recipes) {
      const existing = map.get(r.category) ?? []
      existing.push(r)
      map.set(r.category, existing)
    }
    const cards = Array.from(map.entries()).map(([category, items]) => ({
      category,
      label: t(`categories.${category}`, category),
      image: categoryImage(category, items[0].images.web),
      count: items.length,
    }))
    return sortCategories(cards.map((c) => c.category)).map(
      (cat) => cards.find((c) => c.category === cat)!
    )
  }, [recipes, t])

  const { slugs: searchSlugs, semanticStatus } = useRecipeSearch(recipes, search)

  const searchResults = useMemo(() => {
    if (!searchSlugs) return search.trim() ? localizedRecipes : []
    const bySlug = new Map(localizedRecipes.map((r) => [r.slug, r]))
    return searchSlugs.flatMap((slug) => bySlug.get(slug) ?? [])
  }, [localizedRecipes, search, searchSlugs])

  const isSearching = search.trim().length > 0

  return (
    <div className="flex flex-col px-6 space-y-6 pb-6 h-full">
      {/* Hero Header */}
      <header className="space-y-5 shrink-0">
        <div>
          <h1 className="font-headline text-3xl text-primary font-bold tracking-[-0.02em] leading-none">
            {t("home.title")}
          </h1>
          <span className="font-body text-secondary text-[10px] uppercase tracking-[0.2em] block mt-3">
            {!loading && recipes.length > 0 && (
              <span className="mr-1 text-primary font-semibold">{recipes.length} ·</span>
            )}
            {t("home.subtitle")}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <div className="flex items-center bg-surface-high rounded-full px-4 py-2.5 transition-all duration-300 focus-within:bg-surface-lowest focus-within:shadow-[inset_0_0_0_1px_rgba(192,90,62,0.2)]">
            <Search className="text-outline h-4 w-4 mr-3 shrink-0" />
            <Input
              type="search"
              placeholder={t("home.searchPlaceholder")}
              aria-label={t("recipes.searchLabel")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none shadow-none focus-visible:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full text-base md:text-sm font-body placeholder:text-outline p-0 h-auto"
            />
            <SemanticSearchIndicator status={semanticStatus} />
            <Link
              to="/recipes?openFilters=1"
              aria-label={t("filter.openFilters")}
              className="ml-2 flex items-center justify-center gradient-primary text-primary-foreground w-8 h-8 rounded-full hover:opacity-90 transition-all active:scale-95 duration-300 shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <Link
          to="/pantry"
          className="group flex items-center gap-3 rounded-full bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"
        >
          <Refrigerator className="h-4 w-4 shrink-0" />
          <span className="flex-1">{t("home.pantryLink")}</span>
          <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </header>

      {/* Content: search results or category cards */}
      <section className="flex-1 min-h-0 overflow-y-auto pb-2">
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
        ) : isSearching ? (
          searchResults.length === 0 ? <RecipesNotFound /> : <RecipeGrid recipes={searchResults} />
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 lg:h-72">
                <Skeleton className="h-full w-full rounded-[1.5rem]" />
              </div>
            ))}
          </div>
        ) : (
          <>
          <RecentlyViewed recipes={recipes} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat, index) => (
              <AnimateInView key={cat.category} index={index}>
              <Link
                to={`/recipes?category=${encodeURIComponent(cat.category)}`}
                className="group cursor-pointer"
              >
                <article className="relative h-48 lg:h-72 overflow-hidden rounded-[1.5rem] editorial-grain">
                  <img
                    {...cat.image}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    // The first row is visible right away: don't wait for layout to start loading it
                    loading={index < 3 ? "eager" : "lazy"}
                    decoding="async"
                  />
                  <div className="vignette-overlay absolute inset-0 flex flex-col justify-end p-5">
                    <span className="text-white/80 font-body uppercase tracking-widest text-[10px] mb-1">
                      {cat.count} · {cat.category}
                    </span>
                    <h3 className="font-headline text-3xl text-white font-bold tracking-[-0.02em] transition-transform duration-700 group-hover:-translate-y-2">
                      {cat.label}
                    </h3>
                  </div>
                </article>
              </Link>
              </AnimateInView>
            ))}
          </div>
          </>
        )}
      </section>
    </div>
  )
}
