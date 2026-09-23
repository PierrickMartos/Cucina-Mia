import { describe, it, expect } from "vitest"
import { parseQuantity, scaleIngredient, servingOptions } from "@/lib/scaleIngredient"

describe("parseQuantity", () => {
  it.each([
    ["4", 4],
    ["1,5", 1.5],
    ["1.5", 1.5],
    ["1/2", 0.5],
    ["1 1/2", 1.5],
    ["½", 0.5],
    ["1½", 1.5],
    ["abc", null],
  ])("%s → %s", (raw, expected) => {
    expect(parseQuantity(raw)).toBe(expected)
  })
})

describe("scaleIngredient", () => {
  it("returns the line untouched at the original servings", () => {
    expect(scaleIngredient("1/2 à 1 c. à café de pâte de curry", 1)).toBe("1/2 à 1 c. à café de pâte de curry")
  })

  it("scales metric quantities with kitchen rounding", () => {
    expect(scaleIngredient("200 g de farine", 2)).toBe("400 g de farine")
    expect(scaleIngredient("680g de courge butternut", 0.5)).toBe("340g de courge butternut")
    expect(scaleIngredient("65 ml di salsa worcestershire", 1.5, "it")).toBe("98 ml di salsa worcestershire")
    expect(scaleIngredient("125 g sugar", 1.5, "en")).toBe("190 g sugar")
    expect(scaleIngredient("1,5 kg de pommes de terre", 0.5)).toBe("0,75 kg de pommes de terre")
    expect(scaleIngredient("1.5 kg potatoes", 0.5, "en")).toBe("0.75 kg potatoes")
  })

  it("scales counts and spoons to kitchen fractions", () => {
    expect(scaleIngredient("4 œufs", 0.5)).toBe("2 œufs")
    expect(scaleIngredient("1 œuf", 1.5)).toBe("1 ½ œuf")
    expect(scaleIngredient("1 c. à soupe de sucre", 0.25)).toBe("¼ c. à soupe de sucre")
    expect(scaleIngredient("1/2 pastèque", 1.5)).toBe("¾ pastèque")
    expect(scaleIngredient("1 1/2 tablespoons ground fennel", 0.5, "en")).toBe("¾ tablespoons ground fennel")
    expect(scaleIngredient("2 gousses d'ail", 1 / 3)).toBe("⅔ gousses d'ail")
    expect(scaleIngredient("12 biscuits", 1.5)).toBe("18 biscuits")
  })

  it("scales both ends of a range", () => {
    expect(scaleIngredient("6 à 8 feuilles de basilic", 1.5)).toBe("9 à 12 feuilles de basilic")
    expect(scaleIngredient("3-4 cucchiai di zucchero", 2, "it")).toBe("6-8 cucchiai di zucchero")
    expect(scaleIngredient("2 ou 3 tomates fraîches", 2)).toBe("4 ou 6 tomates fraîches")
    expect(scaleIngredient("da 1,5 a 2 l di brodo", 2, "it")).toBe("da 3 a 4 l di brodo")
  })

  it("scales weights and volumes given later in the line", () => {
    expect(scaleIngredient("½ ananas frais (170 g)", 2)).toBe("1 ananas frais (340 g)")
    expect(scaleIngredient("1 filet mignon de porc (environ 600 g)", 0.5)).toBe("½ filet mignon de porc (environ 300 g)")
    expect(scaleIngredient("About 200 g smoked provola", 2, "en")).toBe("About 400 g smoked provola")
    expect(scaleIngredient("200 g sugar + 125 g for the caramel", 2, "en")).toBe("400 g sugar + 250 g for the caramel")
    expect(scaleIngredient("Gnocchi di patate per 2 persone", 2, "it")).toBe("Gnocchi di patate per 4 persone")
  })

  it("leaves non-scalable numbers alone", () => {
    expect(scaleIngredient("4 eggs (1 per person)", 0.5, "en")).toBe("2 eggs (1 per person)")
    expect(scaleIngredient("4 gelatin sheets (2 g each)", 2, "en")).toBe("8 gelatin sheets (2 g each)")
    expect(scaleIngredient("550g de tomates, tranchées finement (environ 5mm)", 2)).toBe("1100g de tomates, tranchées finement (environ 5mm)")
    expect(scaleIngredient("250 g de farine (T55, T65 ou T80)", 2)).toBe("500 g de farine (T55, T65 ou T80)")
    expect(scaleIngredient("125 ml light cream (15% fat)", 2, "en")).toBe("250 ml light cream (15% fat)")
    expect(scaleIngredient("Pezzo di zenzero da 5 cm", 2, "it")).toBe("Pezzo di zenzero da 5 cm")
    expect(scaleIngredient("Sel et poivre", 2)).toBe("Sel et poivre")
    expect(scaleIngredient("Quelques feuilles de menthe", 2)).toBe("Quelques feuilles de menthe")
  })
})

describe("servingOptions", () => {
  it("offers 1 to 12, or up to twice the recipe servings", () => {
    expect(servingOptions(4)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(servingOptions(12)).toHaveLength(24)
  })
})
