import { describe, it, expect, vi } from "vitest"
import { loadRecipe, loadRecipeIndex } from "@/lib/recipeData"

describe("recipe data cache", () => {
  it("fetches the recipe index only once", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [] }) as unknown as Response)
    globalThis.fetch = fetchMock
    await loadRecipeIndex()
    await loadRecipeIndex()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("refetches the index after a failed request", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
    globalThis.fetch = fetchMock
    await expect(loadRecipeIndex()).rejects.toThrow("offline")
    await expect(loadRecipeIndex()).resolves.toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("caches each recipe detail, including missing recipes", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      (url.endsWith("missing.json")
        ? { ok: false }
        : { ok: true, json: async () => ({ slug: "carbonara" }) }) as unknown as Response
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch
    expect(await loadRecipe("carbonara")).toEqual({ slug: "carbonara" })
    expect(await loadRecipe("carbonara")).toEqual({ slug: "carbonara" })
    expect(await loadRecipe("missing")).toBeNull()
    expect(await loadRecipe("missing")).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
