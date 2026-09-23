// Servings scaling for free-text ingredient lines ("200 g de farine", "2 à 3 œufs", "½ ananas (170 g)").
// Ingredients stay plain strings in the recipe JSON: quantities are parsed at display time, so every
// recipe keeps its original `servings` and text, and a factor of 1 always returns the line untouched.
//
// What gets scaled:
// - the leading quantity, optionally after an "about" word: integers, decimals (1,5 / 1.5), fractions
//   (1/2, 1 1/2, ½, 1½) and ranges (6 à 8, 6-8, 2 ou 3, da 1,5 a 2);
// - any later metric weight/volume ("(environ 600 g)", "(0,1g)"), except per-unit amounts ("2 g each");
// - a head count ("gnocchi pour 2 personnes").
// Everything else (salt to taste, "T55", "5 cm", "1 par personne") is left as written.

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 1 / 2,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 1 / 8,
}
const FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join("")

const NUMBER = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?(?:\\s?[${FRACTION_CHARS}])?|[${FRACTION_CHARS}])`
const RANGE_SEPARATOR = `(?:\\s*[-–]\\s*|\\s+(?:à|a|to|or|ou|o)\\s+)`
const APPROX_PREFIX = `(?:(?:about|approx\\.?|approximately|around|environ|env\\.|circa|da)\\s+)?`
const METRIC_UNIT = `(?:kg|g|mg|ml|cl|dl|l|litres?|liters?|litri|litro)`
const PER_UNIT = `\\s*(?:each|chacun|chacune|ciascun|ciascuno|ciascuna|pièce|pezzo)`

const LEADING_RE = new RegExp(`^(\\s*${APPROX_PREFIX})(${NUMBER})(${RANGE_SEPARATOR}(${NUMBER}))?`, "i")
const METRIC_RE = new RegExp(
  `(?<![\\w.,/])(${NUMBER})(${RANGE_SEPARATOR}(${NUMBER}))?(\\s?${METRIC_UNIT})(?![\\p{L}'’])(?!${PER_UNIT})`,
  "giu"
)
// "Gnocchi pour 2 personnes", "for 2 people", "per 2 persone"
const FOR_PEOPLE_RE = /(\b(?:pour|for|per)\s+)(\d+)(\s+(?:personnes?|people|persons?|persone|persona)\b)/giu
const METRIC_UNIT_START_RE = new RegExp(`^\\s?${METRIC_UNIT}(?![\\p{L}])`, "iu")

export function parseQuantity(raw: string): number | null {
  const text = raw.trim()
  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const fraction = text.match(/^(\d+)\/(\d+)$/)
  if (fraction) return Number(fraction[2]) === 0 ? null : Number(fraction[1]) / Number(fraction[2])
  const unicode = text.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)?\\s?([${FRACTION_CHARS}])$`))
  if (unicode) return (unicode[1] ? Number(unicode[1].replace(",", ".")) : 0) + UNICODE_FRACTIONS[unicode[2]]
  const decimal = text.match(/^\d+(?:[.,]\d+)?$/)
  if (decimal) return Number(text.replace(",", "."))
  return null
}

function formatDecimal(value: number, maxDecimals: number, lang: string) {
  const rounded = Number(value.toFixed(maxDecimals))
  const text = String(rounded)
  return lang.startsWith("en") ? text : text.replace(".", ",")
}

// Metric amounts: sensible kitchen precision (7,5 g, 45 g, 185 g, 1250 g).
function formatMetric(value: number, lang: string) {
  if (value < 1) return formatDecimal(value, 2, lang)
  if (value < 10) return formatDecimal(value, 1, lang)
  if (value < 100) return String(Math.round(value))
  if (value < 1000) return String(Math.round(value / 5) * 5)
  return String(Math.round(value / 10) * 10)
}

const FRACTION_STEPS: [number, string][] = [
  [0, ""],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [1, ""],
]

// Counts, spoons, cups…: kitchen fractions (1 ½ œufs, ¾ c. à café), whole numbers from 10 up.
function formatCount(value: number) {
  if (value >= 10) return String(Math.round(value))
  if (value < 1 / 8 + 1 / 16) return "⅛"
  let whole = Math.floor(value)
  const rest = value - whole
  let [step, symbol] = FRACTION_STEPS[0]
  for (const candidate of FRACTION_STEPS) {
    if (Math.abs(candidate[0] - rest) < Math.abs(step - rest)) [step, symbol] = candidate
  }
  if (step === 1) whole += 1
  if (whole === 0) return symbol || "⅛"
  return symbol ? `${whole} ${symbol}` : String(whole)
}

function scaleNumber(raw: string, factor: number, metric: boolean, lang: string) {
  const value = parseQuantity(raw)
  if (value === null) return raw
  const scaled = value * factor
  return metric ? formatMetric(scaled, lang) : formatCount(scaled)
}

export function scaleIngredient(text: string, factor: number, lang = "fr"): string {
  if (!Number.isFinite(factor) || factor <= 0 || factor === 1) return text

  let head = ""
  let rest = text
  const leading = text.match(LEADING_RE)
  if (leading) {
    const [whole, prefix, first, range, second] = leading
    const after = text.slice(whole.length)
    const metric = METRIC_UNIT_START_RE.test(after)
    head = prefix + scaleNumber(first, factor, metric, lang)
    if (range && second) head += range.slice(0, range.length - second.length) + scaleNumber(second, factor, metric, lang)
    rest = after
  }

  rest = rest.replace(METRIC_RE, (_match, first: string, range: string | undefined, second: string | undefined, unit: string) => {
    let out = scaleNumber(first, factor, true, lang)
    if (range && second) out += range.slice(0, range.length - second.length) + scaleNumber(second, factor, true, lang)
    return out + unit
  })

  rest = rest.replace(FOR_PEOPLE_RE, (_match, before: string, count: string, after: string) =>
    before + Math.max(1, Math.round(Number(count) * factor)) + after
  )

  return head + rest
}

export function servingOptions(base: number) {
  const max = Math.max(12, base * 2)
  return Array.from({ length: max }, (_, i) => i + 1)
}
