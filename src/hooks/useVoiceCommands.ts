import { useEffect, useRef, useState } from "react"
import { parseVoiceCommand, recognitionLang, type VoiceCommand } from "@/lib/voiceCommands"

// Minimal Web Speech API typings (not part of TypeScript's DOM lib)
interface RecognitionAlternative { transcript: string }
interface RecognitionResult { isFinal: boolean; readonly length: number; [index: number]: RecognitionAlternative }
interface RecognitionEvent { resultIndex: number; results: { readonly length: number; [index: number]: RecognitionResult } }
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  abort(): void
}
type RecognitionCtor = new () => Recognition

function getRecognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function isVoiceControlSupported() {
  return !!getRecognitionCtor()
}

export type VoiceStatus = "off" | "listening" | "denied" | "error"

/**
 * Listens for short spoken commands while `enabled` (continuous recognition, restarted when the
 * browser ends it after a silence). While the recipe is being read aloud only "stop" is
 * accepted, so the synthesized voice cannot trigger commands by itself.
 */
export function useVoiceCommands(enabled: boolean, language: string, onCommand: (command: VoiceCommand) => void) {
  const [status, setStatus] = useState<VoiceStatus>("off")
  const [heard, setHeard] = useState("")
  const onCommandRef = useRef(onCommand)
  useEffect(() => { onCommandRef.current = onCommand })

  useEffect(() => {
    const Ctor = getRecognitionCtor()
    if (!enabled || !Ctor) return
    let active = true
    let failures = 0
    const recognition = new Ctor()
    recognition.lang = recognitionLang(language)
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = (event) => {
      failures = 0
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (!result.isFinal) continue
        const transcript = result[0]?.transcript.trim() ?? ""
        const command = parseVoiceCommand(transcript)
        if (!command) continue
        if (command !== "stop" && window.speechSynthesis?.speaking) continue
        setHeard(transcript)
        onCommandRef.current(command)
      }
    }
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        active = false
        setStatus("denied")
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        failures++
      }
    }
    recognition.onend = () => {
      if (!active) return
      // Give up after repeated failures (offline, audio capture lost) instead of looping
      if (failures >= 3) {
        setStatus("error")
        return
      }
      try { recognition.start() } catch { setStatus("error") }
    }

    try {
      recognition.start()
      setStatus("listening")
    } catch {
      setStatus("error")
    }
    return () => {
      active = false
      recognition.onend = null
      recognition.abort()
      setStatus("off")
      setHeard("")
    }
  }, [enabled, language])

  return { status, heard }
}
