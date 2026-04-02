export const CATEGORY_ORDER = [
  "Antipasti",
  "Secondi",
  "Pizze",
  "Pane",
  "Dolci",
  "Bambini",
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
