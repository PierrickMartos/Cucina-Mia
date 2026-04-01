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
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filtri
        {activeCount > 0 && (
          <Badge className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
            {activeCount}
          </Badge>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent onClose={() => setOpen(false)}>
          <SheetHeader>
            <SheetTitle>Filtra ricette</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div>
              <h4 className="font-medium mb-3">Categoria</h4>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Badge
                    key={cat}
                    variant={
                      selectedCategories.includes(cat)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleCategory(cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Difficoltà</h4>
              <div className="flex flex-wrap gap-2">
                {difficulties.map((diff) => (
                  <Badge
                    key={diff}
                    variant={
                      selectedDifficulties.includes(diff)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
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
                className="w-full"
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
