import { renderSharePage, truncate, type ShareMeta } from "../../scripts/share-page.ts"

const meta: ShareMeta = {
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

  it("keeps descriptions short enough for previews", () => {
    const long = "mot ".repeat(100)
    const cut = truncate(long)
    expect(cut.length).toBeLessThanOrEqual(200)
    expect(cut.endsWith("…")).toBe(true)
    expect(truncate("  court  ")).toBe("court")
  })
})
