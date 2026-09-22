// Embeds search queries in the browser. Loaded lazily so the model (downloaded once from the
// Hugging Face CDN, then cached by the browser) never blocks the page or the lexical search.
import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers"

export type WorkerRequest =
  | { type: "load"; model: string; dtype: string }
  | { type: "embed"; id: number; text: string }

export type WorkerResponse =
  | { type: "ready" }
  | { type: "error"; id?: number; message: string }
  | { type: "embedding"; id: number; vector: Float32Array }

env.allowLocalModels = false

let extractor: Promise<FeatureExtractionPipeline> | null = null

function post(message: WorkerResponse) {
  self.postMessage(message)
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data
  const id = message.type === "embed" ? message.id : undefined
  try {
    if (message.type === "load") {
      extractor ??= pipeline("feature-extraction", message.model, {
        dtype: message.dtype as "q8",
      }) as Promise<FeatureExtractionPipeline>
      await extractor
      post({ type: "ready" })
      return
    }
    if (!extractor) throw new Error("Model not loaded")
    const output = await (await extractor)(message.text, { pooling: "mean", normalize: true })
    post({ type: "embedding", id: message.id, vector: output.data as Float32Array })
  } catch (error) {
    post({ type: "error", id, message: error instanceof Error ? error.message : String(error) })
  }
}
