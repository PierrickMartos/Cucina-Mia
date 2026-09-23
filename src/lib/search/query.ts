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
  /** Normalised French tags a result must not have ("hiver" rules out "ete"). */
  avoidTags: string[]
  /** Groups of normalised French tags; a result needs one tag of each group ("vegetarien"). */
  requireTags: string[][]
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
  "envie", "ai", "as", "avoir", "besoin", "suggestion", "suggestions", "proposition", "propositions", "aide", "aider",
  "connais", "pourrais", "pourriez", "avez", "auriez", "aujourd", "hui", "demain", "ce", "cette", "repas",
  // en
  "i", "me", "want", "would", "like", "looking", "look", "find", "show", "some", "something", "give", "dish",
  "dishes", "meal", "meals", "cook", "cooking", "make", "from", "that", "which", "what", "are", "is", "be", "come",
  "comes", "coming", "origin", "food", "good", "tonight", "can", "you", "please", "any", "containing", "based",
  "idea", "ideas", "suggest", "suggestion", "suggestions", "need", "craving", "today", "tomorrow", "have", "get",
  // it
  "voglio", "vorrei", "cerco", "qualcosa", "piatto", "piatti", "cucina", "che", "vengono", "viene", "provenienti",
  "dall", "dalla", "dal", "buono", "buoni", "stasera", "mi", "qualche", "idee", "idea", "voglia", "ho", "fare",
  "cucinare", "mangiare", "pasto", "oggi", "domani",
])

