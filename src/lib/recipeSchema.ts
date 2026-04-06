import { z } from "zod"

const ImageCreditSchema = z.object({
  author: z.string().optional(),
  url: z.string().optional(),
})

const RecipeImagesSchema = z.object({
  cover: z.string().min(1),
  web: z.string().min(1),
})

const IngredientGroupSchema = z.object({
  group: z.string().optional(),
  items: z.array(z.string().min(1)).min(1),
})

const StepSchema = z.object({
  text: z.string().min(1),
  image: z.string().optional(),
})

const TranslationSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  ingredients: z.array(IngredientGroupSchema).optional(),
  steps: z.array(StepSchema).optional(),
  tips: z.array(z.string()).optional(),
  history: z.string().optional(),
})

export const RecipeSummarySchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  title: z.string().min(1),
  description: z.string().min(1),
  images: RecipeImagesSchema,
  imageCredit: ImageCreditSchema.optional(),
  prepTime: z.number().int().nonnegative(),
  cookTime: z.number().int().nonnegative(),
  servings: z.number().int().positive(),
  difficulty: z.enum(["Facile", "Medio", "Difficile"]),
  category: z.string().min(1),
  tags: z.array(z.string()).min(1),
  stepCount: z.number().int().nonnegative().optional(),
  ingredientCount: z.number().int().nonnegative().optional(),
  translations: z
    .record(
      z.string(),
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .optional(),
})

const RecipeOriginalSourceSchema = z.object({
  type: z.enum(["pdf", "image", "text", "url"]),
  data: z.string().min(1),
})

export const RecipeDetailSchema = RecipeSummarySchema.extend({
  ingredients: z.array(IngredientGroupSchema).min(1),
  steps: z.array(StepSchema).min(1),
  tips: z.array(z.string()).optional(),
  history: z.string().optional(),
  source: z.string().optional(),
  originalSource: RecipeOriginalSourceSchema.optional(),
  translations: z.record(z.string(), TranslationSchema).optional(),
})

export const RecipeIndexSchema = z.array(RecipeSummarySchema)
