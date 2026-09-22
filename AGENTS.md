# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cucina Mia is an Italian recipe cookbook web app built with React 19, TypeScript, Vite, and Tailwind CSS v4. It deploys to GitHub Pages at `/Cucina-Mia/` base path. The UI has an editorial magazine aesthetic with Italian language throughout the interface.

## Commands

- **Dev server:** `npm run dev`
- **Build:** `npm run build` (runs `tsc -b && vite build`)
- **Lint:** `npm run lint`
- **Run all tests:** `npm run test`
- **Run single test:** `npx vitest run src/test/HomePage.test.tsx`
- **Watch tests:** `npm run test:watch`

## Architecture

### Routing & Data Loading

Uses `react-router-dom` with `HashRouter` (for GitHub Pages compatibility). Three routes: home (`/`), recipe listing (`/recipes`), and recipe detail (`/recipe/:slug`).

Recipe data is **static JSON** served from `public/data/recipes/`. Each page fetches data at runtime via `fetch()` using `import.meta.env.BASE_URL` as prefix. There is no backend or API, all data lives in the `public/` directory.

- `public/data/recipes/index.json`: array of all recipe summaries
- `public/data/recipes/{slug}.json`: individual recipe detail
- `public/images/recipes/{slug}/cover.svg`: SVG illustration per recipe

### Search

Hybrid search, fully static (no backend), in `src/lib/search/` and exposed through the `useRecipeSearch` hook (used by `HomePage` and `RecipesPage`):

- **Query understanding** (`query.ts`): natural-language queries are parsed into terms and constraints. Filler words are dropped ("recettes qui proviennent de…"), origins map to cuisine tags ("Inde" → `indien`), dish families expand ("curry" → korma, tikka…), negations exclude ("sans porc") or map to diets ("sans viande" → `végétarien`, "sans gluten" stays a tag), and durations/difficulty become filters ("en moins de 30 minutes", "facile"). Cross-language aliases are also learnt from the position-aligned tag translations (`buildTagAliases`).
- **Lexical** (`lexical.ts`, `text.ts`): instant in-memory index over title (weight 3), tags (2), category incl. translated labels (2), ingredients (1.5) and description (1), with every language (fr/en/it) merged into each recipe document. Accent/ligature folding, light plural/feminine stemming, stopwords, prefix matching for the word being typed, typo tolerance and a few synonyms. Query terms are ANDed, but only when they characterise a recipe (title, tags, category, ingredients): words found only in descriptions or reached through a typo just boost the ranking.
- **Semantic** (`semantic.ts`, `semantic.worker.ts`): recipe embeddings are precomputed with `Xenova/multilingual-e5-small`; the browser embeds the query with the same model via `@huggingface/transformers` in a Web Worker, lazily on the first search (model downloaded once from the Hugging Face CDN, then cached; skipped when Save-Data is on). Results are merged with the lexical ones by reciprocal rank fusion.
- Generated assets (git-ignored) in `public/data/search/`, built by `scripts/build-search-index.mjs`: `documents.json` (ingredients, rebuilt automatically by `predev`/`prebuild`) and `embeddings.json` (`npm run build:embeddings`, needs Hugging Face access, run in the deploy and PR preview workflows). Without `embeddings.json` the app silently falls back to lexical-only search.
- `.npmrc` skips the optional CUDA download of `onnxruntime-node` (only used by the embeddings script).

### Component Structure

- `src/components/ui/`: shadcn/ui-style primitives (button, card, input, sheet, badge, skeleton) using `class-variance-authority` + `tailwind-merge`
- `src/components/`: app components (Layout, RecipeCard, SearchBar, FilterDrawer)
- `src/pages/`: route-level page components
- `src/lib/utils.ts`: `cn()` utility for merging Tailwind classes

### Path Alias

`@/` maps to `./src/` (configured in both `tsconfig.app.json` and `vite.config.ts`).

### Types

Recipe types are in `src/types/recipe.ts`: `RecipeSummary` (listing) and `RecipeDetail` (full recipe with ingredients/steps). Difficulty values are Italian: `"Facile" | "Medio" | "Difficile"`.

### Testing

Vitest with jsdom environment, React Testing Library. Tests live in `src/test/`. Setup file imports `@testing-library/jest-dom/vitest` for DOM matchers.

### Deployment

GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on push to `main`.
