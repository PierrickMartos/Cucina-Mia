export const DIFFICULTY_ORDER = ["Facile", "Medio", "Difficile"]

export function sortDifficulties(difficulties: string[]): string[] {
  return [...difficulties].sort((a, b) => {
    const ai = DIFFICULTY_ORDER.indexOf(a)
    const bi = DIFFICULTY_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export const CATEGORY_ORDER = [
  "Antipasti",
  "Pasta",
  "Gnocchi",
  "Risotto",
  "Insalate",
  "Secondi",
  "Pizze",
  "Pane",
  "Dolci",
  "Bambini",
  "Breakfast",
  "Brunch",
]

export function sortCategories(categories: string[]): string[] {
  return [...categories].sort(
    (a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a)
      const bi = CATEGORY_ORDER.indexOf(b)
      if (ai === -1 && bi === -1) return a.localeCompare(b)
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    }
  )
}
