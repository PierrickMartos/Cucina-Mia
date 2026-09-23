import { renderSharePage, sharePath, truncate, type ShareMeta } from "../../scripts/share-page.ts"

const meta: ShareMeta = {
  lang: "fr",
  url: "https://example.github.io/Cucina-Mia/r/pasta-carbonara/",
  redirectTo: "/Cucina-Mia/#/recipe/pasta-carbonara",
  title: "Pasta alla \"Carbonara\" <vraie>",
  description: "La vraie carbonara romaine avec guanciale & pecorino.",
  image: "https://example.github.io/Cucina-Mia/r/pasta-carbonara/og.jpg",
  imageAlt: "Pasta alla Carbonara",
  type: "article",
}

function parse(html: string) {
  return new DOMParser().parseFromString(html, "text/html")
}

function metaContent(doc: Document, key: string) {
  return doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute("content")
}

describe("share page", () => {
  it("carries the Open Graph and Twitter tags used by messaging apps", () => {
    const doc = parse(renderSharePage(meta))
    expect(metaContent(doc, "og:title")).toBe(meta.title)
    expect(metaContent(doc, "og:description")).toBe(meta.description)
    expect(metaContent(doc, "og:url")).toBe(meta.url)
    expect(metaContent(doc, "og:image")).toBe(meta.image)
    expect(metaContent(doc, "og:image:type")).toBe("image/jpeg")
    expect(metaContent(doc, "og:image:width")).toBe("1200")
    expect(metaContent(doc, "og:image:height")).toBe("630")
    expect(metaContent(doc, "og:type")).toBe("article")
    expect(metaContent(doc, "og:site_name")).toBe("Cucina Mia")
    expect(metaContent(doc, "twitter:card")).toBe("summary_large_image")
    expect(metaContent(doc, "description")).toBe(meta.description)
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(meta.url)
  })

  it("escapes recipe text", () => {
    const html = renderSharePage(meta)
    expect(html).not.toContain("<vraie>")
    expect(parse(html).title).toBe(`${meta.title} · Cucina Mia`)
  })

  it("sends people to the recipe with a JS redirect only", () => {
    const doc = parse(renderSharePage(meta))
    expect(doc.querySelector('meta[http-equiv="refresh"]')).toBeNull()
    expect(doc.querySelector("script")?.textContent).toContain(`location.replace("${meta.redirectTo}")`)
    expect(doc.querySelector("a")?.getAttribute("href")).toBe(meta.redirectTo)
  })

  it("has one URL per language, French at the root", () => {
    expect(sharePath("canneles")).toBe("r/canneles/")
    expect(sharePath("canneles", "fr")).toBe("r/canneles/")
    expect(sharePath("canneles", "en")).toBe("r/canneles/en/")
    expect(sharePath("canneles", "it")).toBe("r/canneles/it/")
  })

  it("declares its language and links the other ones", () => {
    const doc = parse(renderSharePage({
      ...meta,
      lang: "en",
      alternates: {
        fr: "https://example.github.io/Cucina-Mia/r/pasta-carbonara/",
        en: "https://example.github.io/Cucina-Mia/r/pasta-carbonara/en/",
        it: "https://example.github.io/Cucina-Mia/r/pasta-carbonara/it/",
      },
    }))
    expect(doc.documentElement.lang).toBe("en")
    expect(metaContent(doc, "og:locale")).toBe("en_US")
    expect([...doc.querySelectorAll('meta[property="og:locale:alternate"]')].map(m => m.getAttribute("content")))
      .toEqual(["fr_FR", "it_IT"])
    expect(doc.querySelector('link[hreflang="it"]')?.getAttribute("href")).toContain("/it/")
    expect(doc.querySelector('link[hreflang="x-default"]')?.getAttribute("href")).toMatch(/pasta-carbonara\/$/)
  })

  describe("redirect", () => {
    beforeEach(() => localStorage.clear())

    function runRedirect(lang: ShareMeta["lang"]) {
      const script = parse(renderSharePage({ ...meta, lang })).querySelector("script")!.textContent!
      const replace = vi.fn()
      new Function("location", script)({ replace })
      return replace
    }

    it("opens the app in the shared language for first-time visitors", () => {
      const replace = runRedirect("it")
      expect(localStorage.getItem("cucina-mia-lang")).toBe("it")
      expect(replace).toHaveBeenCalledWith(meta.redirectTo)
    })

    it("keeps the language a visitor already has", () => {
      localStorage.setItem("cucina-mia-lang", "en")
      runRedirect("it")
      expect(localStorage.getItem("cucina-mia-lang")).toBe("en")
    })
  })

  it("keeps descriptions short enough for previews", () => {
    const long = "mot ".repeat(100)
    const cut = truncate(long)
    expect(cut.length).toBeLessThanOrEqual(200)
    expect(cut.endsWith("…")).toBe(true)
    expect(truncate("  court  ")).toBe("court")
  })
})
