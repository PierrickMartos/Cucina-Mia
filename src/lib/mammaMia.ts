const PHRASE = "Mamma mia!"

function findItalianVoice(synth: SpeechSynthesis) {
  return synth.getVoices().find((v) => v.lang.replace("_", "-").toLowerCase().startsWith("it"))
}

/** Warm up the voice list: some browsers (Chrome) load voices asynchronously. */
export function preloadVoices() {
  window.speechSynthesis?.getVoices()
}

/** Says "Mamma mia!" with an Italian voice (it-IT) when speech synthesis is available. */
export function sayMammaMia() {
  const synth = window.speechSynthesis
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") return
  // Defer so the route change runs first: leaving a recipe cancels any speech in progress
  setTimeout(() => {
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(PHRASE)
    utterance.lang = "it-IT"
    const voice = findItalianVoice(synth)
    if (voice) utterance.voice = voice
    utterance.rate = 0.9
    utterance.pitch = 1.15
    synth.speak(utterance)
  }, 0)
}
