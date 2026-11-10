import path from "path"
import { createHash } from "crypto"
import { existsSync, readFileSync } from "fs"
import type { Plugin } from "vite"

// Public files the app needs before any recipe is opened. Recipe data and photos are cached
// as they are viewed (and favourites ahead of time, see src/lib/serviceWorker.ts).
const PUBLIC_PRECACHE = [
  "",
  "site.webmanifest",
  "favicon.svg",
  "favicon-32x32.png",
  "favicon-192x192.png",
  "apple-touch-icon.png",
  "data/recipes/index.json",
  "images/empty-state.webp",
]

// The semantic search (worker, ONNX runtime) is large and needs the network for its model anyway:
// offline the search falls back to lexical results, so it is left out of the precache.
const MAX_PRECACHED_FILE_BYTES = 1024 * 1024
const SKIPPED_FILES = [/\.html$/, /\.wasm$/, /\.map$/, /semantic\.worker/]

/** Emits `sw.js` with the build's file list, so the app shell works offline from the first visit. */
export function serviceWorker(): Plugin {
  let base = "/"
  let publicDir = "public"

  return {
    name: "service-worker",
    apply: "build",
    configResolved(config) {
      base = config.base
      publicDir = config.publicDir
    },
    generateBundle(_, bundle) {
      const built = Object.values(bundle)
        .filter((file) => {
          if (SKIPPED_FILES.some((pattern) => pattern.test(file.fileName))) return false
          const size = file.type === "chunk" ? Buffer.byteLength(file.code) : Buffer.byteLength(file.source)
          return size <= MAX_PRECACHED_FILE_BYTES
        })
        .map((file) => file.fileName)
        .sort()
      const precache = [...PUBLIC_PRECACHE.filter((p) => p === "" || existsSync(path.join(publicDir, p))), ...built]

      const template = readFileSync(path.resolve(__dirname, "service-worker.js"), "utf8")
      // A new version whenever the bundle, the recipe index or the worker itself changes
      const hash = createHash("sha256").update(template).update(precache.join("\n"))
      const index = path.join(publicDir, "data/recipes/index.json")
      if (existsSync(index)) hash.update(readFileSync(index))
      const version = hash.digest("hex").slice(0, 12)

      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: `self.__BUILD__ = ${JSON.stringify({ version, base, precache })};\n${template}`,
      })
    },
  }
}
