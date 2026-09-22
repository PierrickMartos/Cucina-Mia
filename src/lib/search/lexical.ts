import { editDistance, normalize, stem, tokenize } from "./text"

export type SearchField = "title" | "tags" | "category" | "ingredients" | "description"

export interface SearchDocument {
  slug: string
  fields: Partial<Record<SearchField, string[]>>
}

export interface LexicalHit {
  slug: string
  score: number
  /** Number of query terms this document matched. */
  matched: number
  /** Every query term matched exactly (not only through a prefix or a typo). */
  exact: boolean
}

export interface LexicalResult {
  hits: LexicalHit[]
  /** Number of meaningful terms in the query (0 means "no filtering"). */
  termCount: number
}

const FIELD_WEIGHTS: Record<SearchField, number> = {
  title: 3,
  tags: 2,
  category: 2,
  ingredients: 1.5,
  description: 1,
}

// Query-side expansions for words that the recipe translations do not already cover.
const SYNONYM_WORDS: Record<string, string[]> = {
  veggie: ["vegetarien"],
  vege: ["vegetarien"],
  veg: ["vegetarien"],
  vegan: ["vegetalien"],
  vegane: ["vegetalien"],
  express: ["rapide"],
  vite: ["rapide"],
  aperitif: ["apero"],
  aperitivo: ["apero"],
  gateau: ["dessert"],
  cake: ["dessert"],
  sucre: ["dessert"],
}

const SYNONYMS = new Map(
  Object.entries(SYNONYM_WORDS).map(([word, targets]) => [stem(word), targets.map(stem)] as const)
)

const PREFIX_FACTOR = 0.75
const FUZZY_FACTOR = [1, 0.6, 0.4]

interface Match {
  termIndex: number
  factor: number
}

export class LexicalIndex {
  private slugs: string[] = []
  private terms: string[] = []
  private termIds = new Map<string, number>()
  /** termId -> (docIndex -> accumulated field weight) */
  private postings: Map<number, number>[] = []

  constructor(documents: SearchDocument[]) {
    documents.forEach((doc, docIndex) => {
      this.slugs.push(doc.slug)
      const weights = new Map<string, number>()
      for (const field of Object.keys(FIELD_WEIGHTS) as SearchField[]) {
        const tokens = new Set((doc.fields[field] ?? []).flatMap(tokenize))
        for (const token of tokens) weights.set(token, (weights.get(token) ?? 0) + FIELD_WEIGHTS[field])
      }
      for (const [token, weight] of weights) {
        let id = this.termIds.get(token)
        if (id === undefined) {
          id = this.terms.length
          this.terms.push(token)
          this.termIds.set(token, id)
          this.postings.push(new Map())
        }
        this.postings[id].set(docIndex, weight)
      }
    })
  }

  search(query: string): LexicalResult {
    const words = normalize(query).split(" ").filter(Boolean)
    const slots = [...new Set(tokenize(query))]
    if (slots.length === 0) return { hits: [], termCount: 0 }

    // The last word is probably still being typed: match it as a prefix, before stemming
    // ("pastè" must find "pastèque", not "pasta").
    const typedWord = /\s$/.test(query) ? null : words[words.length - 1] ?? null
    const typedSlot = typedWord ? stem(typedWord) : null

    const docScores = new Map<number, { score: number; matched: number; exact: number }>()
    const n = this.slugs.length

    for (const slot of slots) {
      const matches = (slot === typedSlot && this.matchTyped(typedWord!)) || this.matchTerm(slot, slot === typedSlot)
      const perDoc = new Map<number, { score: number; exact: boolean }>()
      for (const { termIndex, factor } of matches) {
        const posting = this.postings[termIndex]
        const idf = Math.log(1 + n / posting.size)
        for (const [docIndex, weight] of posting) {
          const score = factor * idf * weight
          const current = perDoc.get(docIndex) ?? { score: 0, exact: false }
          current.score = Math.max(current.score, score)
          current.exact ||= factor === 1
          perDoc.set(docIndex, current)
        }
      }
      for (const [docIndex, { score, exact }] of perDoc) {
        const entry = docScores.get(docIndex) ?? { score: 0, matched: 0, exact: 0 }
        entry.score += score
        entry.matched += 1
        if (exact) entry.exact += 1
        docScores.set(docIndex, entry)
      }
    }

    // AND semantics over the query terms that exist in the corpus: "poulet curry" only keeps recipes with both,
    // while a word that matches nothing at all ("recette végétarienne") does not empty the result list.
    let best = 0
    for (const { matched } of docScores.values()) best = Math.max(best, matched)

    const hits: LexicalHit[] = []
    for (const [docIndex, { score, matched, exact }] of docScores) {
      if (matched < best) continue
      hits.push({ slug: this.slugs[docIndex], score, matched, exact: exact === slots.length })
    }
    hits.sort((a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score || a.slug.localeCompare(b.slug))
    return { hits, termCount: slots.length }
  }

  private matchTyped(word: string): Match[] | null {
    if (word === stem(word)) return null
    const matches: Match[] = []
    this.terms.forEach((term, termIndex) => {
      if (term.startsWith(word)) matches.push({ termIndex, factor: term === word ? 1 : PREFIX_FACTOR })
    })
    return matches.length > 0 ? matches : null
  }

  private matchTerm(slot: string, isTyping: boolean): Match[] {
    const candidates = [slot, ...(SYNONYMS.get(slot) ?? [])]
    const exact = candidates.flatMap((candidate) => this.termIds.get(candidate) ?? [])
    const matches: Match[] = exact.map((termIndex) => ({ termIndex, factor: 1 }))

    // A word that exists as such is not expanded by prefix ("pasta" should not match "pastèque"),
    // and only long words still tolerate a typo.
    const hasExact = exact.length > 0
    const allowPrefix = !hasExact && (isTyping || slot.length >= 3)
    const maxTypos = hasExact ? (slot.length >= 7 ? 1 : 0) : slot.length >= 8 ? 2 : slot.length >= 5 ? 1 : 0
    this.terms.forEach((term, termIndex) => {
      if (exact.includes(termIndex)) return
      if (allowPrefix && term.startsWith(slot)) {
        matches.push({ termIndex, factor: PREFIX_FACTOR })
      } else if (maxTypos > 0) {
        const distance = editDistance(slot, term, maxTypos)
        if (distance <= maxTypos) matches.push({ termIndex, factor: FUZZY_FACTOR[distance] })
      }
    })
    return matches
  }
}
