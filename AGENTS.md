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

Recipe data is **static JSON** served from `public/data/recipes/`. Each page fetches data at runtime via `fetch()` using `import.meta.env.BASE_URL` as prefix. There is no backend or API — all data lives in the `public/` directory.

- `public/data/recipes/index.json` — array of all recipe summaries
- `public/data/recipes/{slug}.json` — individual recipe detail
- `public/images/recipes/{slug}/cover.svg` — SVG illustration per recipe

### Search

Fuzzy search uses **Fuse.js** on the client, configured in `RecipesPage.tsx`. Searches across title (weight 2), tags (1.5), description (1), and category (1) with threshold 0.4.

### Component Structure

- `src/components/ui/` — shadcn/ui-style primitives (button, card, input, sheet, badge, skeleton) using `class-variance-authority` + `tailwind-merge`
- `src/components/` — app components (Layout, RecipeCard, SearchBar, FilterDrawer)
- `src/pages/` — route-level page components
- `src/lib/utils.ts` — `cn()` utility for merging Tailwind classes

### Path Alias

`@/` maps to `./src/` (configured in both `tsconfig.app.json` and `vite.config.ts`).

### Types

Recipe types are in `src/types/recipe.ts`: `RecipeSummary` (listing) and `RecipeDetail` (full recipe with ingredients/steps). Difficulty values are Italian: `"Facile" | "Medio" | "Difficile"`.

### Testing

Vitest with jsdom environment, React Testing Library. Tests live in `src/test/`. Setup file imports `@testing-library/jest-dom/vitest` for DOM matchers.

### Deployment

GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on push to `main`.
