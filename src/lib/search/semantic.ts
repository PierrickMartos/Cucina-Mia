import type { WorkerRequest, WorkerResponse } from "./semantic.worker"

// Built by scripts/build-search-index.mjs --embeddings (in CI). Missing file = lexical-only search.
const EMBEDDINGS_URL = `${import.meta.env.BASE_URL}data/search/embeddings.json`

// e5 similarities are compressed in a narrow band: keep results close to the best one, above a floor.
const MIN_SIMILARITY = 0.8
const RELATIVE_WINDOW = 0.05
// When the lexical search already matched every query word, only add clearly related recipes.
const STRICT_RELATIVE_WINDOW = 0.02
const MAX_HITS = 20

export interface EmbeddingIndex {
  model: string
  dtype: string
  vectors: Map<string, Float32Array[]>
}

export interface SemanticHit {
  slug: string
  score: number
}

export type SemanticStatus = "unavailable" | "idle" | "loading" | "ready"

function decodeVector(entry: unknown): Float32Array | null {
  if (!entry || typeof entry !== "object") return null
  const { s, v } = entry as { s?: unknown; v?: unknown }
  if (typeof s !== "number" || typeof v !== "string") return null
  const binary = atob(v)
  const vector = new Float32Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    const byte = binary.charCodeAt(i)
    vector[i] = (byte > 127 ? byte - 256 : byte) * s
  }
  return vector
}

export function parseEmbeddings(data: unknown): EmbeddingIndex | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null
  const { model, dtype, vectors } = data as { model?: unknown; dtype?: unknown; vectors?: unknown }
  if (typeof model !== "string" || typeof dtype !== "string" || !vectors || typeof vectors !== "object") return null
  const parsed = new Map<string, Float32Array[]>()
  for (const [slug, entries] of Object.entries(vectors)) {
    if (!Array.isArray(entries)) continue
    const decoded = entries.map(decodeVector).filter((v): v is Float32Array => v !== null)
    if (decoded.length > 0) parsed.set(slug, decoded)
  }
  return parsed.size > 0 ? { model, dtype, vectors: parsed } : null
}

function dot(a: Float32Array, b: Float32Array) {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

/** Cosine similarity (vectors are normalised) against the best-matching language of each recipe. */
export function rankBySimilarity(index: EmbeddingIndex, query: Float32Array): SemanticHit[] {
  const hits: SemanticHit[] = []
  for (const [slug, vectors] of index.vectors) {
    let best = -Infinity
    for (const vector of vectors) {
      if (vector.length === query.length) best = Math.max(best, dot(vector, query))
    }
    if (best > -Infinity) hits.push({ slug, score: best })
  }
  return hits.sort((a, b) => b.score - a.score)
}

export function selectSemanticHits(ranked: SemanticHit[], strict = false): SemanticHit[] {
  if (ranked.length === 0) return []
  const floor = Math.max(MIN_SIMILARITY, ranked[0].score - (strict ? STRICT_RELATIVE_WINDOW : RELATIVE_WINDOW))
  return ranked.filter((hit) => hit.score >= floor).slice(0, MAX_HITS)
}

function semanticSupported() {
  if (typeof Worker === "undefined" || typeof fetch === "undefined") return false
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return connection?.saveData !== true
}

class SemanticEngine {
  status: SemanticStatus = semanticSupported() ? "idle" : "unavailable"
  index: EmbeddingIndex | null = null
  private worker: Worker | null = null
  private nextId = 0
  private pending = new Map<number, { resolve: (v: Float32Array) => void; reject: (e: Error) => void }>()
  private cache = new Map<string, Float32Array>()
  private listeners = new Set<() => void>()

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getStatus = () => this.status

  private setStatus(status: SemanticStatus) {
    this.status = status
    this.listeners.forEach((listener) => listener())
  }

  /** Starts downloading the embeddings and the model (once). */
  start() {
    if (this.status !== "idle") return
    this.setStatus("loading")
    this.load().catch(() => this.setStatus("unavailable"))
  }

  private async load() {
    const response = await fetch(EMBEDDINGS_URL)
    if (!response.ok) throw new Error(`embeddings: HTTP ${response.status}`)
    const index = parseEmbeddings(await response.json())
    if (!index) throw new Error("embeddings: invalid file")
    this.index = index

    const worker = new Worker(new URL("./semantic.worker.ts", import.meta.url), { type: "module" })
    this.worker = worker
    await new Promise<void>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data
        if (message.type === "ready") {
          resolve()
        } else if (message.type === "embedding") {
          this.pending.get(message.id)?.resolve(message.vector)
          this.pending.delete(message.id)
        } else if (message.id !== undefined) {
          this.pending.get(message.id)?.reject(new Error(message.message))
          this.pending.delete(message.id)
        } else {
          reject(new Error(message.message))
        }
      }
      worker.onerror = (event) => reject(new Error(event.message))
      worker.postMessage({ type: "load", model: index.model, dtype: index.dtype } satisfies WorkerRequest)
    })
    this.setStatus("ready")
  }

  async embed(query: string): Promise<Float32Array | null> {
    const key = query.trim().toLowerCase()
    const cached = this.cache.get(key)
    if (cached) return cached
    if (this.status !== "ready" || !this.worker) return null
    const id = this.nextId++
    const vector = await new Promise<Float32Array>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.worker!.postMessage({ type: "embed", id, text: `query: ${key}` } satisfies WorkerRequest)
    })
    this.cache.set(key, vector)
    return vector
  }
}

export const semanticEngine = new SemanticEngine()
