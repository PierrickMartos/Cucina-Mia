// Voice commands understood by the hands-free cooking mode. Every language (fr/en/it) is
// accepted whatever the interface language: a cook may switch languages without thinking.

export type VoiceCommand = "next" | "previous" | "repeat" | "timer" | "stop"

// Single words, compared after folding accents and case
const KEYWORDS: Record<VoiceCommand, string[]> = {
  next: ["suivant", "suivante", "next", "avanti", "successivo", "successiva", "prossimo", "prossima", "continue", "continua", "continuer"],
  previous: ["precedent", "precedente", "previous", "back", "indietro", "retour", "arriere"],
  repeat: ["repete", "repeter", "relis", "relire", "lis", "lire", "repeat", "read", "again", "ripeti", "rileggi", "leggi", "ancora", "encore"],
  timer: ["minuteur", "chrono", "timer", "minuterie", "cronometro"],
  stop: ["stop", "arrete", "arreter", "stoppe", "silence", "tais", "basta", "ferma", "fermati", "zitto", "silenzio"],
}

// Order matters when an utterance holds several keywords: "stop timer" stops the alarm
const PRIORITY: VoiceCommand[] = ["stop", "timer", "previous", "next", "repeat"]

// Longer utterances are conversation (or the recipe being read aloud), not commands
const MAX_WORDS = 4

function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

/** Maps a speech recognition transcript to a command, or null when it is not one. */
export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const words = fold(transcript).split(/[^a-z]+/).filter(Boolean)
  if (words.length === 0 || words.length > MAX_WORDS) return null
  for (const command of PRIORITY) {
    if (words.some((word) => KEYWORDS[command].includes(word))) return command
  }
  return null
}

/** BCP 47 tag for speech recognition, which wants a region ("fr" → "fr-FR"). */
export function recognitionLang(language: string) {
  const base = language.slice(0, 2).toLowerCase()
  return { fr: "fr-FR", en: "en-US", it: "it-IT" }[base] ?? language
}
