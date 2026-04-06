import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { Search, SlidersHorizontal } from "lucide-react"
import Fuse from "fuse.js"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { RecipeGrid, RecipesNotFound, AnimateInView } from "@/components/RecipeGrid"
import { sortCategories } from "@/lib/categories"
import { useTranslation } from "react-i18next"
import type { RecipeSummary } from "@/types/recipe"

const BASE = import.meta.env.BASE_URL

const CATEGORY_IMAGES: Record<string, string> = {
  Antipasti: "images/categories/antipasti.jpg",
  Pasta: "images/categories/pasta.jpg",
  Gnocchi: "images/categories/gnocchi.jpg",
  Risotto: "images/categories/risotto.jpg",
  Insalate: "images/categories/insalate.jpg",
  Secondi: "images/categories/secondi.jpg",
  Pizze: "images/categories/pizza.jpg",
  Pane: "images/categories/focacia.jpg",
  Dolci: "images/categories/dolci.jpg",
  Bambini: "images/categories/bambini.jpg",
  Breakfast: "images/categories/breakfast.jpg",
  Brunch: "images/categories/brunch.jpg",
}

interface CategoryCard {
  category: string
  label: string
  image: string
  count: number
}

export function HomePage() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [search, setSearch] = useState("")
  const { t } = useTranslation()

  useEffect(() => {
    let cancelled = false
    // Reset loading/error state for each fetch attempt (including retries)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    fetch(`${BASE}data/recipes/index.json`)
      .then((res) => res.json())
      .then((data: RecipeSummary[]) => {
        if (!cancelled) {
          setRecipes(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load. Please try again.')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [retryCount])

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
      image: CATEGORY_IMAGES[category] ?? items[0].images.web,
      count: items.length,
    }))
    return sortCategories(cards.map((c) => c.category)).map(
      (cat) => cards.find((c) => c.category === cat)!
    )
  }, [recipes, t])

  const fuse = useMemo(
    () =>
      new Fuse(recipes, {
        keys: [
          { name: "title", weight: 2 },
          { name: "description", weight: 1 },
          { name: "tags", weight: 1.5 },
          { name: "category", weight: 1 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [recipes]
  )

  const searchResults = useMemo(
    () => (search.trim() ? fuse.search(search).map((r) => r.item) : []),
    [fuse, search]
  )

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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none shadow-none focus-visible:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full text-base md:text-sm font-body placeholder:text-outline p-0 h-auto"
            />
            <Link
              to="/recipes?openFilters=1"
              className="ml-2 flex items-center justify-center gradient-primary text-primary-foreground w-8 h-8 rounded-full hover:opacity-90 transition-all active:scale-95 duration-300 shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content: search results or category cards */}
      <section className="flex-1 min-h-0 overflow-y-auto pb-2">
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => setRetryCount(c => c + 1)}
              className="rounded-full bg-surface-high px-5 py-2 text-sm font-medium text-foreground hover:bg-surface-container transition-colors"
            >
              Try again
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat, index) => (
              <AnimateInView key={cat.category} index={index}>
              <Link
                to={`/recipes?category=${encodeURIComponent(cat.category)}`}
                className="group cursor-pointer"
              >
                <article className="relative h-48 lg:h-72 overflow-hidden rounded-[1.5rem] editorial-grain">
                  <img
                    src={`${BASE}${cat.image}`}
                    alt={cat.category}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="vignette-overlay absolute inset-0 flex flex-col justify-end p-5">
                    <span className="text-white/80 font-body uppercase tracking-widest text-[10px] mb-1">
                      {cat.count} — {cat.category}
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
        )}
      </section>
    </div>
  )
}
