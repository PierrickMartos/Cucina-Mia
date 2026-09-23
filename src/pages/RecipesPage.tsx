import { useState, useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ChevronDown, ChevronUp, X } from "lucide-react"
import { SearchBar } from "@/components/SearchBar"
import { FilterDrawer, type TimeBucket, type PrepTimeBucket, type StepsBucket, type IngredientsBucket } from "@/components/FilterDrawer"
import { RecipeGrid } from "@/components/RecipeGrid"
import { sortCategories, sortDifficulties } from "@/lib/categories"
import { localizeRecipeSummary } from "@/lib/localize"
import { useRecipeIndex } from "@/lib/recipeData"
import { useRecipeSearch } from "@/hooks/useRecipeSearch"
import type { RecipeSummary } from "@/types/recipe"

const FILTERS_KEY = "cucina-mia-filters"
const ESSENTIAL_RECIPE_SLUGS = new Set([
  "pasta-carbonara",
  "poke-bowl-falafel-mangue",
  "curry-vert-de-pierrick",
  "gaspacho-de-pasteque-a-la-feta",
  "pasta-tartuffo",
  "gnocchi-alla-sorrentina",
  "gnocchi-champi-ail-au-four",
  "poulet-au-curry",
  "gnocchi-broccoli-al-forno",
  "katsudon",
  "coquillettes-jambon-truffe",
  "ravioli-prosciutto-caprino",
])

// "default" keeps the search ranking, or the cookbook order (oldest first) without a search
const SORT_OPTIONS = ["default", "newest", "quickest", "easiest", "alpha"] as const
type SortOption = (typeof SORT_OPTIONS)[number]
const DIFFICULTY_RANK: Record<RecipeSummary["difficulty"], number> = { Facile: 0, Medio: 1, Difficile: 2 }

function parseSort(value: string | null): SortOption {
  return SORT_OPTIONS.find((option) => option === value) ?? "default"
}

function sortRecipes(recipes: RecipeSummary[], sort: SortOption, order: Map<string, number>, locale: string) {
  const totalTime = (r: RecipeSummary) => r.prepTime + r.cookTime
  const position = (r: RecipeSummary) => order.get(r.slug) ?? 0
  switch (sort) {
    case "newest":
      return [...recipes].sort((a, b) => position(b) - position(a))
    case "quickest":
      return [...recipes].sort((a, b) => totalTime(a) - totalTime(b))
    case "easiest":
      return [...recipes].sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] || totalTime(a) - totalTime(b))
    case "alpha": {
      const collator = new Intl.Collator(locale, { sensitivity: "base" })
      return [...recipes].sort((a, b) => collator.compare(a.title, b.title))
    }
    default:
      return recipes
  }
}

