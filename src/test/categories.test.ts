import { describe, it, expect } from "vitest"
import { CATEGORY_ORDER } from "@/lib/categories"
import fr from "@/i18n/locales/fr.json"
import en from "@/i18n/locales/en.json"
import it_ from "@/i18n/locales/it.json"

describe("categories", () => {
  it.each([["fr", fr], ["en", en], ["it", it_]] as const)("has a %s label for every ordered category", (_, locale) => {
    const labels = locale.categories as Record<string, string>
    expect(CATEGORY_ORDER.filter((category) => !labels[category])).toEqual([])
  })

  it("orders the categories of the Papi d'Amélie recipes", () => {
    expect(CATEGORY_ORDER).toEqual(expect.arrayContaining(["Zuppe", "Contorni", "Gelati", "Conserve"]))
  })
})
