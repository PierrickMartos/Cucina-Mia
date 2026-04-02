import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import Fuse from "fuse.js"
import { X } from "lucide-react"
import { SearchBar } from "@/components/SearchBar"
import { FilterDrawer, type TimeBucket, type StepsBucket, type IngredientsBucket } from "@/components/FilterDrawer"
import { RecipeGrid } from "@/components/RecipeGrid"
import { sortCategories, sortDifficulties } from "@/lib/categories"
import { localizeRecipeSummary } from "@/lib/localize"
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
  const [selectedTimes, setSelectedTimes] = useState<TimeBucket[]>([])
  const [selectedSteps, setSelectedSteps] = useState<StepsBucket[]>([])
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientsBucket[]>([])
  const [selectedDietTags, setSelectedDietTags] = useState<string[]>([])
  const [selectedSeasonTags, setSelectedSeasonTags] = useState<string[]>([])
  const { t, i18n } = useTranslation()

  const localizedRecipes = useMemo(
    () => recipes.map((r) => localizeRecipeSummary(r, i18n.language)),
    [recipes, i18n.language]
  )

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
      new Fuse(localizedRecipes, {
        keys: [
          { name: "title", weight: 2 },
          { name: "description", weight: 1 },
          { name: "tags", weight: 1.5 },
          { name: "category", weight: 1 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [localizedRecipes]
  )

  function getTimeBucket(prepTime: number, cookTime: number): TimeBucket {
    const total = prepTime + cookTime
    if (total <= 20) return "quick"
    if (total <= 45) return "medium"
    return "long"
  }

  function getStepsBucket(stepCount: number | undefined): StepsBucket {
    if (stepCount === undefined) return "medium"
    if (stepCount <= 4) return "simple"
    if (stepCount <= 7) return "medium"
    return "complex"
  }

  function getIngredientsBucket(ingredientCount: number | undefined): IngredientsBucket {
    if (ingredientCount === undefined) return "moderate"
    if (ingredientCount <= 6) return "few"
    if (ingredientCount <= 11) return "moderate"
    return "many"
  }

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedDifficulties.length > 0 ||
    selectedTimes.length > 0 ||
    selectedSteps.length > 0 ||
    selectedIngredients.length > 0 ||
    selectedDietTags.length > 0 ||
    selectedSeasonTags.length > 0

  const filtered = useMemo(() => {
    let result = search.trim()
      ? fuse.search(search).map((r) => r.item)
      : localizedRecipes

    if (selectedCategories.length > 0) {
      result = result.filter((r) => selectedCategories.includes(r.category))
    }

    if (selectedDifficulties.length > 0) {
      result = result.filter((r) => selectedDifficulties.includes(r.difficulty))
    }

    if (selectedTimes.length > 0) {
      result = result.filter((r) =>
        selectedTimes.includes(getTimeBucket(r.prepTime, r.cookTime))
      )
    }

    if (selectedSteps.length > 0) {
      result = result.filter((r) =>
        selectedSteps.includes(getStepsBucket(r.stepCount))
      )
    }

    if (selectedIngredients.length > 0) {
      result = result.filter((r) =>
        selectedIngredients.includes(getIngredientsBucket(r.ingredientCount))
      )
    }

    if (selectedDietTags.length > 0) {
      result = result.filter((r) =>
        selectedDietTags.some((tag) => r.tags.includes(tag))
      )
    }

    if (selectedSeasonTags.length > 0) {
      result = result.filter((r) =>
        selectedSeasonTags.some((tag) => r.tags.includes(tag))
      )
    }

    return result
  }, [localizedRecipes, fuse, search, selectedCategories, selectedDifficulties, selectedTimes, selectedSteps, selectedIngredients, selectedDietTags, selectedSeasonTags])

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="font-headline text-3xl font-bold text-primary tracking-[-0.02em]">{t("recipes.title")}</h1>
        <span className="font-body text-secondary text-[10px] uppercase tracking-[0.2em] block mt-2">
          {t("recipes.description")}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <FilterDrawer
          categories={categories}
          difficulties={difficulties}
          selectedCategories={selectedCategories}
          selectedDifficulties={selectedDifficulties}
          selectedTimes={selectedTimes}
          selectedSteps={selectedSteps}
          selectedIngredients={selectedIngredients}
          selectedDietTags={selectedDietTags}
          selectedSeasonTags={selectedSeasonTags}
          onCategoriesChange={setSelectedCategories}
          onDifficultiesChange={setSelectedDifficulties}
          onTimesChange={setSelectedTimes}
          onStepsChange={setSelectedSteps}
          onIngredientsChange={setSelectedIngredients}
          onDietTagsChange={setSelectedDietTags}
          onSeasonTagsChange={setSelectedSeasonTags}
        />
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSelectedCategories([])
              setSelectedDifficulties([])
              setSelectedTimes([])
              setSelectedSteps([])
              setSelectedIngredients([])
              setSelectedDietTags([])
              setSelectedSeasonTags([])
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
