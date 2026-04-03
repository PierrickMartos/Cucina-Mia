// @vitest-environment node
import { readFileSync, readdirSync } from "fs"
import { resolve } from "path"
import { describe, it, expect } from "vitest"
import { RecipeDetailSchema, RecipeIndexSchema } from "@/lib/recipeSchema"

const DATA_DIR = resolve(__dirname, "../../public/data/recipes")

describe("recipe index", () => {
  it("index.json is valid", () => {
    const raw = readFileSync(resolve(DATA_DIR, "index.json"), "utf-8")
    const data = JSON.parse(raw)
    const result = RecipeIndexSchema.safeParse(data)
    if (!result.success) {
      throw new Error(
        `index.json validation failed:\n${result.error.issues
          .map((i) => `  [${i.path.join(".")}] ${i.message}`)
          .join("\n")}`
      )
    }
    expect(result.success).toBe(true)
  })
})

describe("recipe detail files", () => {
  const slugs: string[] = readdirSync(DATA_DIR)
    .filter((f: string) => f.endsWith(".json") && f !== "index.json")
    .map((f: string) => f.replace(".json", ""))

  it.each(slugs)("%s.json is valid", (...args: unknown[]) => {
    const slug = args[0] as string
    const raw = readFileSync(resolve(DATA_DIR, `${slug}.json`), "utf-8")
    const data = JSON.parse(raw)
    const result = RecipeDetailSchema.safeParse(data)
    if (!result.success) {
      throw new Error(
        `${slug}.json validation failed:\n${result.error.issues
          .map((i) => `  [${i.path.join(".")}] ${i.message}`)
          .join("\n")}`
      )
    }
    expect(result.success).toBe(true)
  })
})
