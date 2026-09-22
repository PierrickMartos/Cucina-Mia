// Turns a natural-language query ("recettes indiennes avec du poulet", "dessert facile en moins de
// 30 minutes", "pâtes sans porc") into search terms and structured constraints.
import { normalize, stem, tokenize } from "./text"

export interface QueryTerm {
  /** Alternative stems, any of which satisfies the term. The first one is what the user typed. */
  stems: string[]
  /** Unstemmed word when it is still being typed (last word, no trailing space). */
  typed?: string
}

export type Difficulty = "Facile" | "Medio" | "Difficile"

export interface ParsedQuery {
  terms: QueryTerm[]
  /** Recipes matching any of these terms (in title, tags, category or ingredients) are removed. */
  exclude: QueryTerm[]
  maxMinutes?: number
  difficulty?: Difficulty
  /** The word that set the difficulty ("facile"): recipes with it in their title or tags also qualify. */
  difficultyWord?: string
}

// The lexicon below is reviewed and extended by the search-lexicon skill (.agents/skills/search-lexicon)
// and audited by src/test/searchLexicon.test.ts.

// Words that carry no meaning in a recipe search sentence.
export const FILLERS = new Set([
  // fr
  "je", "j", "tu", "on", "nous", "vous", "moi", "veux", "voudrais", "aimerais", "cherche", "chercher", "trouve",
  "trouver", "montre", "montrer", "donne", "propose", "proposer", "idee", "idees", "quelque", "quelques", "chose",
  "choses", "faire", "cuisiner", "manger", "preparer", "qui", "quoi", "quel", "quelle", "quels", "quelles", "provient",
  "proviennent", "provenant", "venant", "viennent", "vient", "originaire", "originaires", "origine", "typique",
  "typiques", "cuisine", "cuisines", "plat", "plats", "bon", "bons", "bonne", "bonnes", "delicieux", "delicieuse",
  "super", "soir", "midi", "peux", "peut", "sont", "etre", "y", "tres", "peu", "comme", "genre", "type", "du",
  "contient", "contenant", "base", "ya", "il", "elle", "des", "leur", "ne", "pas", "ni", "tout", "toutes", "tous",
  // en
  "i", "me", "want", "would", "like", "looking", "look", "find", "show", "some", "something", "give", "dish",
  "dishes", "meal", "meals", "cook", "cooking", "make", "from", "that", "which", "what", "are", "is", "be", "come",
  "comes", "coming", "origin", "food", "good", "tonight", "can", "you", "please", "any", "containing", "based",
  // it
  "voglio", "vorrei", "cerco", "qualcosa", "piatto", "piatti", "cucina", "che", "vengono", "viene", "provenienti",
  "dall", "dalla", "dal", "buono", "buoni", "stasera", "mi", "qualche",
])

// Concept expansions: a query word also matches these (corpus) words.
export const CONCEPTS: Record<string, string[]> = {
  // Cuisines / origins
  inde: ["indien"], india: ["indien"], indian: ["indien"], indiano: ["indien"], indienne: ["indien"],
  italie: ["italien"], italy: ["italien"], italia: ["italien"], italian: ["italien"], italienne: ["italien"],
  japon: ["japonais"], japan: ["japonais"], japanese: ["japonais"], giappone: ["japonais"], japonaise: ["japonais"],
  thailande: ["thai"], thailand: ["thai"], thailandais: ["thai"], thailandaise: ["thai"],
  asie: ["asiatique", "japonais", "thai", "indien"], asia: ["asiatique", "japonais", "thai", "indien"],
  asian: ["asiatique", "japonais", "thai", "indien"], asiatico: ["asiatique", "japonais", "thai", "indien"],
  france: ["francais"], french: ["francais"], francia: ["francais"], francaise: ["francais"],
  amerique: ["americain"], usa: ["americain"], america: ["americain"], american: ["americain"],
  sicile: ["sicilien"], sicily: ["sicilien"], sicilia: ["sicilien"],
  milan: ["milanais"], milano: ["milanais"], milanese: ["milanais"], milanaise: ["milanais"],
  provence: ["provencal"], mediterranee: ["mediterraneen"], mediterranean: ["mediterraneen"],
  coree: ["coreen", "asiatique"], korea: ["coreen", "asiatique"], korean: ["coreen", "asiatique"],
  // Dish families
  curry: ["curry", "korma", "tikka", "paneng", "vindaloo"],
  // Diets and courses
  veggie: ["vegetarien"], vege: ["vegetarien"], veg: ["vegetarien"], vegan: ["vegetalien"], vegane: ["vegetalien"],
  express: ["rapide"], vite: ["rapide"], fast: ["rapide"], aperitif: ["apero"], aperitivo: ["apero"],
  gateau: ["dessert"], gateaux: ["dessert"], cake: ["dessert"], sucre: ["dessert"],
  viande: ["viande", "porc", "poulet", "boeuf", "agneau", "canard", "jambon", "lardon", "bacon", "guanciale", "chorizo", "speck", "magret", "veau"],
  meat: ["viande", "porc", "poulet", "boeuf", "agneau", "canard", "jambon", "lardon", "bacon", "guanciale", "chorizo", "speck", "magret", "veau"],
  carne: ["viande", "porc", "poulet", "boeuf", "agneau", "canard", "jambon", "lardon", "bacon", "guanciale", "chorizo", "speck", "magret", "veau"],
  porc: ["porc", "jambon", "lardon", "bacon", "guanciale", "chorizo", "speck", "pancetta", "saucisse"],
  pork: ["porc", "jambon", "lardon", "bacon", "guanciale", "chorizo", "speck", "pancetta", "saucisse"],
  maiale: ["porc", "jambon", "lardon", "bacon", "guanciale", "chorizo", "speck", "pancetta", "saucisse"],
  fromage: ["fromage", "parmesan", "mozzarella", "feta", "chevre", "comte", "cheddar", "pecorino", "ricotta", "mascarpone", "burrata"],
  cheese: ["fromage", "parmesan", "mozzarella", "feta", "chevre", "comte", "cheddar", "pecorino", "ricotta", "mascarpone", "burrata"],
  formaggio: ["fromage", "parmesan", "mozzarella", "feta", "chevre", "comte", "cheddar", "pecorino", "ricotta", "mascarpone", "burrata"],
}

