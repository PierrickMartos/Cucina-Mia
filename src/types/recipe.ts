export interface RecipeTranslation {
  description?: string
  ingredients?: { group?: string; items: string[] }[]
  steps?: { text: string; image?: string }[]
  tips?: string[]
}

export interface ImageCredit {
  name?: string
  url?: string
}

export interface RecipeImages {
  cover: string
  web: string
}

export interface RecipeSummary {
  slug: string
  title: string
  description: string
  images: RecipeImages
  imageCredit?: ImageCredit
  prepTime: number
  cookTime: number
  servings: number
  difficulty: "Facile" | "Medio" | "Difficile"
  category: string
  tags: string[]
  translations?: { [lang: string]: Pick<RecipeTranslation, "description"> }
}

export interface RecipeDetail extends RecipeSummary {
  ingredients: { group?: string; items: string[] }[]
  steps: { text: string; image?: string }[]
  tips?: string[]
  source?: string
  translations?: { [lang: string]: RecipeTranslation }
}
