// Text normalisation shared by the lexical index and queries (French, English and Italian).

const STOPWORDS = new Set([
  // fr
  "le", "la", "les", "l", "de", "des", "du", "d", "un", "une", "et", "ou", "a", "au", "aux", "en", "avec",
  "pour", "par", "sur", "dans", "ce", "ces", "cette", "mon", "ma", "mes", "qui", "que", "est", "se", "sa", "son",
  "recette", "recettes", "facon",
  // en
  "the", "of", "and", "or", "an", "with", "for", "in", "on", "to", "my", "recipe", "recipes", "style",
  // it
  "il", "lo", "gli", "i", "di", "del", "della", "dei", "delle", "e", "con", "per", "da", "al", "alla", "allo",
  "ai", "alle", "ricetta", "ricette",
  // units
  "g", "kg", "mg", "ml", "cl", "dl", "l", "cs", "cc", "cuil", "cuillere", "cuilleres", "tbsp", "tsp", "cup",
  "cups", "qs", "q", "s", "pincee", "pinch",
])

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/**
 * Deliberately light, language-agnostic stemmer: folds plurals and the final vowel so that
 * "tomates" / "tomate" / "tomatoes" / "tomato" and "pomodori" / "pomodoro" share a stem.
 */
export function stem(word: string): string {
  let w = word
  if (w.length > 3 && (w.endsWith("s") || w.endsWith("x"))) w = w.slice(0, -1)
  // French feminine "-aise" / "-oise" -> same stem as "-ais" / "-ois" (japonaise / japonais, liégeoise / liégeois).
  if (w.length > 6 && /[ao]ise$/.test(w)) w = w.slice(0, -2)
  for (let i = 0; i < 2 && w.length > 4 && /[aeio]$/.test(w); i++) w = w.slice(0, -1)
  // French feminine forms: "italienne" -> "italien", "crémeuse" -> "crémeux".
  if (w.length > 5 && w.endsWith("nn")) w = w.slice(0, -1)
  if (w.length > 5 && w.endsWith("eus")) w = w.slice(0, -1)
  return w
}

/** Normalised, stemmed tokens without stopwords or bare numbers. */
export function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 0 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
    .map(stem)
}

/** Damerau-Levenshtein (optimal string alignment) distance, bailing out once `max` is exceeded. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prevPrev: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2] + 1)
      }
      curr.push(value)
      rowMin = Math.min(rowMin, value)
    }
    if (rowMin > max) return max + 1
    prevPrev = prev
    prev = curr
  }
  return prev[b.length]
}
