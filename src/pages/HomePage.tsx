import { useState, useEffect, useMemo } from "react"
import Fuse from "fuse.js"
import { SearchBar } from "@/components/SearchBar"
import { FilterDrawer } from "@/components/FilterDrawer"
import { RecipeCard } from "@/components/RecipeCard"
import { Skeleton } from "@/components/ui/skeleton"
import type { RecipeSummary } from "@/types/recipe"

const BASE = import.meta.env.BASE_URL

export function HomePage() {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([])

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
    () => [...new Set(recipes.map((r) => r.category))].sort(),
    [recipes]
  )

  const difficulties = useMemo(
    () => [...new Set(recipes.map((r) => r.difficulty))],
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
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Ricette</h1>
        <p className="text-muted-foreground text-sm">
          Scopri le nostre ricette italiane tradizionali
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
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Nessuna ricetta trovata</p>
          <p className="text-sm mt-1">Prova a modificare i filtri o la ricerca</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.slug} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  )
}
