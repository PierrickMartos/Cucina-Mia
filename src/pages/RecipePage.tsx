import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ArrowLeft, Clock, CookingPot, Users, ChefHat, UtensilsCrossed } from "lucide-react"
import { motion, useMotionValue, useTransform, useReducedMotion, type Variants } from "motion/react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { localizeRecipeDetail } from "@/lib/localize"
import type { RecipeDetail } from "@/types/recipe"

const BASE = import.meta.env.BASE_URL

type Tab = "ingredients" | "instructions"

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
}

const itemVariantsReduced: Variants = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
}

const staggerContainerReduced: Variants = {
  hidden: {},
  visible: {},
}

export function RecipePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [rawRecipe, setRawRecipe] = useState<RecipeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const recipe = rawRecipe ? localizeRecipeDetail(rawRecipe, i18n.language) : null
  const [activeTab, setActiveTab] = useState<Tab>("ingredients")
  const storageKey = `cucina-mia:checks:${slug}`
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`cucina-mia:checks:${slug}`) ?? '{}')
    } catch { return {} }
  })
  const [headerBackVisible, setHeaderBackVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // Refs for each step — populated after recipe loads
  const stepRefs = useRef<(HTMLLIElement | null)[]>([])

  // Parallax: track main scroll via motion value, transform to a slow Y offset
  const scrollY = useMotionValue(0)
  const heroY = useTransform(scrollY, (v) => (reduceMotion ? 0 : v * 0.5))
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollEl = document.querySelector("main")
    if (!scrollEl) return
    function onScroll() {
      scrollY.set(scrollEl!.scrollTop)
      setHeaderBackVisible(scrollEl!.scrollTop > 80)
    }
    scrollEl.addEventListener("scroll", onScroll, { passive: true })
    return () => scrollEl.removeEventListener("scroll", onScroll)
  }, [scrollY])

  useEffect(() => {
    if (!recipe) return
    const prevTitle = document.title
    const metaDesc = document.querySelector('meta[name="description"]')
    const prevDesc = metaDesc?.getAttribute('content') ?? ''
    document.title = `${recipe.title} — Cucina Mia`
    metaDesc?.setAttribute('content', recipe.description ?? `Recette ${recipe.title} — Cucina Mia`)
    return () => {
      document.title = prevTitle
      metaDesc?.setAttribute('content', prevDesc)
    }
  }, [recipe])

  // Keep screen awake while reading a recipe
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch { /* Wake Lock not supported */ }
    }
    acquire()
    return () => { lock?.release() }
  }, [])

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    // Reset loading/error state for each fetch attempt (including retries)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    fetch(`${BASE}data/recipes/${slug}.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found")
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setRawRecipe(data)
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
  }, [slug, retryCount])

  const toggleIngredient = (id: string) => {
    setCheckedIngredients(prev => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  const resetChecks = () => {
    localStorage.removeItem(storageKey)
    setCheckedIngredients({})
  }

  const goToStep = (index: number) => {
    setCurrentStep(index)
    // Switch to instructions tab so the step is visible on mobile
    setActiveTab("instructions")
    // Scroll after a brief paint delay to allow tab content to render
    requestAnimationFrame(() => {
      const el = stepRefs.current[index]
      if (el) {
        el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" })
      }
    })
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="aspect-[4/5] sm:aspect-[16/10] lg:aspect-auto lg:h-[60vh] w-full" />
        <div className="relative -mt-16 mx-4 bg-background rounded-[1.5rem] p-6 text-center">
          <Skeleton className="h-3 w-32 mx-auto mb-4 rounded-full" />
          <Skeleton className="h-8 w-48 mx-auto mb-6 rounded" />
          <div className="flex justify-center gap-8 mb-4">
            <Skeleton className="h-16 w-20 rounded" />
            <Skeleton className="h-16 w-20 rounded" />
          </div>
          <Skeleton className="h-12 w-full rounded-full mt-6" />
        </div>
        <div className="px-6 mt-6">
          <Skeleton className="h-64 w-full rounded-[1.5rem]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => setRetryCount(c => c + 1)}
          className="rounded-full bg-surface-high px-5 py-2 text-sm font-medium text-foreground hover:bg-surface-container transition-colors"
        >
          Try again
        </button>
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
          className="inline-flex items-center justify-center rounded-full bg-surface-high px-5 py-2.5 text-sm font-medium hover:bg-surface-container transition-colors"
        >
          {t("recipe.backToRecipes")}
        </Link>
      </div>
    )
  }

  const headerSlot = document.getElementById("header-left-slot")

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
    }
    return `${minutes} min`
  }

  return (
    <div className="pb-8">
      {/* Back button — portaled into header when scrolled */}
      {headerSlot && createPortal(
        <button
          onClick={() => navigate(-1)}
          className={`cursor-pointer inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-all duration-200 ${
            headerBackVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
          }`}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t("recipe.back")}
        </button>,
        headerSlot
      )}

      {/* Full-width Hero Image */}
      <div ref={heroRef} className="relative overflow-hidden aspect-[4/5] sm:aspect-[16/10] lg:aspect-auto lg:h-[60vh]">
        {/* Back button overlaid on image */}
        <button
          onClick={() => navigate(-1)}
          aria-label={t("recipe.back")}
          className={`cursor-pointer absolute top-4 left-4 z-10 inline-flex items-center justify-center h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-all duration-200 ${
            headerBackVisible ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <motion.img
          src={`${BASE}${recipe.images.cover}`}
          alt={recipe.title}
          style={{ y: heroY }}
          className="absolute inset-0 h-[115%] w-full object-cover object-center"
        />
        {/* Bottom gradient fade */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

        {/* Image Credit */}
        {recipe.imageCredit && (recipe.imageCredit.author || recipe.imageCredit.url) && (
          <p className="absolute bottom-20 right-4 text-[12px] text-white/90">
            {recipe.imageCredit.url ? (
              <a href={recipe.imageCredit.url} target="_blank" rel="noopener noreferrer">
                {recipe.imageCredit.author || "Pixabay"}
              </a>
            ) : (
              recipe.imageCredit.author || "Pixabay"
            )}
          </p>
        )}
      </div>

      {/* Recipe Info Card — overlaps image, settles in on mount */}
      <motion.div
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative -mt-16 mx-4 bg-background rounded-[1.5rem] pt-8 pb-6 px-6 text-center shadow-lg"
      >
        {/* Category label */}
        <span className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold">
          {t(`categories.${recipe.category}`, recipe.category)}
        </span>

        {/* Title */}
        <h1 className="font-headline text-3xl sm:text-4xl font-bold tracking-[-0.02em] leading-tight mt-3 mb-6">
          {recipe.title}
        </h1>

        {/* Time + Difficulty — staggered */}
        <motion.div
          variants={reduceMotion ? staggerContainerReduced : staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-center gap-8 mb-5"
        >
          <motion.div variants={reduceMotion ? itemVariantsReduced : itemVariants} className="flex flex-col items-center gap-1.5">
            <Clock className="h-5 w-5 text-primary" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{t("recipe.prep")}</span>
            <span className="text-sm font-bold">{formatTime(recipe.prepTime)}</span>
          </motion.div>
          <motion.div variants={reduceMotion ? itemVariantsReduced : itemVariants} className="w-px h-10 bg-border" />
          <motion.div variants={reduceMotion ? itemVariantsReduced : itemVariants} className="flex flex-col items-center gap-1.5">
            <CookingPot className="h-5 w-5 text-primary" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{t("recipe.cook")}</span>
            <span className="text-sm font-bold">{formatTime(recipe.cookTime)}</span>
          </motion.div>
          <motion.div variants={reduceMotion ? itemVariantsReduced : itemVariants} className="w-px h-10 bg-border" />
          <motion.div variants={reduceMotion ? itemVariantsReduced : itemVariants} className="flex flex-col items-center gap-1.5">
            <ChefHat className="h-5 w-5 text-primary" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{t("recipe.difficulty")}</span>
            <span className="text-sm font-bold">{t(`difficulties.${recipe.difficulty}`, recipe.difficulty)}</span>
          </motion.div>
        </motion.div>

        {/* Servings & Tags — staggered */}
        <motion.div
          variants={reduceMotion ? staggerContainerReduced : staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-center gap-4 pt-4 border-t border-border"
        >
          <motion.div variants={reduceMotion ? itemVariantsReduced : itemVariants} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{recipe.servings} {t("recipe.servings")}</span>
          </motion.div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {recipe.tags.map((tag) => (
              <motion.div key={tag} variants={reduceMotion ? itemVariantsReduced : itemVariants}>
                <Link to={`/recipes?tag=${encodeURIComponent(tag)}`}>
                  <Badge variant="outline" className="text-[10px] text-outline rounded-full cursor-pointer hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors">
                    {tag}
                  </Badge>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </motion.div>

      <div className="px-6 mt-8">

      {/* Tab Switcher — hidden on large screens */}
      <motion.div
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4, ease: "easeOut" }}
        className="bg-surface-high rounded-full p-1.5 flex mb-8 max-w-2xl mx-auto lg:hidden"
      >
        <button
          onClick={() => setActiveTab("ingredients")}
          className={`relative flex-1 rounded-full py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors cursor-pointer ${
            activeTab === "ingredients"
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {activeTab === "ingredients" && (
            <motion.span
              layoutId="tab-indicator"
              className="absolute inset-0 gradient-primary rounded-full"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{t("recipe.ingredients")}</span>
        </button>
        <button
          onClick={() => setActiveTab("instructions")}
          className={`relative flex-1 rounded-full py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors cursor-pointer ${
            activeTab === "instructions"
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {activeTab === "instructions" && (
            <motion.span
              layoutId="tab-indicator"
              className="absolute inset-0 gradient-primary rounded-full"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{t("recipe.instructions")}</span>
        </button>
      </motion.div>

      {/* Tab Content — mobile only */}
      <div key={activeTab} className="tab-enter lg:hidden">
      {activeTab === "ingredients" ? (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span />
            {Object.values(checkedIngredients).some(Boolean) && (
              <button
                type="button"
                onClick={resetChecks}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer"
              >
                {t("recipe.resetChecks", "Reset")}
              </button>
            )}
          </div>
          {recipe.ingredients.map((group, gi) => (
            <div key={gi} className="mb-6">
              {group.group && (
                <h3 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
                  {group.group}
                </h3>
              )}
              <ul className="space-y-1.5">
                {group.items.map((item, ii) => {
                  const key = `${gi}-${ii}`
                  const isChecked = !!checkedIngredients[key]
                  return (
                    <li key={key}>
                      <label
                        className="flex items-center gap-4 py-2 cursor-pointer group"
                        onClick={() => toggleIngredient(key)}
                      >
                        <div
                          className={`h-6 w-6 rounded-lg shrink-0 flex items-center justify-center transition-colors ${
                            isChecked
                              ? "gradient-primary"
                              : "bg-surface-high group-hover:bg-surface-container"
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
        <section className="mb-8 pb-24">
          <ol className="space-y-6">
            {recipe.steps.map((step, i) => (
              <li
                key={i}
                ref={(el) => { stepRefs.current[i] = el }}
                className={`flex gap-4 rounded-xl px-3 py-3 -mx-3 transition-colors duration-200 ${
                  i === currentStep
                    ? "bg-primary/8 border-l-4 border-primary pl-2"
                    : ""
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-primary text-primary-foreground text-sm font-bold">
                  {i + 1}
                </span>
                <div className="pt-1">
                  <p className="text-base leading-relaxed">{step.text}</p>
                  {step.image && (
                    <img
                      src={`${BASE}${step.image}`}
                      alt={step.text}
                      className="mt-3 rounded-xl max-w-full"
                      loading="lazy"
                    />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      </div>

      {/* Two-column layout — large screens & landscape tablets */}
      <div className="hidden lg:grid grid-cols-[minmax(0,300px)_1fr] gap-12 mb-8 max-w-4xl mx-auto">
        {/* Ingredients column */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-headline text-xl font-bold tracking-[-0.02em] text-primary">{t("recipe.ingredients")}</h2>
            {Object.values(checkedIngredients).some(Boolean) && (
              <button
                type="button"
                onClick={resetChecks}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer"
              >
                {t("recipe.resetChecks", "Reset")}
              </button>
            )}
          </div>
          {recipe.ingredients.map((group, gi) => (
            <div key={gi} className="mb-6">
              {group.group && (
                <h3 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
                  {group.group}
                </h3>
              )}
              <ul className="space-y-1.5">
                {group.items.map((item, ii) => {
                  const key = `${gi}-${ii}`
                  const isChecked = !!checkedIngredients[key]
                  return (
                    <li key={key}>
                      <label
                        className="flex items-center gap-4 py-2 cursor-pointer group"
                        onClick={() => toggleIngredient(key)}
                      >
                        <div
                          className={`h-6 w-6 rounded-lg shrink-0 flex items-center justify-center transition-colors ${
                            isChecked
                              ? "gradient-primary"
                              : "bg-surface-high group-hover:bg-surface-container"
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

        {/* Instructions column */}
        <section>
          <h2 className="font-headline text-xl font-bold tracking-[-0.02em] mb-6 text-primary">{t("recipe.instructions")}</h2>
          <ol className="space-y-6">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-primary text-primary-foreground text-sm font-bold">
                  {i + 1}
                </span>
                <div className="pt-1">
                  <p className="text-base leading-relaxed">{step.text}</p>
                  {step.image && (
                    <img
                      src={`${BASE}${step.image}`}
                      alt={step.text}
                      className="mt-3 rounded-xl max-w-full"
                      loading="lazy"
                    />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Tips */}
      {recipe.tips && recipe.tips.length > 0 && (
        <section className="relative mb-8 rounded-[1.5rem] bg-surface-low px-8 py-7 overflow-hidden max-w-4xl mx-auto">
          <UtensilsCrossed className="absolute right-6 bottom-4 h-24 w-24 text-primary opacity-[0.07] pointer-events-none" strokeWidth={1.5} />
          <h2 className="font-headline text-xl font-bold mb-4 tracking-[-0.02em] text-primary">{t("recipe.tips")}</h2>
          <div className="space-y-2">
            {recipe.tips.map((tip, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground">{tip}</p>
            ))}
          </div>
        </section>
      )}

      {/* Source Card */}
      {recipe.source && (
        <div className="rounded-[1.5rem] bg-surface-container p-6 flex items-center gap-4 max-w-4xl mx-auto">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-primary font-semibold block">
              {t("recipe.source")}
            </span>
            <span className="font-semibold text-foreground">{recipe.source}</span>
          </div>
        </div>
      )}
      </div>

      {/* Step navigator sticky bar — mobile only, portaled to body */}
      {recipe.steps.length > 0 && createPortal(
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border">
          {/* Progress bar */}
          <div className="h-1 bg-border">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${((currentStep + 1) / recipe.steps.length) * 100}%` }}
            />
          </div>
          {/* Controls */}
          <div className="flex items-center justify-between py-3 px-4 pb-4">
            <button
              type="button"
              onClick={() => goToStep(currentStep - 1)}
              disabled={currentStep === 0}
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-high cursor-pointer"
              aria-label={t("recipe.prevStep", "Previous step")}
            >
              <ArrowLeft className="h-4 w-4" />
              {t("recipe.prev", "Prev")}
            </button>

            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest select-none">
              {t("recipe.stepOf", { current: currentStep + 1, total: recipe.steps.length, defaultValue: `Step ${currentStep + 1} of ${recipe.steps.length}` })}
            </span>

            <button
              type="button"
              onClick={() => goToStep(currentStep + 1)}
              disabled={currentStep === recipe.steps.length - 1}
              className="inline-flex items-center gap-1 text-sm font-semibold gradient-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg cursor-pointer transition-opacity"
              aria-label={t("recipe.nextStep", "Next step")}
            >
              {t("recipe.next", "Next")}
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
