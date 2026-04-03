import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "motion/react"
import { useTranslation } from "react-i18next"
import { RecipeCard } from "@/components/RecipeCard"
import { Skeleton } from "@/components/ui/skeleton"
import type { RecipeSummary } from "@/types/recipe"

const STAGGER_MS = 60
const MAX_STAGGER_MS = 300

export function RecipesNotFound() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center text-center py-8 text-muted-foreground">
      <img
        src={`${import.meta.env.BASE_URL}images/empty-state.png`}
        alt="No recipes"
        className="w-96 sm:w-[36rem] mb-2 opacity-90"
      />
      <p className="text-[10px] text-muted-foreground/50 mb-6">
        Image by <a href="https://pixabay.com/users/flutie8211-17475707/?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=10203854" target="_blank" rel="noopener noreferrer" className="underline">Vicki Hamilton</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=image&utm_content=10203854" target="_blank" rel="noopener noreferrer" className="underline">Pixabay</a>
      </p>
      <p className="text-lg font-headline text-foreground">{t("recipes.noResults")}</p>
      <p className="text-sm mt-1">{t("recipes.noResultsHint")}</p>
    </div>
  )
}

export function AnimateInView({ children, index }: { children: React.ReactNode; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (reduceMotion) {
    return <div>{children}</div>
  }

  return (
    <div
      ref={ref}
      className={visible ? "card-enter" : "opacity-0"}
      style={visible ? ({ "--stagger-delay": `${Math.min(index * STAGGER_MS, MAX_STAGGER_MS)}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  )
}

interface RecipeGridProps {
  recipes: RecipeSummary[]
  loading?: boolean
}

export function RecipeGrid({ recipes, loading = false }: RecipeGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/3] w-full rounded-[1.5rem]" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (recipes.length === 0) {
    return <RecipesNotFound />
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {recipes.map((recipe, index) => (
        <AnimateInView key={recipe.slug} index={index}>
          <RecipeCard recipe={recipe} />
        </AnimateInView>
      ))}
    </div>
  )
}
