// Kept free of side effects: also imported by the build (scripts/share-page.ts)

export const LANGUAGES = ["fr", "en", "it"] as const
export type Language = (typeof LANGUAGES)[number]

/** Language the recipes are written in, used when nothing else applies */
export const DEFAULT_LANGUAGE: Language = "fr"

/** localStorage key holding the language picked by the visitor */
export const LANG_STORAGE_KEY = "cucina-mia-lang"

export function toLanguage(code: string | undefined): Language {
  const short = code?.slice(0, 2)
  return (LANGUAGES as readonly string[]).includes(short ?? "") ? (short as Language) : DEFAULT_LANGUAGE
}
