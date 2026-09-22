const SOUND_URL = `${import.meta.env.BASE_URL}sounds/mamma-mia.mp3`
const PHRASE = "Mamma mia!"

let audio: HTMLAudioElement | null = null

function getAudio() {
  if (!audio && typeof Audio !== "undefined") {
    audio = new Audio(SOUND_URL)
    audio.preload = "auto"
  }
  return audio
}

function findItalianVoice(synth: SpeechSynthesis) {
  return synth.getVoices().find((v) => v.lang.replace("_", "-").toLowerCase().startsWith("it"))
}

/** Preload the sound and warm up the voice list (Chrome loads voices asynchronously). */
export function preloadMammaMia() {
  getAudio()
  window.speechSynthesis?.getVoices()
}

// Fallback when the mp3 can't be played: an Italian (it-IT) speech synthesis voice
function speakMammaMia() {
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

/** Plays "Mamma mia!". Must be called from a user gesture (click) for autoplay policies. */
export function sayMammaMia() {
  const sound = getAudio()
  if (!sound) return speakMammaMia()
  window.speechSynthesis?.cancel()
  sound.currentTime = 0
  Promise.resolve(sound.play()).catch(speakMammaMia)
}
