import { SlidersHorizontal } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface FilterDrawerProps {
  categories: string[]
  difficulties: string[]
  selectedCategories: string[]
  selectedDifficulties: string[]
  onCategoriesChange: (categories: string[]) => void
  onDifficultiesChange: (difficulties: string[]) => void
}

export function FilterDrawer({
  categories,
  difficulties,
  selectedCategories,
  selectedDifficulties,
  onCategoriesChange,
  onDifficultiesChange,
}: FilterDrawerProps) {
  const [open, setOpen] = useState(false)

  const activeCount = selectedCategories.length + selectedDifficulties.length

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

  function clearAll() {
    onCategoriesChange([])
    onDifficultiesChange([])
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center bg-primary text-primary-foreground w-10 h-10 rounded-full hover:bg-primary-container transition-colors active:scale-95 duration-300 shrink-0 relative"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground h-4 w-4 rounded-full text-[10px] flex items-center justify-center font-bold">
            {activeCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent onClose={() => setOpen(false)} className="bg-surface">
          <SheetHeader>
            <SheetTitle className="font-headline text-lg font-bold text-foreground">
              Filtra ricette
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div>
              <h4 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                Categoria
              </h4>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Badge
                    key={cat}
                    variant={selectedCategories.includes(cat) ? "default" : "outline"}
                    className={
                      selectedCategories.includes(cat)
                        ? "cursor-pointer bg-primary text-primary-foreground"
                        : "cursor-pointer border-border text-muted-foreground hover:bg-surface-high"
                    }
                    onClick={() => toggleCategory(cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                Difficoltà
              </h4>
              <div className="flex flex-wrap gap-2">
                {difficulties.map((diff) => (
                  <Badge
                    key={diff}
                    variant={selectedDifficulties.includes(diff) ? "default" : "outline"}
                    className={
                      selectedDifficulties.includes(diff)
                        ? "cursor-pointer bg-primary text-primary-foreground"
                        : "cursor-pointer border-border text-muted-foreground hover:bg-surface-high"
                    }
                    onClick={() => toggleDifficulty(diff)}
                  >
                    {diff}
                  </Badge>
                ))}
              </div>
            </div>

            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Rimuovi tutti i filtri
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
