import { SlidersHorizontal } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

const TIME_BUCKETS = ["quick", "medium", "long"] as const
export type TimeBucket = (typeof TIME_BUCKETS)[number]

const STEPS_BUCKETS = ["simple", "medium", "complex"] as const
export type StepsBucket = (typeof STEPS_BUCKETS)[number]

const INGREDIENTS_BUCKETS = ["few", "moderate", "many"] as const
export type IngredientsBucket = (typeof INGREDIENTS_BUCKETS)[number]

export const DIET_TAGS = ["végétarien", "végétalien", "vegan", "sans-gluten", "sans-lactose", "léger"] as const
export const SEASON_TAGS = ["printemps", "été", "automne", "hiver", "noël", "pâques", "apéro", "fête"] as const

interface FilterDrawerProps {
  categories: string[]
  difficulties: string[]
  selectedCategories: string[]
  selectedDifficulties: string[]
  selectedTimes: TimeBucket[]
  selectedSteps: StepsBucket[]
  selectedIngredients: IngredientsBucket[]
  selectedDietTags: string[]
  selectedSeasonTags: string[]
  onCategoriesChange: (categories: string[]) => void
  onDifficultiesChange: (difficulties: string[]) => void
  onTimesChange: (times: TimeBucket[]) => void
  onStepsChange: (steps: StepsBucket[]) => void
  onIngredientsChange: (ingredients: IngredientsBucket[]) => void
  onDietTagsChange: (tags: string[]) => void
  onSeasonTagsChange: (tags: string[]) => void
}

