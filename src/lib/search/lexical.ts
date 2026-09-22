import { editDistance, normalize, stem, tokenize } from "./text"
import type { ParsedQuery, QueryTerm } from "./query"

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
  /** Recipes removed by a negation ("sans porc"). */
  excluded: Set<string>
  /** Recipes matching at least one required term: where the semantic layer may add results. */
  related: Set<string>
}

const FIELD_WEIGHTS: Record<SearchField, number> = {
  title: 3,
  tags: 2,
  category: 2,
  ingredients: 1.5,
  description: 1,
}

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
  /** termId -> docs having the term outside the description (used for exclusions) */
  private strong: Set<number>[] = []

  /** stem -> stems meaning the same thing in another language (see buildTagAliases) */
  private aliases: Map<string, string[]>

  constructor(documents: SearchDocument[], aliases: Map<string, string[]> = new Map()) {
    this.aliases = aliases
    documents.forEach((doc, docIndex) => {
      this.slugs.push(doc.slug)
      const weights = new Map<string, number>()
      const strong = new Set<string>()
      for (const field of Object.keys(FIELD_WEIGHTS) as SearchField[]) {
        const texts = doc.fields[field] ?? []
        const tokens = new Set(texts.flatMap(tokenize))
        // Compound tags are also indexed as one word, so "sans sucre" means the sans-sucre tag and not
        // "any sans-xxx tag + sugar in the ingredients".
        if (field === "tags") texts.forEach((tag) => tokens.add(stem(normalize(tag).replace(/ /g, ""))))
        for (const token of tokens) {
          weights.set(token, (weights.get(token) ?? 0) + FIELD_WEIGHTS[field])
          if (field !== "description") strong.add(token)
        }
      }
      for (const [token, weight] of weights) {
        let id = this.termIds.get(token)
        if (id === undefined) {
          id = this.terms.length
          this.terms.push(token)
          this.termIds.set(token, id)
          this.postings.push(new Map())
          this.strong.push(new Set())
        }
        this.postings[id].set(docIndex, weight)
        if (strong.has(token)) this.strong[id].add(docIndex)
      }
    })
  }

  search(query: ParsedQuery): LexicalResult {
    const excluded = new Set<string>()
    for (const term of query.exclude) {
      for (const candidate of term.stems) {
        const id = this.termIds.get(candidate)
        if (id !== undefined) this.strong[id].forEach((docIndex) => excluded.add(this.slugs[docIndex]))
      }
    }
    if (query.terms.length === 0) return { hits: [], termCount: 0, excluded, related: new Set() }

    const docScores = new Map<number, { score: number; matched: number; exact: number }>()
    const n = this.slugs.length
    let requiredCount = 0

    for (const term of query.terms) {
      const { matches, confident } = this.matchQueryTerm(term)
      // Only words that characterise a recipe (title, tags, category, ingredients) are required. A word only
      // reached through a typo, or only found in descriptions ("dinner", "soirée"), just boosts the ranking:
      // it must not restrict "quick vegetarian dinner" to the one recipe whose description says "dinner".
      const characteristic = matches.some((m) => this.strong[m.termIndex].size > 0)
      const required = query.terms.length === 1 || (confident && characteristic)
      if (required && matches.length > 0) requiredCount++
      const perDoc = new Map<number, { score: number; exact: boolean; strong: boolean }>()
      for (const { termIndex, factor } of matches) {
        const posting = this.postings[termIndex]
        const idf = Math.log(1 + n / posting.size)
        for (const [docIndex, weight] of posting) {
          const score = factor * idf * weight
          const current = perDoc.get(docIndex) ?? { score: 0, exact: false, strong: false }
          current.score = Math.max(current.score, score)
          current.exact ||= factor === 1
          current.strong ||= this.strong[termIndex].has(docIndex)
          perDoc.set(docIndex, current)
        }
      }
      for (const [docIndex, { score, exact, strong }] of perDoc) {
        const entry = docScores.get(docIndex) ?? { score: 0, matched: 0, exact: 0 }
        entry.score += score
        // "dessert" is satisfied by a dessert, not by a main course whose description suggests one.
        if (required && (strong || !characteristic)) entry.matched += 1
        if (exact) entry.exact += 1
        docScores.set(docIndex, entry)
      }
    }

    // AND semantics over the required terms that exist in the corpus: "poulet curry" only keeps recipes with
    // both, while a word that matches nothing at all ("recette végétarienne") does not empty the result list.
    const hits: LexicalHit[] = []
    const related = new Set<string>()
    for (const [docIndex, { score, matched, exact }] of docScores) {
      const slug = this.slugs[docIndex]
      if (matched > 0 && !excluded.has(slug)) related.add(slug)
      if (matched < requiredCount || excluded.has(slug)) continue
      hits.push({ slug, score, matched, exact: exact === query.terms.length })
    }
    hits.sort((a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score || a.slug.localeCompare(b.slug))
    return { hits, termCount: query.terms.length, excluded, related }
  }

  private matchQueryTerm(term: QueryTerm): { matches: Match[]; confident: boolean } {
    if (term.typed) {
      const typed = this.matchTyped(term.typed)
      if (typed) return { matches: typed, confident: true }
    }
    const matches = this.matchTerm(term.stems, term.typed !== undefined)
    const prefixIsConfident = term.typed !== undefined || term.stems[0].length >= 4
    const confident = matches.some((m) => m.factor === 1 || (m.factor === PREFIX_FACTOR && prefixIsConfident))
    return { matches, confident }
  }

  private matchTyped(word: string): Match[] | null {
    if (word === stem(word)) return null
    const matches: Match[] = []
    this.terms.forEach((term, termIndex) => {
      if (term.startsWith(word)) matches.push({ termIndex, factor: term === word ? 1 : PREFIX_FACTOR })
    })
    return matches.length > 0 ? matches : null
  }

  private matchTerm(stems: string[], isTyping: boolean): Match[] {
    const slot = stems[0]
    const candidates = [...new Set(stems.flatMap((s) => [s, ...(this.aliases.get(s) ?? [])]))]
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