// "sans X" is a positive tag for these X ("sans gluten"), a negation otherwise ("sans porc").
export const POSITIVE_WITHOUT = new Set([
  "gluten", "lactose", "cuisson", "sucre", "equipement", "lait", "oeuf", "oeufs",
  "glutine", "lattosio", "zucchero", "cottura", "attrezzatura", "attrezzature",
  "cook", "cooking", "bake", "baking", "sugar", "dairy", "special", "equipment",
])
// How "sans" is written in tags: "sans-gluten", "no-cuisson", "senza-glutine", "no-cook".
const WITHOUT_STEMS = [...new Set(["sans", "no", "senza", "without"].map(stem))]
// "sans viande" means vegetarian rather than "exclude everything mentioning meat".
const MEATLESS = new Set(["viande", "viandes", "meat", "carne"])
const NEGATIONS = new Set(["sans", "without", "senza", "pas", "no"])

export const DIFFICULTY_WORDS: Record<string, Difficulty> = {
  facile: "Facile", facil: "Facile", easy: "Facile", simple: "Facile", simples: "Facile", semplice: "Facile",
  moyen: "Medio", medium: "Medio", medio: "Medio",
  difficile: "Difficile", difficult: "Difficile", hard: "Difficile", complique: "Difficile",
}

const DURATION = /(?:(?:en|moins de|under|less than|within|in|meno di|max|maximum)\s+)?(\d+)\s*(heures?|hours?|ore|ora|minutes?|minuti|mins?|mn|h)(\d{1,2})?\b/

const CONCEPT_STEMS = new Map(
  Object.entries(CONCEPTS).map(([word, targets]) => [stem(word), [...new Set(targets.map(stem))]] as const)
)

function toTerm(word: string, typed: boolean): QueryTerm | null {
  const [token] = tokenize(word)
  if (!token) return null
  const alternatives = CONCEPT_STEMS.get(token) ?? []
  return { stems: [token, ...alternatives.filter((s) => s !== token)], typed: typed ? word : undefined }
}

export function parseQuery(query: string): ParsedQuery {
  const parsed: ParsedQuery = { terms: [], exclude: [] }
  let text = normalize(query)
  const typing = !/\s$/.test(query)

  const duration = text.match(DURATION)
  if (duration) {
    const value = Number(duration[1])
    const hours = /^(h|or)/.test(duration[2])
    parsed.maxMinutes = hours ? value * 60 + Number(duration[3] ?? 0) : value
    text = text.replace(duration[0], " ")
  }

  const words = text.split(" ").filter(Boolean)
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const isLast = i === words.length - 1

    if (NEGATIONS.has(word) && i + 1 < words.length) {
      // "pas de X" / "sans du X": skip articles between the negation and its object.
      let j = i + 1
      while (j < words.length - 1 && ["de", "d", "du", "des", "la", "le", "les", "l"].includes(words[j])) j++
      const object = words[j]
      if (word === "pas" && j === i + 1) continue
      if (POSITIVE_WITHOUT.has(object)) {
        const term = toTerm(object, typing && j === words.length - 1)
        parsed.terms.push({ stems: WITHOUT_STEMS }, ...(term ? [term] : []))
      } else if (MEATLESS.has(object)) {
        parsed.terms.push({ stems: [stem("vegetarien")] })
      } else {
        const term = toTerm(object, false)
        if (term) parsed.exclude.push(term)
      }
      i = j
      continue
    }

    const difficulty = DIFFICULTY_WORDS[word]
    if (difficulty) {
      parsed.difficulty = difficulty
      parsed.difficultyWord = stem(word)
      continue
    }
    if (FILLERS.has(word)) continue

    const term = toTerm(word, typing && isLast)
    if (term) parsed.terms.push(term)
  }

  // Deduplicate identical terms ("curry curry", "indien" + "inde").
  const seen = new Set<string>()
  parsed.terms = parsed.terms.filter((term) => {
    const key = term.stems.join("|")
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return parsed
}

export function hasConstraints(parsed: ParsedQuery) {
  return parsed.exclude.length > 0 || parsed.maxMinutes !== undefined || parsed.difficulty !== undefined
}
