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

Uses `react-router-dom` with `HashRouter` (for GitHub Pages compatibility). Routes: home (`/`), recipe listing (`/recipes`), recipe detail (`/recipe/:slug`), about (`/about`) and "what can I make with…" (`/pantry`).

Recipe data is **static JSON** served from `public/data/recipes/`. Pages load it through `src/lib/recipeData.ts` (`useRecipeIndex`, `useRecipe`), which fetches with `import.meta.env.BASE_URL` as prefix and caches results in memory for the session. There is no backend or API, all data lives in the `public/` directory.

- `public/data/recipes/index.json`: array of all recipe summaries
- `public/data/recipes/{slug}.json`: individual recipe detail
- `public/images/recipes/{slug}/cover.webp` + `web.webp` (photo) or `cover.svg` (illustration)
- `public/images/recipes/{slug}/source.*`: original recipe source (kept in the repo, excluded from `dist/` by a Vite plugin)

Recipe detail files also carry **step timers** (`steps[].timers`, minutes, base steps only: translated steps reuse them by position through `localizeRecipeDetail`) and **related recipes** (`related`, 3 to 4 slugs, candidates from `node scripts/suggest-related.mjs <slug>`). Both are maintained by the `add-recipe` skill and checked by `src/test/recipeValidation.test.ts`. Running timers live in a module-level store (`src/lib/timers.ts`, persisted in localStorage with their end time) and are shown in a floating tray on every page (`src/components/CookingTimers.tsx`).

Photos are served as WebP only: run `npm run images:webp -- <path>` after adding JPG/PNG images (converts, resizes and updates JSON references).

Home category covers (`public/images/categories/{name}.webp`, listed in `CATEGORY_IMAGES` in `HomePage.tsx` with their width) also have `{name}-640.webp` and `{name}-960.webp` variants for `srcset`: generate them when adding or replacing one.

### Share link previews

Crawlers (WhatsApp, Slack, Messenger, iMessage…) never run JS nor see the URL hash or the visitor's locale, so the share button hands out a static page per recipe and language instead of `#/recipe/{slug}`: `{base}r/{slug}/` (French), `r/{slug}/en/`, `r/{slug}/it/` (`src/lib/sharePath.ts`), picked from the current site language. At build time `scripts/vite-plugin-share-pages.ts` writes, for every recipe in `index.json` and every language in `src/i18n/languages.ts`, `dist/r/{slug}/[{lang}/]index.html` (translated title/description falling back to French, `og:locale` + `hreflang` alternates, rendered by `scripts/share-page.ts`) plus one 1200×630 JPEG `dist/r/{slug}/og.jpg` from the recipe photo; it also adds the tags to the home page (`dist/og.jpg`). The page then redirects with JS only, first storing the link's language for visitors with no language yet (an existing choice wins). Absolute URLs use `VITE_SITE_ORIGIN` (default `https://pierrickmartos.github.io`). In dev, `/r/{slug}/[{lang}/]` redirects to the recipe. Nothing to do when adding a recipe.

### Loading performance

Only the home and recipe pages are in the main bundle; the other pages are lazy-loaded and prefetched when the browser is idle. Vendor libraries are split into long-cached chunks (`vite.config.ts`). `index.html` preloads the JSON the landing route needs (`index.json` or the recipe detail) while the JS downloads. Google Fonts load without blocking the first paint. The search documents and the lexical index are loaded or built on idle or on the first search, not at startup.

### Search

Hybrid search, fully static (no backend), in `src/lib/search/` and exposed through the `useRecipeSearch` hook (used by `HomePage` and `RecipesPage`):