function loadFilters() {
  try {
    const raw = localStorage.getItem(FILTERS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function getParamValues(params: URLSearchParams, key: string) {
  return params
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean)
}

function setMultiParam(params: URLSearchParams, key: string, values: string[]) {
  params.delete(key)
  values.forEach((value) => params.append(key, value))
}

export function RecipesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { recipes, loading, error, retry } = useRecipeIndex()
  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const [selectedTag, setSelectedTag] = useState<string | null>(searchParams.get("tag"))
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const categoriesFromUrl = getParamValues(searchParams, "category")
    if (categoriesFromUrl.length > 0) return categoriesFromUrl
    return loadFilters().categories ?? []
  })
  const fromCategory = searchParams.get("category") !== null
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(() => getParamValues(searchParams, "difficulty").length > 0 ? getParamValues(searchParams, "difficulty") : fromCategory ? [] : loadFilters().difficulties ?? [])
  const [selectedTimes, setSelectedTimes] = useState<TimeBucket[]>(() => {
    const values = getParamValues(searchParams, "time")
    return (values.length > 0 ? values : fromCategory ? [] : loadFilters().times ?? []) as TimeBucket[]
  })
  const [selectedPrepTimes, setSelectedPrepTimes] = useState<PrepTimeBucket[]>(() => {
    const values = getParamValues(searchParams, "prep")
    return (values.length > 0 ? values : fromCategory ? [] : loadFilters().prepTimes ?? []) as PrepTimeBucket[]
  })
  const [selectedSteps, setSelectedSteps] = useState<StepsBucket[]>(() => {
    const values = getParamValues(searchParams, "steps")
    return (values.length > 0 ? values : fromCategory ? [] : loadFilters().steps ?? []) as StepsBucket[]
  })
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientsBucket[]>(() => {
    const values = getParamValues(searchParams, "ingredients")
    return (values.length > 0 ? values : fromCategory ? [] : loadFilters().ingredients ?? []) as IngredientsBucket[]
  })
  const [selectedDietTags, setSelectedDietTags] = useState<string[]>(() => getParamValues(searchParams, "diet").length > 0 ? getParamValues(searchParams, "diet") : fromCategory ? [] : loadFilters().dietTags ?? [])
  const [selectedSeasonTags, setSelectedSeasonTags] = useState<string[]>(() => getParamValues(searchParams, "season").length > 0 ? getParamValues(searchParams, "season") : fromCategory ? [] : loadFilters().seasonTags ?? [])
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>(() => getParamValues(searchParams, "origin").length > 0 ? getParamValues(searchParams, "origin") : fromCategory ? [] : loadFilters().origins ?? [])
  const [selectedEssentials, setSelectedEssentials] = useState(() => {
    const value = searchParams.get("incontournables")
    if (value !== null) return value === "1"
    return fromCategory ? false : loadFilters().essentials ?? false
  })
  const [sort, setSort] = useState<SortOption>(() => parseSort(searchParams.get("sort")))
  const [showCleared, setShowCleared] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { t, i18n } = useTranslation()

  const localizedRecipes = useMemo(
    () => recipes.map((r) => localizeRecipeSummary(r, i18n.language)),
    [recipes, i18n.language]
  )
  // Diet/season filters use the base (French) tag keys, whatever the UI language
  const indexOrder = useMemo(
    () => new Map(recipes.map((r, i) => [r.slug, i])),
    [recipes]
  )
  const baseTagsBySlug = useMemo(
    () => new Map(recipes.map((r) => [r.slug, r.tags])),
    [recipes]
  )


  useEffect(() => {
    const allEmpty =
      selectedCategories.length === 0 &&
      selectedDifficulties.length === 0 &&
      selectedTimes.length === 0 &&
      selectedPrepTimes.length === 0 &&
      selectedSteps.length === 0 &&
      selectedIngredients.length === 0 &&
      selectedDietTags.length === 0 &&
      selectedSeasonTags.length === 0 &&
      selectedOrigins.length === 0 &&
      !selectedEssentials
    if (allEmpty) {
      localStorage.removeItem(FILTERS_KEY)
    } else {
      localStorage.setItem(FILTERS_KEY, JSON.stringify({
        categories: selectedCategories,
        difficulties: selectedDifficulties,
        times: selectedTimes,
        prepTimes: selectedPrepTimes,
        steps: selectedSteps,
        ingredients: selectedIngredients,
        dietTags: selectedDietTags,
        seasonTags: selectedSeasonTags,
        origins: selectedOrigins,
        essentials: selectedEssentials,
      }))
    }
  }, [selectedCategories, selectedDifficulties, selectedTimes, selectedPrepTimes, selectedSteps, selectedIngredients, selectedDietTags, selectedSeasonTags, selectedOrigins, selectedEssentials])

  useEffect(() => {
    const next = new URLSearchParams()
    if (search.trim()) next.set("q", search.trim())
    if (selectedTag) next.set("tag", selectedTag)
    setMultiParam(next, "category", selectedCategories)
    setMultiParam(next, "difficulty", selectedDifficulties)
    setMultiParam(next, "time", selectedTimes)
    setMultiParam(next, "prep", selectedPrepTimes)
    setMultiParam(next, "steps", selectedSteps)
    setMultiParam(next, "ingredients", selectedIngredients)
    setMultiParam(next, "diet", selectedDietTags)
    setMultiParam(next, "season", selectedSeasonTags)
    setMultiParam(next, "origin", selectedOrigins)
    if (selectedEssentials) next.set("incontournables", "1")
    if (sort !== "default") next.set("sort", sort)
    setSearchParams(next, { replace: true })
  }, [sort, search, selectedTag, selectedCategories, selectedDifficulties, selectedTimes, selectedPrepTimes, selectedSteps, selectedIngredients, selectedDietTags, selectedSeasonTags, selectedOrigins, selectedEssentials, setSearchParams])

  const categories = useMemo(
    () => sortCategories([...new Set(recipes.map((r) => r.category))]),
    [recipes]
  )

  const difficulties = useMemo(
    () => sortDifficulties([...new Set(recipes.map((r) => r.difficulty))]),
    [recipes]
  )

  const { slugs: searchSlugs, semanticStatus } = useRecipeSearch(recipes, search)

  function getTimeBucket(prepTime: number, cookTime: number): TimeBucket {
    const total = prepTime + cookTime
    if (total <= 20) return "quick"
    if (total <= 45) return "medium"
    return "long"
  }

  function getPrepTimeBucket(prepTime: number): PrepTimeBucket {
    if (prepTime <= 10) return "short"
    if (prepTime <= 30) return "medium"
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

  useEffect(() => {
    return () => {
      if (clearTimeoutRef.current !== null) {
        clearTimeout(clearTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const scrollContainer = document.getElementById("main-content")
    const handleScroll = () => {
      setShowScrollTop(scrollContainer ? scrollContainer.scrollTop > 480 : window.scrollY > 480)
    }

    handleScroll()

    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll, { passive: true })
      return () => scrollContainer.removeEventListener("scroll", handleScroll)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleClearAll = () => {
    setSelectedCategories([])
    setSelectedDifficulties([])
    setSelectedTimes([])
    setSelectedPrepTimes([])
    setSelectedSteps([])
    setSelectedIngredients([])
    setSelectedDietTags([])
    setSelectedSeasonTags([])
    setSelectedOrigins([])
    setSelectedEssentials(false)
    if (clearTimeoutRef.current !== null) {
      clearTimeout(clearTimeoutRef.current)
    }
    setShowCleared(true)
    clearTimeoutRef.current = setTimeout(() => setShowCleared(false), 2000)
  }

  const handleScrollTop = () => {
    const scrollContainer = document.getElementById("main-content")
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth"

    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior })
      return
    }

    window.scrollTo({ top: 0, behavior })
  }

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedDifficulties.length > 0 ||
    selectedTimes.length > 0 ||
    selectedPrepTimes.length > 0 ||
    selectedSteps.length > 0 ||
    selectedIngredients.length > 0 ||
    selectedDietTags.length > 0 ||
    selectedSeasonTags.length > 0 ||
    selectedOrigins.length > 0 ||
    selectedEssentials

  const filtered = useMemo(() => {
    let result = localizedRecipes
    if (searchSlugs) {
      const bySlug = new Map(localizedRecipes.map((r) => [r.slug, r]))
      result = searchSlugs.flatMap((slug) => bySlug.get(slug) ?? [])
    }

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

    if (selectedPrepTimes.length > 0) {
      result = result.filter((r) =>
        selectedPrepTimes.includes(getPrepTimeBucket(r.prepTime))
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
        selectedDietTags.some((tag) => baseTagsBySlug.get(r.slug)?.includes(tag))
      )
    }

    if (selectedSeasonTags.length > 0) {
      result = result.filter((r) =>
        selectedSeasonTags.some((tag) => baseTagsBySlug.get(r.slug)?.includes(tag))
      )
    }

    if (selectedOrigins.length > 0) {
      result = result.filter((r) =>
        selectedOrigins.includes(r.origin ?? "none")
      )
    }

    if (selectedEssentials) {
      result = result.filter((r) => ESSENTIAL_RECIPE_SLUGS.has(r.slug))
    }

    if (selectedTag) {
      result = result.filter((r) => r.tags.includes(selectedTag) || baseTagsBySlug.get(r.slug)?.includes(selectedTag))
    }

    return sortRecipes(result, sort, indexOrder, i18n.language)
  }, [sort, indexOrder, i18n.language, localizedRecipes, baseTagsBySlug, searchSlugs, selectedCategories, selectedDifficulties, selectedTimes, selectedPrepTimes, selectedSteps, selectedIngredients, selectedDietTags, selectedSeasonTags, selectedOrigins, selectedEssentials, selectedTag])

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="font-headline text-3xl font-bold text-primary tracking-[-0.02em]">
          {t("recipes.title")}
          {selectedCategories.length === 1 && (
            <span className="text-secondary font-light"> · {t(`categories.${selectedCategories[0]}`, selectedCategories[0])}</span>
          )}
        </h1>
        <span className="font-body text-secondary text-[10px] uppercase tracking-[0.2em] block mt-2">
          {!loading && filtered.length > 0 && (
            <span className="mr-1 text-primary font-semibold">{filtered.length} ·</span>
          )}
          {t("recipes.description")}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} semanticStatus={semanticStatus} />
        </div>
        <FilterDrawer
          categories={categories}
          difficulties={difficulties}
          selectedCategories={selectedCategories}
          selectedDifficulties={selectedDifficulties}
          selectedTimes={selectedTimes}
          selectedPrepTimes={selectedPrepTimes}
          selectedSteps={selectedSteps}
          selectedIngredients={selectedIngredients}
          selectedDietTags={selectedDietTags}
          selectedSeasonTags={selectedSeasonTags}
          selectedOrigins={selectedOrigins}
          selectedEssentials={selectedEssentials}
          onCategoriesChange={setSelectedCategories}
          onDifficultiesChange={setSelectedDifficulties}
          onTimesChange={setSelectedTimes}
          onPrepTimesChange={setSelectedPrepTimes}
          onStepsChange={setSelectedSteps}
          onIngredientsChange={setSelectedIngredients}
          onDietTagsChange={setSelectedDietTags}
          onSeasonTagsChange={setSelectedSeasonTags}
          onOriginsChange={setSelectedOrigins}
          onEssentialsChange={setSelectedEssentials}
          defaultOpen={searchParams.get("openFilters") === "1"}
        />
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="cursor-pointer flex items-center justify-center w-10 h-10 rounded-full bg-surface-high text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
            aria-label={t("filter.clearAll")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {showCleared && (
          <span role="status" aria-live="polite" className="text-sm text-green-600 ml-2 whitespace-nowrap">{t("filter.cleared")}</span>
        )}
      </div>

      {(hasActiveFilters || selectedTag) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {selectedCategories.map((cat) => (
            <button key={`cat-${cat}`} type="button" aria-label={t("filter.removeFilter", { value: t(`categories.${cat}`, cat) })} onClick={() => setSelectedCategories(selectedCategories.filter((c) => c !== cat))}
              className="cursor-pointer inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 hover:bg-primary/20 transition-colors">
              {t(`categories.${cat}`, cat)}<X className="h-3 w-3" />
            </button>
          ))}
          {selectedDifficulties.map((diff) => (
            <button key={`diff-${diff}`} type="button" aria-label={t("filter.removeFilter", { value: t(`difficulties.${diff}`, diff) })} onClick={() => setSelectedDifficulties(selectedDifficulties.filter((d) => d !== diff))}
              className="cursor-pointer inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 hover:bg-primary/20 transition-colors">
              {t(`difficulties.${diff}`, diff)}<X className="h-3 w-3" />
            </button>
          ))}
          {selectedTimes.map((bucket) => (
            <button key={`time-${bucket}`} type="button" aria-label={t("filter.removeFilter", { value: t(`timeOptions.${bucket}`) })} onClick={() => setSelectedTimes(selectedTimes.filter((b) => b !== bucket))}
              className="cursor-pointer inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 hover:bg-primary/20 transition-colors">
              {t(`timeOptions.${bucket}`)}<X className="h-3 w-3" />
            </button>
          ))}
          {selectedPrepTimes.map((bucket) => (
            <button key={`prep-${bucket}`} type="button" aria-label={t("filter.removeFilter", { value: t(`prepTimeOptions.${bucket}`) })} onClick={() => setSelectedPrepTimes(selectedPrepTimes.filter((b) => b !== bucket))}
              className="cursor-pointer inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 hover:bg-primary/20 transition-colors">
              {t(`prepTimeOptions.${bucket}`)}<X className="h-3 w-3" />
            </button>
          ))}
          {selectedSteps.map((bucket) => (
            <button key={`steps-${bucket}`} type="button" aria-label={t("filter.removeFilter", { value: t(`stepsOptions.${bucket}`) })} onClick={() => setSelectedSteps(selectedSteps.filter((b) => b !== bucket))}
              className="cursor-pointer inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 hover:bg-primary/20 transition-colors">
              {t(`stepsOptions.${bucket}`)}<X className="h-3 w-3" />
            </button>
          ))}
          {selectedIngredients.map((bucket) => (
            <button key={`ing-${bucket}`} type="button" aria-label={t("filter.removeFilter", { value: t(`ingredientsOptions.${bucket}`) })} onClick={() => setSelectedIngredients(selectedIngredients.filter((b) => b !== bucket))}
              className="cursor-pointer inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 hover:bg-primary/20 transition-colors">
              {t(`ingredientsOptions.${bucket}`)}<X className="h-3 w-3" />
            </button>
          ))}
          {selectedDietTags.map((tag) => (
            <button key={`diet-${tag}`} type="button" aria-label={t("filter.removeFilter", { value: t(`tags.${tag}`, tag) })} onClick={() => setSelectedDietTags(selectedDietTags.filter((d) => d !== tag))}
              className="cursor-pointer inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 hover:bg-primary/20 transition-colors">
              {t(`tags.${tag}`, tag)}<X className="h-3 w-3" />
            </button>
          ))}
          {selectedSeasonTags.map((tag) => (
            <button key={`season-${tag}`} type="button" aria-label={t("filter.removeFilter", { value: t(`tags.${tag}`, tag) })} onClick={() => setSelectedSeasonTags(selectedSeasonTags.filter((s) => s !== tag))}
              className="cursor-pointer inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 hover:bg-primary/20 transition-colors">
              {t(`tags.${tag}`, tag)}<X className="h-3 w-3" />
            </button>
          ))}
          {selectedOrigins.map((origin) => (
            <button key={`origin-${origin}`} type="button" aria-label={t("filter.removeFilter", { value: t(`origins.${origin}`, origin) })} onClick={() => setSelectedOrigins(selectedOrigins.filter((o) => o !== origin))}
              className="cursor-pointer inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 hover:bg-primary/20 transition-colors">
              {t(`origins.${origin}`, origin)}<X className="h-3 w-3" />
            </button>
          ))}
          {selectedEssentials && (
            <button key="essentials" type="button" aria-label={t("filter.removeFilter", { value: t("filter.essentials") })} onClick={() => setSelectedEssentials(false)}
              className="cursor-pointer inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 hover:bg-primary/20 transition-colors">
              {t("filter.essentials")}<X className="h-3 w-3" />
            </button>
          )}
          {selectedTag && (
            <button
              type="button"
              aria-label={t("filter.removeFilter", { value: selectedTag })}
              onClick={() => {
                setSelectedTag(null)
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev)
                  next.delete("tag")
                  return next
                })
              }}
              className="cursor-pointer inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 hover:bg-primary/20 transition-colors"
            >
              {selectedTag}<X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {!error && !loading && filtered.length > 1 && (
        <div className="flex justify-end mb-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="uppercase tracking-widest font-semibold">{t("sort.label")}</span>
            <span className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(parseSort(e.target.value))}
                className="appearance-none rounded-full border border-border bg-background pl-3 pr-7 py-1 text-sm font-semibold text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer transition-colors"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "default" && search.trim() ? t("sort.relevance") : t(`sort.${option}`)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" aria-hidden="true" />
            </span>
          </label>
        </div>
      )}

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
      ) : (
        <RecipeGrid recipes={filtered} loading={loading} />
      )}

      {showScrollTop && (
        <button
          type="button"
          onClick={handleScrollTop}
          aria-label={t("recipes.goToTop")}
          className="cursor-pointer fixed bottom-24 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-ambient transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:right-8 print:hidden"
        >
          <ChevronUp className="h-6 w-6" strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
