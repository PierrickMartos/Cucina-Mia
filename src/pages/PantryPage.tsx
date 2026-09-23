import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { AnimateInView, RecipesNotFound } from "@/components/RecipeGrid"
import { RecipeCard } from "@/components/RecipeCard"
import { loadSearchDocuments, useRecipeIndex } from "@/lib/recipeData"
import { normalize } from "@/lib/search/text"
import { cn } from "@/lib/utils"
import {
  PANTRY_GROUPS,
  PANTRY_ITEMS_BY_ID,
  pantryLabel,
  parsePantryDocuments,
  rankByPantry,
  usedItems,
  type PantryMatch,
  type PantryNeeds,
  type PantrySort,
} from "@/lib/pantry"

const PANTRY_KEY = "cucina-mia-pantry"
// Items shown per group before "show more" (the most used ones come first)
const GROUP_PREVIEW = 10

function loadSaved(): string[] {
  try {
    const raw = localStorage.getItem(PANTRY_KEY)
    const value = raw ? JSON.parse(raw) : []
    return Array.isArray(value) ? value.filter((id) => typeof id === "string") : []
  } catch {
    return []
  }
}

function usePantryNeeds() {
  const [state, setState] = useState<{ needs?: PantryNeeds; error: boolean }>({ error: false })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    loadSearchDocuments()
      .then((data) => { if (!cancelled) setState({ needs: parsePantryDocuments(data), error: false }) })
      .catch(() => { if (!cancelled) setState({ error: true }) })
    return () => { cancelled = true }
  }, [attempt])
  return { ...state, retry: () => { setState({ error: false }); setAttempt((a) => a + 1) } }
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "cursor-pointer inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        selected
          ? "gradient-primary text-primary-foreground"
          : "bg-surface-high text-foreground hover:bg-primary/10 hover:text-primary"
      )}
    >
      {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      {label}
    </button>
  )
}

function MatchSummary({ match }: { match: PantryMatch }) {
  const { t, i18n } = useTranslation()
  const have = match.total - match.missing.length
  const known = match.missing.filter((need) => need.items.length > 0)
  const names = known.map((need) =>
    need.items.map((id) => pantryLabel(PANTRY_ITEMS_BY_ID.get(id)!, i18n.language)).join(" / ")
  )
  const shown = names.slice(0, 4)
  const more = match.missing.length - shown.length
  return (
    <div className="mb-4 space-y-1.5">
      <div className="flex items-center gap-2">
        <div
          className="h-1.5 flex-1 rounded-full bg-surface-high overflow-hidden"
          role="img"
          aria-label={t("pantry.matched", { count: have, total: match.total })}
        >
          <div className="h-full gradient-primary rounded-full" style={{ width: `${(have / match.total) * 100}%` }} />
        </div>
        <span className="text-[11px] font-semibold text-primary whitespace-nowrap">
          {t("pantry.matched", { count: have, total: match.total })}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {match.missing.length === 0
          ? t("pantry.complete")
          : t("pantry.missing", { list: shown.join(", ") + (more > 0 ? ` +${more}` : "") })}
      </p>
    </div>
  )
}

