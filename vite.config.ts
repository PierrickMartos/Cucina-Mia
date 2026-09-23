import path from "path"
import { existsSync, readdirSync, rmSync } from "fs"
import { defineConfig, defaultExclude } from "vitest/config"
import type { Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { sharePages } from "./scripts/vite-plugin-share-pages.ts"

// Original recipe sources (source.*, source-*: photos of handwritten recipes, PDFs…) live next to the
// recipe images in public/ but are never displayed: keep them out of the build.
function excludeRecipeSources(): Plugin {
  let outDir = "dist"
  return {
    name: "exclude-recipe-sources",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const recipesDir = path.join(outDir, "images/recipes")
      if (!existsSync(recipesDir)) return
      for (const slug of readdirSync(recipesDir)) {
        for (const file of readdirSync(path.join(recipesDir, slug))) {
          if (file.startsWith("source")) rmSync(path.join(recipesDir, slug, file))
        }
      }
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/Cucina-Mia/",
  plugins: [react(), tailwindcss(), excludeRecipeSources(), sharePages()],
  build: {
    rolldownOptions: {
      output: {
        // Libraries change far less often than the app: keep them in their own long-cached chunks.
        codeSplitting: {
          groups: [
            { name: "react", test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: "motion", test: /[\\/]node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/ },
            { name: "i18n", test: /[\\/]node_modules[\\/](i18next|i18next-browser-languagedetector|react-i18next)[\\/]/ },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    exclude: [...defaultExclude, ".agents/**", ".claude/**", ".codex/**", ".worktrees/**"],
  },
})