// Concept expansions: a query word also matches these (corpus) words.
export const CONCEPTS: Record<string, string[]> = {
  // Cuisines, countries and regions (fr / en / it). Targets are French tags, or dish names when no tag exists.
  inde: ["indien"], india: ["indien"], indian: ["indien"], indiano: ["indien"], indienne: ["indien"],
  italie: ["italien"], italy: ["italien"], italia: ["italien"], italian: ["italien"], italienne: ["italien"],
  sicile: ["sicilien"], sicily: ["sicilien"], sicilia: ["sicilien"],
  milan: ["milanais"], milano: ["milanais"], milanese: ["milanais"], milanaise: ["milanais"],
  rome: ["romain", "carbonara", "amatriciana"], roma: ["romain", "carbonara", "amatriciana"],
  romain: ["romain", "carbonara", "amatriciana"], romaine: ["romain", "carbonara", "amatriciana"],
  roman: ["romain", "carbonara", "amatriciana"], romano: ["romain", "carbonara", "amatriciana"],
  naples: ["napolitain", "sorrentina"], napoli: ["napolitain", "sorrentina"], napolitain: ["napolitain", "sorrentina"],
  neapolitan: ["napolitain", "sorrentina"], napoletano: ["napolitain", "sorrentina"], sorrento: ["sorrentina"],
  france: ["francais"], french: ["francais"], francia: ["francais"], francaise: ["francais"],
  provence: ["provencal"], bordeaux: ["cannele"], bordelais: ["cannele"], savoie: ["savoie"], dauphine: ["dauphine"],
  belgique: ["belge", "liegeois"], belgium: ["belge", "liegeois"], belgian: ["belge", "liegeois"],
  belgio: ["belge", "liegeois"], belga: ["belge", "liegeois"], liege: ["liegeois"],
  espagne: ["espagnol", "gaspacho"], spain: ["espagnol", "gaspacho"], spagna: ["espagnol", "gaspacho"],
  espagnol: ["espagnol", "gaspacho"], spanish: ["espagnol", "gaspacho"], spagnolo: ["espagnol", "gaspacho"],
  andalou: ["gaspacho"], andalousie: ["gaspacho"], andalusia: ["gaspacho"],
  mediterranee: ["mediterraneen"], mediterranean: ["mediterraneen"], mediterraneo: ["mediterraneen"],
  maghreb: ["maghrebin", "chakchouka"], tunisie: ["tunisien", "chakchouka"], tunisia: ["tunisien", "chakchouka"],
  tunisien: ["tunisien", "chakchouka"], tunisian: ["tunisien", "chakchouka"], tunisino: ["tunisien", "chakchouka"],
  orient: ["oriental", "chakchouka", "falafel"], oriental: ["oriental", "chakchouka", "falafel"],
  orientale: ["oriental", "chakchouka", "falafel"], mediorientale: ["oriental", "chakchouka", "falafel"],
  libanais: ["libanais", "falafel"], lebanese: ["libanais", "falafel"], liban: ["libanais", "falafel"],
  amerique: ["americain"], usa: ["americain"], us: ["americain"], etats: ["americain"], america: ["americain"],
  american: ["americain"], americano: ["americain"],
  asie: ["asiatique", "japonais", "thai", "indien"], asia: ["asiatique", "japonais", "thai", "indien"],
  asian: ["asiatique", "japonais", "thai", "indien"], asiatico: ["asiatique", "japonais", "thai", "indien"],
  japon: ["japonais"], japan: ["japonais"], japanese: ["japonais"], giappone: ["japonais"], japonaise: ["japonais"],
  giapponese: ["japonais"],
  thailande: ["thai"], thailand: ["thai"], thailandais: ["thai"], thailandaise: ["thai"], tailandese: ["thai"],
  coree: ["coreen", "mayak"], korea: ["coreen", "mayak"], korean: ["coreen", "mayak"], coreen: ["coreen", "mayak"],
  coreano: ["coreen", "mayak"],
  vietnam: ["vietnamien", "rouleau"], vietnamien: ["vietnamien", "rouleau"], vietnamese: ["vietnamien", "rouleau"],
  vietnamita: ["vietnamien", "rouleau"],
  tropical: ["exotique"], tropicale: ["exotique"], tropicali: ["exotique"], tropique: ["exotique"],
  // Dish families: members that do not carry the family word in their title or tags.
  curry: ["curry", "korma", "tikka", "paneng", "vindaloo"],
  soupe: ["soupe", "gaspacho", "veloute", "potage"], soup: ["soupe", "gaspacho", "veloute", "potage"],
  zuppa: ["soupe", "gaspacho", "veloute", "potage"], veloute: ["soupe", "gaspacho", "veloute", "potage"],
  sandwich: ["sandwich", "tartine", "toast", "dwich"], panino: ["sandwich", "tartine", "toast", "dwich"],
  panini: ["sandwich", "tartine", "toast", "dwich"],
  gateau: ["dessert"], gateaux: ["dessert"], cake: ["dessert"], sucre: ["dessert"],
  // Diets, courses, occasions and styles
  veggie: ["vegetarien"], vege: ["vegetarien"], veg: ["vegetarien"], vegan: ["vegetalien"], vegane: ["vegetalien"],
  coeliaque: ["gluten"], celiac: ["gluten"], celiaco: ["gluten"],
  express: ["rapide"], vite: ["rapide"], fast: ["rapide"],
  mijote: ["mijote"], slow: ["mijote"], lent: ["mijote"],
  aperitif: ["apero"], aperitivo: ["apero"], tapas: ["apero"], amuse: ["apero"],
  healthy: ["leger", "equilibre"], sain: ["leger", "equilibre"], saine: ["leger", "equilibre"],
  light: ["leger", "equilibre"], sano: ["leger", "equilibre"],
  rafraichissant: ["froid", "leger"], refreshing: ["froid", "leger"], rinfrescante: ["froid", "leger"],
  cocooning: ["reconfortant"], piquant: ["epice"], releve: ["epice"],
  noel: ["festif"], christmas: ["festif"], natale: ["festif"], reveillon: ["festif"], fetes: ["festif"],
  bbq: ["barbecue"], grill: ["grille", "barbecue"],
  cher: ["economique"], cheap: ["economique"], budget: ["economique"], economique: ["economique"],
  batch: ["prep", "preparation"], congeler: ["congele"], congelation: ["congele"], freezer: ["congele"],
  freeze: ["congele"], congelare: ["congele"],
  // Ingredient groups (also used by exclusions: "sans porc", "sans fromage")
  viande: ["viande", "porc", "poulet", "boeuf", "agneau", "canard", "veau", "jambon", "lardon", "bacon", "guanciale", "chorizo", "speck", "prosciutto", "saucisse", "magret", "foie"],
  meat: ["viande", "porc", "poulet", "boeuf", "agneau", "canard", "veau", "jambon", "lardon", "bacon", "guanciale", "chorizo", "speck", "prosciutto", "saucisse", "magret", "foie"],
  carne: ["viande", "porc", "poulet", "boeuf", "agneau", "canard", "veau", "jambon", "lardon", "bacon", "guanciale", "chorizo", "speck", "prosciutto", "saucisse", "magret", "foie"],
  porc: ["porc", "jambon", "lardon", "bacon", "guanciale", "chorizo", "speck", "pancetta", "prosciutto", "saucisse", "echine"],
  pork: ["porc", "jambon", "lardon", "bacon", "guanciale", "chorizo", "speck", "pancetta", "prosciutto", "saucisse", "echine"],
  maiale: ["porc", "jambon", "lardon", "bacon", "guanciale", "chorizo", "speck", "pancetta", "prosciutto", "saucisse", "echine"],
  volaille: ["poulet", "canard"], poultry: ["poulet", "canard"], pollame: ["poulet", "canard"],
  fromage: ["fromage", "parmesan", "parmigiano", "mozzarella", "burrata", "feta", "chevre", "comte", "cheddar", "gruyere", "pecorino", "provola", "ricotta", "mascarpone"],
  cheese: ["fromage", "parmesan", "parmigiano", "mozzarella", "burrata", "feta", "chevre", "comte", "cheddar", "gruyere", "pecorino", "provola", "ricotta", "mascarpone"],
  formaggio: ["fromage", "parmesan", "parmigiano", "mozzarella", "burrata", "feta", "chevre", "comte", "cheddar", "gruyere", "pecorino", "provola", "ricotta", "mascarpone"],
  nuts: ["noix", "amande", "noisette", "pistache", "cajou", "cacahuete", "pignon"], oleagineux: ["noix", "amande", "noisette", "pistache", "cajou", "cacahuete", "pignon"], arachide: ["cacahuete", "arachide"], peanut: ["cacahuete", "arachide"],
}

