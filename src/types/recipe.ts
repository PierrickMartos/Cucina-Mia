export interface RecipeSummary {
  slug: string
  title: string
  description: string
  image: string
  prepTime: number
  cookTime: number
  servings: number
  difficulty: "Facile" | "Medio" | "Difficile"
  category: string
  tags: string[]
}

export interface RecipeDetail extends RecipeSummary {
  ingredients: {
    group?: string
    items: string[]
  }[]
  steps: {
    text: string
    image?: string
  }[]
  tips?: string[]
  source?: string
}
