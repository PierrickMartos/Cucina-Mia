import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import Fuse from "fuse.js"
import { X } from "lucide-react"
import { SearchBar } from "@/components/SearchBar"
import { FilterDrawer } from "@/components/FilterDrawer"
import { RecipeGrid } from "@/components/RecipeGrid"
import { sortCategories, sortDifficulties } from "@/lib/categories"
import type { RecipeSummary } from "@/types/recipe"

const BASE = import.meta.env.BASE_URL

export function RecipesPage() {
  const [searchParams] = useSearchParams()
  const [recipes, setRecipes] = useState<RecipeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const cat = searchParams.get("category")
    return cat ? [cat] : []
  })
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([])
  const { t } = useTranslation()

  useEffect(() => {
    fetch(`${BASE}data/recipes/index.json`)
      .then((res) => res.json())
      .then((data) => {
        setRecipes(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const categories = useMemo(
    () => sortCategories([...new Set(recipes.map((r) => r.category))]),
    [recipes]
  )

  const difficulties = useMemo(
    () => sortDifficulties([...new Set(recipes.map((r) => r.difficulty))]),
    [recipes]
  )

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

  const filtered = useMemo(() => {
    let result = search.trim()
      ? fuse.search(search).map((r) => r.item)
      : recipes

    if (selectedCategories.length > 0) {
      result = result.filter((r) => selectedCategories.includes(r.category))
    }

    if (selectedDifficulties.length > 0) {
      result = result.filter((r) =>
        selectedDifficulties.includes(r.difficulty)
      )
    }

    return result
  }, [recipes, fuse, search, selectedCategories, selectedDifficulties])

  return (
    <div className="px-6 py-4">
      <div className="mb-4">
        <h1 className="font-headline text-2xl font-bold text-primary">{t("recipes.title")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("recipes.description")}
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <FilterDrawer
          categories={categories}
          difficulties={difficulties}
          selectedCategories={selectedCategories}
          selectedDifficulties={selectedDifficulties}
          onCategoriesChange={setSelectedCategories}
          onDifficultiesChange={setSelectedDifficulties}
        />
        {(selectedCategories.length > 0 || selectedDifficulties.length > 0) && (
          <button
            onClick={() => {
              setSelectedCategories([])
              setSelectedDifficulties([])
            }}
            className="cursor-pointer flex items-center justify-center w-10 h-10 rounded-full bg-surface-high text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
            aria-label={t("filter.clearAll")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <RecipeGrid recipes={filtered} loading={loading} />
    </div>
  )
}