// Tags implied or ruled out by a query word, applied to every result: the semantic layer alone would
// happily suggest a cold summer gaspacho for "réconfortant pour l'hiver". Keys are query words.
const WINTER = { avoid: ["ete", "froid"] }
const SUMMER = { avoid: ["hiver"] }
const COLD = { avoid: ["chaud"] }
const HOT = { avoid: ["froid"] }
const VEGETARIAN = { require: ["vegetarien", "vegetalien"] }
const VEGAN = { require: ["vegetalien"] }
export const TAG_RULES: Record<string, { avoid?: string[]; require?: string[] }> = {
  hiver: WINTER, winter: WINTER, inverno: WINTER, hivernal: WINTER, invernale: WINTER,
  ete: SUMMER, summer: SUMMER, estate: SUMMER, estivo: SUMMER,
  froid: COLD, cold: COLD, freddo: COLD,
  chaud: HOT, hot: HOT, caldo: HOT,
  vegetarien: VEGETARIAN, vegetarian: VEGETARIAN, vegetariano: VEGETARIAN, veggie: VEGETARIAN, vege: VEGETARIAN,
  veg: VEGETARIAN, vegetalien: VEGAN, vegan: VEGAN, vegane: VEGAN, vegano: VEGAN,
}
// "sans X" tags a result must carry.
const WITHOUT_TAGS: Record<string, string[]> = {
  gluten: ["sans gluten"], glutine: ["sans gluten"],
  lactose: ["sans lactose"], lattosio: ["sans lactose"], dairy: ["sans lactose"],
  sucre: ["sans sucre"], zucchero: ["sans sucre"], sugar: ["sans sucre"],
  cuisson: ["sans cuisson", "no cuisson"], cottura: ["sans cuisson", "no cuisson"],
  cook: ["sans cuisson", "no cuisson"], cooking: ["sans cuisson", "no cuisson"],
  bake: ["sans cuisson", "no cuisson"], baking: ["sans cuisson", "no cuisson"],
}
const TAG_RULE_STEMS = new Map(Object.entries(TAG_RULES).map(([word, rule]) => [stem(word), rule] as const))