- **Query understanding** (`query.ts`): natural-language queries are parsed into terms and constraints. Filler words are dropped ("recettes qui proviennent de…"), origins map to cuisine tags ("Inde" → `indien`), dish families expand ("curry" → korma, tikka…), negations exclude ("sans porc") or map to diets ("sans viande" → `végétarien`, "sans gluten" stays a tag), and durations/difficulty become filters ("en moins de 30 minutes", "facile"). Cross-language aliases are also learnt from the position-aligned tag translations (`buildTagAliases`). The lexicon is maintained with the `search-lexicon` skill (called by `add-recipe`) and audited by `src/test/searchLexicon.test.ts` against the real recipes; natural-query regressions live in `src/test/searchRealData.test.ts`.
- **Lexical** (`lexical.ts`, `text.ts`): instant in-memory index over title (weight 3), tags (2), category incl. translated labels (2), ingredients (1.5) and description (1), with every language (fr/en/it) merged into each recipe document. Accent/ligature folding, light plural/feminine stemming, stopwords, prefix matching for the word being typed, typo tolerance and a few synonyms. Query terms are ANDed, but only when they characterise a recipe (title, tags, category, ingredients): words found only in descriptions or reached through a typo just boost the ranking.
- **Semantic** (`semantic.ts`, `semantic.worker.ts`): recipe embeddings are precomputed with `Xenova/multilingual-e5-small`; the browser embeds the query with the same model via `@huggingface/transformers` in a Web Worker, lazily on the first search (model downloaded once from the Hugging Face CDN, then cached; skipped when Save-Data is on). Results are merged with the lexical ones by reciprocal rank fusion. Semantic hits are only kept among recipes matching at least one query term (free only when no term matches), and every result goes through the query's tag rules (`TAG_RULES`: "hiver" rules out summer/cold dishes, "végétarien" requires the tag).
- Generated assets (git-ignored) in `public/data/search/`, built by `scripts/build-search-index.mjs`: `documents.json` (ingredients, rebuilt automatically by `predev`/`prebuild`) and `embeddings.json` (`npm run build:embeddings`, needs Hugging Face access, run in the deploy and PR preview workflows). Without `embeddings.json` the app silently falls back to lexical-only search.
- `.npmrc` skips the optional CUDA download of `onnxruntime-node` (only used by the embeddings script).

### What can I make with…

`/pantry` (`src/pages/PantryPage.tsx`, linked from the home page): the user ticks the ingredients they have and recipes are ranked by how many of them they use (or by fewest missing), with what is still missing. `src/lib/pantry.ts` holds a curated catalog (id, group, fr/en/it labels, English patterns) matched against each recipe's English ingredient lines from `documents.json` (longest pattern wins, "or" lines are alternatives, staples like salt/pepper/oil/water are ignored). `src/test/pantry.test.ts` fails when a real ingredient line is not recognised, so extend the catalog when adding recipes. The selection lives in the URL (`?have=eggs,flour`) and localStorage.

### Servings Scaling

The recipe page has a servings dropdown (`ServingsSelect`) that rescales ingredient quantities at display time with `scaleIngredient()` (`src/lib/scaleIngredient.ts`). Ingredients stay free-text strings and `servings` keeps the source's value: the leading quantity (integers, decimals, fractions, ranges) and later metric weights/volumes are parsed from the text, everything else is left as written. Steps are not scaled. `src/test/recipeValidation.test.ts` checks that each ingredient line scales the same way in FR, EN and IT; the `add-recipe` skill documents how to write scalable quantities.

### Cooking Mode

The recipe page's "Mode cuisine" button (and the step counter of the mobile step bar) opens `CookingMode` (`src/components/CookingMode.tsx`): a full-screen dialog showing one step at a time in big text, sharing `currentStep` with the page. Swipes, arrow keys (plus PageUp/PageDown for clickers, Home/End, Escape) move between steps; the step's timers are shown inline with `StepTimerButtons size="large"`. It can read each step aloud (reusing the page's speech synthesis, preference kept in localStorage), keeps the screen awake (`useWakeLock`, re-acquired when the page becomes visible again) and requests browser full screen when allowed. Optional voice commands (`useVoiceCommands`, Web Speech `SpeechRecognition`, Chrome/Edge/Safari) are parsed by `parseVoiceCommand` (`src/lib/voiceCommands.ts`): next / previous / repeat / timer / stop, in fr/en/it whatever the UI language, only for short utterances, and only "stop" while a step is being read aloud so the synthesized voice cannot trigger commands.

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