export function FilterDrawer({
  categories,
  difficulties,
  selectedCategories,
  selectedDifficulties,
  selectedTimes,
  selectedSteps,
  selectedIngredients,
  selectedDietTags,
  selectedSeasonTags,
  onCategoriesChange,
  onDifficultiesChange,
  onTimesChange,
  onStepsChange,
  onIngredientsChange,
  onDietTagsChange,
  onSeasonTagsChange,
}: FilterDrawerProps) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()

  const activeCount =
    selectedCategories.length +
    selectedDifficulties.length +
    selectedTimes.length +
    selectedSteps.length +
    selectedIngredients.length +
    selectedDietTags.length +
    selectedSeasonTags.length

  function toggleCategory(cat: string) {
    if (selectedCategories.includes(cat)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== cat))
    } else {
      onCategoriesChange([...selectedCategories, cat])
    }
  }

  function toggleDifficulty(diff: string) {
    if (selectedDifficulties.includes(diff)) {
      onDifficultiesChange(selectedDifficulties.filter((d) => d !== diff))
    } else {
      onDifficultiesChange([...selectedDifficulties, diff])
    }
  }

  function toggleTime(bucket: TimeBucket) {
    if (selectedTimes.includes(bucket)) {
      onTimesChange(selectedTimes.filter((t) => t !== bucket))
    } else {
      onTimesChange([...selectedTimes, bucket])
    }
  }

  function toggleSteps(bucket: StepsBucket) {
    if (selectedSteps.includes(bucket)) {
      onStepsChange(selectedSteps.filter((s) => s !== bucket))
    } else {
      onStepsChange([...selectedSteps, bucket])
    }
  }

  function toggleIngredients(bucket: IngredientsBucket) {
    if (selectedIngredients.includes(bucket)) {
      onIngredientsChange(selectedIngredients.filter((i) => i !== bucket))
    } else {
      onIngredientsChange([...selectedIngredients, bucket])
    }
  }

  function toggleDietTag(tag: string) {
    if (selectedDietTags.includes(tag)) {
      onDietTagsChange(selectedDietTags.filter((t) => t !== tag))
    } else {
      onDietTagsChange([...selectedDietTags, tag])
    }
  }

  function toggleSeasonTag(tag: string) {
    if (selectedSeasonTags.includes(tag)) {
      onSeasonTagsChange(selectedSeasonTags.filter((t) => t !== tag))
    } else {
      onSeasonTagsChange([...selectedSeasonTags, tag])
    }
  }

  function clearAll() {
    onCategoriesChange([])
    onDifficultiesChange([])
    onTimesChange([])
    onStepsChange([])
    onIngredientsChange([])
    onDietTagsChange([])
    onSeasonTagsChange([])
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="cursor-pointer flex items-center justify-center gradient-primary text-primary-foreground w-10 h-10 rounded-full hover:opacity-90 transition-all active:scale-95 duration-300 shrink-0 relative"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-lemon-zest text-foreground h-4 w-4 rounded-full text-[10px] flex items-center justify-center font-bold">
            {activeCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent onClose={() => setOpen(false)} className="bg-surface">
          <SheetHeader>
            <SheetTitle className="font-headline text-lg font-bold text-foreground">
              {t("filter.title")}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div>
              <h4 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                {t("filter.category")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Badge
                    key={cat}
                    variant={selectedCategories.includes(cat) ? "default" : "outline"}
                    className={
                      selectedCategories.includes(cat)
                        ? "cursor-pointer gradient-primary text-primary-foreground"
                        : "cursor-pointer text-muted-foreground hover:bg-surface-high"
                    }
                    onClick={() => toggleCategory(cat)}
                  >
                    {t(`categories.${cat}`, cat)}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                {t("filter.difficulty")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {difficulties.map((diff) => (
                  <Badge
                    key={diff}
                    variant={selectedDifficulties.includes(diff) ? "default" : "outline"}
                    className={
                      selectedDifficulties.includes(diff)
                        ? "cursor-pointer gradient-primary text-primary-foreground"
                        : "cursor-pointer text-muted-foreground hover:bg-surface-high"
                    }
                    onClick={() => toggleDifficulty(diff)}
                  >
                    {t(`difficulties.${diff}`, diff)}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                {t("filter.time")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {TIME_BUCKETS.map((bucket) => (
                  <Badge
                    key={bucket}
                    variant={selectedTimes.includes(bucket) ? "default" : "outline"}
                    className={
                      selectedTimes.includes(bucket)
                        ? "cursor-pointer gradient-primary text-primary-foreground"
                        : "cursor-pointer text-muted-foreground hover:bg-surface-high"
                    }
                    onClick={() => toggleTime(bucket)}
                  >
                    {t(`timeOptions.${bucket}`)}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                {t("filter.steps")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {STEPS_BUCKETS.map((bucket) => (
                  <Badge
                    key={bucket}
                    variant={selectedSteps.includes(bucket) ? "default" : "outline"}
                    className={
                      selectedSteps.includes(bucket)
                        ? "cursor-pointer gradient-primary text-primary-foreground"
                        : "cursor-pointer text-muted-foreground hover:bg-surface-high"
                    }
                    onClick={() => toggleSteps(bucket)}
                  >
                    {t(`stepsOptions.${bucket}`)}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                {t("filter.ingredients")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {INGREDIENTS_BUCKETS.map((bucket) => (
                  <Badge
                    key={bucket}
                    variant={selectedIngredients.includes(bucket) ? "default" : "outline"}
                    className={
                      selectedIngredients.includes(bucket)
                        ? "cursor-pointer gradient-primary text-primary-foreground"
                        : "cursor-pointer text-muted-foreground hover:bg-surface-high"
                    }
                    onClick={() => toggleIngredients(bucket)}
                  >
                    {t(`ingredientsOptions.${bucket}`)}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                {t("filter.diet")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {DIET_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedDietTags.includes(tag) ? "default" : "outline"}
                    className={
                      selectedDietTags.includes(tag)
                        ? "cursor-pointer gradient-primary text-primary-foreground"
                        : "cursor-pointer text-muted-foreground hover:bg-surface-high"
                    }
                    onClick={() => toggleDietTag(tag)}
                  >
                    {t(`tags.${tag}`, tag)}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                {t("filter.season")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {SEASON_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedSeasonTags.includes(tag) ? "default" : "outline"}
                    className={
                      selectedSeasonTags.includes(tag)
                        ? "cursor-pointer gradient-primary text-primary-foreground"
                        : "cursor-pointer text-muted-foreground hover:bg-surface-high"
                    }
                    onClick={() => toggleSeasonTag(tag)}
                  >
                    {t(`tags.${tag}`, tag)}
                  </Badge>
                ))}
              </div>
            </div>

            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="cursor-pointer w-full text-muted-foreground hover:text-foreground"
              >
                {t("filter.clearAll")}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