// "sans X" is a positive tag for these X ("sans gluten"), a negation otherwise ("sans porc").
// Keep this list to words that exist as "sans-xxx" / "no-xxx" tags: "sans œufs" must stay an exclusion.
export const POSITIVE_WITHOUT = new Set([
  "gluten", "lactose", "cuisson", "sucre", "equipement",
  "glutine", "lattosio", "zucchero", "cottura", "attrezzatura", "attrezzature",
  "cook", "cooking", "bake", "baking", "sugar", "dairy", "special", "equipment",
])
// How "sans" is written in tags: "sans-gluten", "no-cuisson", "senza-glutine", "no-cook", "gluten-free".
// Compound tags are indexed as one word ("sansgluten"), see LexicalIndex.
function withoutTag(object: string): QueryTerm {
  const forms = ["sans", "no", "senza", "without"].map((negation) => negation + object)
  return { stems: [...new Set([...forms, object + "free"].map(stem))] }
}
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
  const parsed: ParsedQuery = { terms: [], exclude: [], avoidTags: [], requireTags: [] }
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
      // While typing "sans glu", anticipate "sans gluten" rather than excluding "glu".
      const typingObject = typing && j === words.length - 1
      const positive = POSITIVE_WITHOUT.has(object) || (typingObject && [...POSITIVE_WITHOUT].some((w) => w.startsWith(object)))
      if (positive) {
        // No concept expansion here: "sans sucre" is the sans-sucre tag, not "sans dessert".
        parsed.terms.push(withoutTag(object))
        if (WITHOUT_TAGS[object]) parsed.requireTags.push(WITHOUT_TAGS[object])
      } else if (MEATLESS.has(object)) {
        parsed.terms.push({ stems: [stem("vegetarien")] })
      } else {
        const term = toTerm(object, false)
        if (term) parsed.exclude.push(term)
      }
      i = j
      continue
    }

    // "moyen-orient" is a place, not a medium difficulty.
    if (word === "moyen" && words[i + 1] === "orient") continue
    const difficulty = DIFFICULTY_WORDS[word]
    if (difficulty) {
      parsed.difficulty = difficulty
      parsed.difficultyWord = stem(word)
      continue
    }
    if (FILLERS.has(word)) continue
    // English "gluten free", "dairy free".
    if (words[i + 1] === "free" && POSITIVE_WITHOUT.has(word)) {
      parsed.terms.push(withoutTag(word))
      if (WITHOUT_TAGS[word]) parsed.requireTags.push(WITHOUT_TAGS[word])
      i++
      continue
    }

    const term = toTerm(word, typing && isLast)
    if (term) parsed.terms.push(term)
  }

  for (const term of parsed.terms) {
    const rule = TAG_RULE_STEMS.get(term.stems[0])
    if (rule?.avoid) parsed.avoidTags.push(...rule.avoid)
    if (rule?.require) parsed.requireTags.push(rule.require)
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
  return (
    parsed.exclude.length > 0 ||
    parsed.maxMinutes !== undefined ||
    parsed.difficulty !== undefined ||
    parsed.avoidTags.length > 0 ||
    parsed.requireTags.length > 0
  )
}
