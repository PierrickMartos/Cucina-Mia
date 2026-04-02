import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { RecipeCard } from "@/components/RecipeCard"
import { Skeleton } from "@/components/ui/skeleton"
import type { RecipeSummary } from "@/types/recipe"

const STAGGER_MS = 60
const MAX_STAGGER_MS = 300

function AnimateInView({ children, index }: { children: React.ReactNode; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

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
  const { t } = useTranslation()

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
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-headline">{t("recipes.noResults")}</p>
        <p className="text-sm mt-1">{t("recipes.noResultsHint")}</p>
      </div>
    )
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