export function PantryPage() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { recipes, loading: recipesLoading, error: recipesError, retry: retryRecipes } = useRecipeIndex()
  const { needs, error: needsError, retry: retryNeeds } = usePantryNeeds()
  const [selected, setSelected] = useState<string[]>(() => {
    const fromUrl = (searchParams.get("have") ?? "").split(",").filter(Boolean)
    return (fromUrl.length > 0 ? fromUrl : loadSaved()).filter((id) => PANTRY_ITEMS_BY_ID.has(id))
  })
  const [sort, setSort] = useState<PantrySort>(searchParams.get("sort") === "missing" ? "missing" : "matches")
  const [filter, setFilter] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const resultsRef = useRef<HTMLElement>(null)

  useEffect(() => {
    try {
      if (selected.length > 0) localStorage.setItem(PANTRY_KEY, JSON.stringify(selected))
      else localStorage.removeItem(PANTRY_KEY)
    } catch {
      // Storage unavailable (private mode): the selection still lives in the URL
    }
    const next = new URLSearchParams()
    if (selected.length > 0) next.set("have", selected.join(","))
    if (sort !== "matches") next.set("sort", sort)
    setSearchParams(next, { replace: true })
  }, [selected, sort, setSearchParams])

  const have = useMemo(() => new Set(selected), [selected])
  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))

  const items = useMemo(() => (needs ? usedItems(needs) : []), [needs])
  const folded = normalize(filter)
  const visibleItems = useMemo(
    () =>
      folded
        ? items.filter(({ item }) =>
            [item.label.fr, item.label.en, item.label.it, ...item.match].some((text) => normalize(text).includes(folded))
          )
        : items,
    [items, folded]
  )

  const bySlug = useMemo(() => new Map(recipes.map((r) => [r.slug, r])), [recipes])
  const matches = useMemo(
    () => (needs ? rankByPantry(needs, have, sort).filter((m) => bySlug.has(m.slug)) : []),
    [needs, have, sort, bySlug]
  )

  const loading = recipesLoading || (!needs && !needsError)
  const error = recipesError || needsError

  const scrollToResults = () => {
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    resultsRef.current?.scrollIntoView?.({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" })
  }

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="font-headline text-3xl font-bold text-primary tracking-[-0.02em]">{t("pantry.title")}</h1>
        <span className="font-body text-secondary text-[10px] uppercase tracking-[0.2em] block mt-2">
          {t("pantry.subtitle")}
        </span>
      </div>

      {error ? (
        <div role="alert" className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <p className="text-sm text-muted-foreground">{t("common.loadError")}</p>
          <button
            type="button"
            onClick={() => {
              if (recipesError) retryRecipes()
              if (needsError) retryNeeds()
            }}
            className="rounded-full bg-surface-high px-5 py-2 text-sm font-medium text-foreground hover:bg-surface-container transition-colors"
          >
            {t("common.tryAgain")}
          </button>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10 lg:items-start">
          {/* Ingredient picker */}
          <section aria-labelledby="pantry-ingredients" className="mb-8 lg:mb-0">
            <h2 id="pantry-ingredients" className="sr-only">{t("pantry.ingredients")}</h2>
            <div className="flex items-center bg-surface-high rounded-full px-4 py-2.5 mb-4 transition-all duration-300 focus-within:bg-surface-lowest focus-within:shadow-[inset_0_0_0_1px_rgba(192,90,62,0.2)]">
              <Search className="text-outline h-4 w-4 mr-3 shrink-0" />
              <Input
                type="search"
                placeholder={t("pantry.searchPlaceholder")}
                aria-label={t("pantry.searchLabel")}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-transparent border-none shadow-none focus-visible:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full text-base md:text-sm font-body placeholder:text-outline p-0 h-auto"
              />
            </div>

            {selected.length > 0 && (
              <div className="mb-5 rounded-[1.25rem] bg-surface-lowest p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-secondary">
                    {t("pantry.selected", { count: selected.length })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelected([])}
                    className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
                  >
                    {t("pantry.clear")}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.map((id) => {
                    const label = pantryLabel(PANTRY_ITEMS_BY_ID.get(id)!, i18n.language)
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-label={t("filter.removeFilter", { value: label })}
                        onClick={() => toggle(id)}
                        className="cursor-pointer inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 hover:bg-primary/20 transition-colors"
                      >
                        {label}
                        <X className="h-3 w-3" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 12 }, (_, i) => (
                  <Skeleton key={i} className="h-7 w-20 rounded-full" />
                ))}
              </div>
            ) : visibleItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("pantry.noIngredient")}</p>
            ) : (
              <div className="space-y-5">
                {PANTRY_GROUPS.map((group) => {
                  const groupItems = visibleItems.filter(({ item }) => item.group === group)
                  if (groupItems.length === 0) return null
                  // While filtering, every match is shown
                  const open = folded !== "" || expanded.has(group)
                  const shown = open ? groupItems : groupItems.slice(0, GROUP_PREVIEW)
                  const hidden = groupItems.length - shown.length
                  return (
                    <div key={group}>
                      <h3 className="font-headline text-sm font-bold text-foreground mb-2">{t(`pantry.groups.${group}`)}</h3>
                      <div className="flex flex-wrap gap-2">
                        {shown.map(({ item }) => (
                          <Chip
                            key={item.id}
                            label={pantryLabel(item, i18n.language)}
                            selected={have.has(item.id)}
                            onClick={() => toggle(item.id)}
                          />
                        ))}
                        {!folded && groupItems.length > GROUP_PREVIEW && (
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() =>
                              setExpanded((current) => {
                                const next = new Set(current)
                                if (next.has(group)) next.delete(group)
                                else next.add(group)
                                return next
                              })
                            }
                            className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                          >
                            {open ? t("pantry.showLess") : t("pantry.showMore", { count: hidden })}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                <p className="text-xs text-muted-foreground">{t("pantry.staplesHint")}</p>
              </div>
            )}

            {/* Mobile: the results are below a long list, keep a way to jump there while ticking */}
            {selected.length > 0 && !loading && (
              <div className="lg:hidden sticky bottom-3 z-10 mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={scrollToResults}
                  className="cursor-pointer inline-flex items-center gap-1 rounded-full gradient-primary text-primary-foreground shadow-ambient text-sm font-medium px-5 py-2.5"
                >
                  {t("pantry.seeResults", { count: matches.length })}
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            )}
          </section>

          {/* Results */}
          <section ref={resultsRef} aria-labelledby="pantry-results" className="scroll-mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 id="pantry-results" className="font-headline text-xl font-bold text-foreground tracking-[-0.02em]">
                {selected.length > 0 && !loading ? t("pantry.results", { count: matches.length }) : t("pantry.resultsTitle")}
              </h2>
              {selected.length > 0 && matches.length > 1 && (
                <div role="group" aria-label={t("pantry.sortLabel")} className="inline-flex rounded-full bg-surface-high p-1">
                  {(["matches", "missing"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={sort === value}
                      onClick={() => setSort(value)}
                      className={cn(
                        "cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        sort === value ? "bg-surface-lowest text-primary shadow-sm" : "text-muted-foreground hover:text-primary"
                      )}
                    >
                      {t(value === "matches" ? "pantry.sortMatches" : "pantry.sortMissing")}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="aspect-[4/3] w-full rounded-[1.5rem]" />
                ))}
              </div>
            ) : selected.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t("pantry.pickPrompt")}</p>
            ) : matches.length === 0 ? (
              <RecipesNotFound />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {matches.map((match, index) => (
                  <AnimateInView key={match.slug} index={index}>
                    <RecipeCard recipe={bySlug.get(match.slug)!}>
                      <MatchSummary match={match} />
                    </RecipeCard>
                  </AnimateInView>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
