import { useState, useEffect, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useTranslation } from "react-i18next"
import type { RecipeSummary } from "@/types/recipe"

const BASE = import.meta.env.BASE_URL

interface CategoryCard {
  category: string
  label: string
  image: string
  count: number
}

export function HomePage() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    fetch(`${BASE}data/recipes/index.json`)
      .then((res) => res.json())
      .then((data: RecipeSummary[]) => {
        setRecipes(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const categories = useMemo<CategoryCard[]>(() => {
    const map = new Map<string, RecipeSummary[]>()
    for (const r of recipes) {
      const existing = map.get(r.category) ?? []
      existing.push(r)
      map.set(r.category, existing)
    }
    return Array.from(map.entries()).map(([category, items], _i) => ({
      category,
      label: t(`categories.${category}`, category),
      image: items[0].image,
      count: items.length,
    }))
  }, [recipes])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) {
      navigate(`/recipes?q=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <div className="flex flex-col px-6 space-y-4 pb-4 h-full">
      {/* Hero Header */}
      <header className="space-y-3 shrink-0">
        <div className="max-w-2xl">
          <span className="font-body text-secondary text-[10px] uppercase tracking-[0.2em] mb-1 block">
            {t("home.subtitle")}
          </span>
          <h2 className="font-headline text-3xl text-primary font-bold tracking-tight leading-none">
            {t("home.title")}
          </h2>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative group">
          <div className="flex items-center bg-surface-high rounded-full px-4 py-2 transition-all duration-300 focus-within:bg-card focus-within:ring-1 focus-within:ring-primary/20">
            <Search className="text-outline h-4 w-4 mr-3 shrink-0" />
            <Input
              type="search"
              placeholder={t("home.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full text-sm font-body placeholder:text-outline p-0 h-auto"
            />
            <Link
              to="/recipes"
              className="ml-2 flex items-center justify-center bg-primary text-primary-foreground w-8 h-8 rounded-full hover:bg-primary-container transition-colors active:scale-95 duration-300 shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Link>
          </div>
        </form>
      </header>

      {/* Category Cards Grid */}
      <section className="flex-1 min-h-0 overflow-y-auto pb-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48">
                <Skeleton className="h-full w-full rounded-[1.5rem]" />
              </div>
            ))}
          </>
        ) : (
          categories.map((cat, index) => (
            <Link
              key={cat.category}
              to={`/recipes?category=${encodeURIComponent(cat.category)}`}
              className="group cursor-pointer"
            >
              <article className="relative h-48 overflow-hidden rounded-[1.5rem] editorial-grain">
                <img
                  src={`${BASE}${cat.image}`}
                  alt={cat.category}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="vignette-overlay absolute inset-0 flex flex-col justify-end p-5">
                  <span className="text-white/80 font-body uppercase tracking-widest text-[10px] mb-1">
                    {String(index + 1).padStart(2, "0")} — {cat.category}
                  </span>
                  <h3 className="font-headline text-3xl text-white font-bold tracking-tighter">
                    {cat.label}
                  </h3>
                </div>
              </article>
            </Link>
          ))
        )}
        </div>
      </section>
    </div>
  )
}
