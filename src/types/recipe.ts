export interface RecipeTranslation {
  title?: string
  description?: string
  tags?: string[]
  ingredients?: { group?: string; items: string[] }[]
  steps?: { text: string; image?: string }[]
  tips?: string[]
}

export interface ImageCredit {
  author?: string
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
  stepCount?: number
  ingredientCount?: number
  translations?: { [lang: string]: Pick<RecipeTranslation, "title" | "description" | "tags"> }
}

export interface RecipeOriginalSource {
  type: "pdf" | "image" | "text"
  data: string
}

export interface RecipeDetail extends RecipeSummary {
  ingredients: { group?: string; items: string[] }[]
  steps: { text: string; image?: string }[]
  tips?: string[]
  source?: string
  originalSource?: RecipeOriginalSource
  translations?: { [lang: string]: RecipeTranslation }
}
