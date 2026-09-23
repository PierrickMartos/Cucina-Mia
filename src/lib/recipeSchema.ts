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

// Timers (minutes) are only set on base steps, translated steps reuse them by position.
const BaseStepSchema = StepSchema.extend({
  timers: z.array(z.number().positive().max(48 * 60)).min(1).optional(),
})

const SlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")

const TranslationSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  ingredients: z.array(IngredientGroupSchema).optional(),
  steps: z.array(StepSchema.strict()).optional(),
  tips: z.array(z.string()).optional(),
  history: z.string().optional(),
})

const RecipeOriginSchema = z.enum(["none", "pierrick", "amelie", "pierrick-grandma", "amelie-grandpa"])

export const RecipeSummarySchema = z.object({
  slug: SlugSchema,
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
  origin: RecipeOriginSchema.optional(),
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
  steps: z.array(BaseStepSchema).min(1),
  tips: z.array(z.string()).optional(),
  history: z.string().optional(),
  source: z.string().optional(),
  originalSource: RecipeOriginalSourceSchema.optional(),
  related: z.array(SlugSchema).min(3).max(4).optional(),
  translations: z.record(z.string(), TranslationSchema).optional(),
})

export const RecipeIndexSchema = z.array(RecipeSummarySchema)
