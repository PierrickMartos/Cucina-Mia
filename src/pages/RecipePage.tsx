import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ArrowLeft, Clock, CookingPot, Users, ChefHat } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { RecipeDetail } from "@/types/recipe"

const BASE = import.meta.env.BASE_URL

type Tab = "ingredients" | "instructions"

export function RecipePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("ingredients")
  const [checked, setChecked] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!slug) return
    fetch(`${BASE}data/recipes/${slug}.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then((data) => {
        setRecipe(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [slug])

  function toggleCheck(key: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (loading) {
    return (
      <div className="px-6 py-4">
        <Skeleton className="h-8 w-24 mb-4 rounded-full" />
        <Skeleton className="aspect-[3/4] w-full rounded-[1.5rem] mb-4" />
        <Skeleton className="h-6 w-48 mb-6" />
        <Skeleton className="h-12 w-full rounded-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-lg text-muted-foreground mb-4 font-headline">
          {t("recipe.notFound")}
        </p>
        <Link
          to="/recipes"
          className="inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-surface-high transition-colors"
        >
          {t("recipe.backToRecipes")}
        </Link>
      </div>
    )
  }

  return (
    <div className="px-6 py-2 pb-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        {t("recipe.back")}
      </button>

      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-[1.5rem] mb-4 editorial-grain">
        <div className="aspect-[3/4] sm:aspect-[4/3]">
          <img
            src={`${BASE}${recipe.image}`}
            alt={recipe.title}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="vignette-overlay absolute inset-0 flex flex-col justify-end p-5">
          <Badge className="bg-primary-container text-primary-foreground border-0 text-[10px] uppercase tracking-widest w-fit mb-2 rounded-full px-3 py-1">
            {recipe.category}
          </Badge>
          <h1 className="font-headline text-3xl sm:text-4xl text-white font-bold tracking-tight leading-tight">
            {recipe.title}
          </h1>
        </div>
      </div>

      {/* Time & Info Row */}
      <div className="flex items-center gap-6 mb-6 px-1">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Clock className="h-5 w-5 text-primary" />
          <span>
            {t("recipe.prep")} <strong>{recipe.prepTime} min</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CookingPot className="h-5 w-5 text-primary" />
          <span>
            {t("recipe.cook")} <strong>{recipe.cookTime} min</strong>
          </span>
        </div>
      </div>

      {/* Servings & Difficulty */}
      <div className="flex items-center gap-6 mb-6 px-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{recipe.servings} {t("recipe.servings")}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ChefHat className="h-4 w-4" />
          <span>{recipe.difficulty}</span>
        </div>
        <div className="flex flex-wrap gap-1 ml-auto">
          {recipe.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-[10px] border-border text-outline rounded-full"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-surface-high rounded-full p-1 flex mb-6">
        <button
          onClick={() => setActiveTab("ingredients")}
          className={`flex-1 rounded-full py-2.5 text-xs font-semibold uppercase tracking-widest transition-all duration-300 ${
            activeTab === "ingredients"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("recipe.ingredients")}
        </button>
        <button
          onClick={() => setActiveTab("instructions")}
          className={`flex-1 rounded-full py-2.5 text-xs font-semibold uppercase tracking-widest transition-all duration-300 ${
            activeTab === "instructions"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("recipe.instructions")}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "ingredients" ? (
        <section className="mb-8">
          {recipe.ingredients.map((group, gi) => (
            <div key={gi} className="mb-6">
              {group.group && (
                <h3 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
                  {group.group}
                </h3>
              )}
              <ul className="space-y-1">
                {group.items.map((item, ii) => {
                  const key = `${gi}-${ii}`
                  const isChecked = checked.has(key)
                  return (
                    <li key={key}>
                      <label
                        className="flex items-center gap-4 py-3 cursor-pointer group"
                        onClick={() => toggleCheck(key)}
                      >
                        <div
                          className={`h-6 w-6 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${
                            isChecked
                              ? "bg-primary border-primary"
                              : "border-border group-hover:border-outline"
                          }`}
                        >
                          {isChecked && (
                            <svg
                              className="h-3.5 w-3.5 text-primary-foreground"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <span
                          className={`text-base transition-colors ${
                            isChecked
                              ? "line-through text-outline"
                              : "text-foreground"
                          }`}
                        >
                          {item}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </section>
      ) : (
        <section className="mb-8">
          <ol className="space-y-6">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {i + 1}
                </span>
                <div className="pt-1">
                  <p className="text-base leading-relaxed">{step.text}</p>
                  {step.image && (
                    <img
                      src={`${BASE}${step.image}`}
                      alt={t("recipe.step", { number: i + 1 })}
                      className="mt-3 rounded-[1rem] max-w-full"
                      loading="lazy"
                    />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Tips */}
      {recipe.tips && recipe.tips.length > 0 && (
        <section className="mb-6 rounded-[1.5rem] bg-surface-high p-5">
          <h2 className="font-headline text-lg font-bold mb-3">{t("recipe.tips")}</h2>
          <ul className="space-y-2">
            {recipe.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary shrink-0 mt-0.5">*</span>
                {tip}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Source Card */}
      {recipe.source && (
        <div className="rounded-[1.5rem] bg-surface-variant p-5 flex items-center gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-primary font-semibold block">
              {t("recipe.source")}
            </span>
            <span className="font-semibold text-foreground">{recipe.source}</span>
          </div>
        </div>
      )}
    </div>
  )
}
