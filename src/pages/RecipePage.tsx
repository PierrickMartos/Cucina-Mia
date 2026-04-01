import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, Clock, Users, ChefHat } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { RecipeDetail } from "@/types/recipe"

const BASE = import.meta.env.BASE_URL

export function RecipePage() {
  const { slug } = useParams<{ slug: string }>()
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="aspect-video w-full rounded-xl mb-6" />
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-8" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-lg text-muted-foreground mb-4">
          Ricetta non trovata
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          Torna alle ricette
        </Link>
      </div>
    )
  }

  const totalTime = recipe.prepTime + recipe.cookTime

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <Link
        to="/"
        className="mb-4 -ml-2 inline-flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Tutte le ricette
      </Link>

      <div className="aspect-video overflow-hidden rounded-xl mb-6">
        <img
          src={`${BASE}${recipe.image}`}
          alt={recipe.title}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant="secondary">{recipe.category}</Badge>
          <Badge variant="outline">{recipe.difficulty}</Badge>
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{recipe.title}</h1>
        <p className="text-muted-foreground">{recipe.description}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 rounded-xl bg-muted/50 p-4 mb-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <Clock className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">{totalTime} min</span>
          <span className="text-xs text-muted-foreground">Tempo totale</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <Users className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">{recipe.servings}</span>
          <span className="text-xs text-muted-foreground">Porzioni</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <ChefHat className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">{recipe.difficulty}</span>
          <span className="text-xs text-muted-foreground">Difficoltà</span>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Ingredienti</h2>
        {recipe.ingredients.map((group, gi) => (
          <div key={gi} className="mb-4">
            {group.group && (
              <h3 className="font-medium text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                {group.group}
              </h3>
            )}
            <ul className="space-y-2">
              {group.items.map((item, ii) => (
                <li
                  key={ii}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Preparazione</h2>
        <ol className="space-y-4">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                {i + 1}
              </span>
              <div className="pt-0.5">
                <p className="text-sm leading-relaxed">{step.text}</p>
                {step.image && (
                  <img
                    src={`${BASE}${step.image}`}
                    alt={`Passo ${i + 1}`}
                    className="mt-3 rounded-lg max-w-full"
                    loading="lazy"
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {recipe.tips && recipe.tips.length > 0 && (
        <section className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-5">
          <h2 className="text-lg font-semibold mb-3">Consigli</h2>
          <ul className="space-y-2">
            {recipe.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary">💡</span>
                {tip}
              </li>
            ))}
          </ul>
        </section>
      )}

      {recipe.source && (
        <p className="text-xs text-muted-foreground">
          Fonte: {recipe.source}
        </p>
      )}
    </div>
  )
}
