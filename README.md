# Cucina Mia

A big thank you to [@rouliane](https://github.com/rouliane) for the spark of inspiration next to the coffee machine — all credits go to him.

---

## The idea

My wife and I have recipes everywhere — bookmarked tabs, dog-eared notebooks, screenshots, voice memos from grandma. We needed one cozy place to gather them all.

Cucina Mia is that place. A warm, simple website where we can easily find the recipes we've collected over the years: the ones from our grandmothers and grandfathers, our mothers and fathers, our friends, and everything we've stumbled upon across the internet and beyond. No ads, no popups, no accounts. Just the recipes.

---

*Benvenuti nella mia cucina, buon appetito.*

---

<details>
<summary>Tech details</summary>

Built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS v4**. Deployed to GitHub Pages.

- Routing via `react-router-dom` with `HashRouter` for GitHub Pages compatibility
- Recipe data is static JSON served from `public/data/recipes/`
- Fuzzy search with **Fuse.js**
- Animations with **Motion**
- UI primitives from **shadcn/ui** (`class-variance-authority` + `tailwind-merge`)
- i18n in French, English and Italian
- Recipe photos from [Pixabay](https://pixabay.com)

```bash
npm run dev      # dev server
npm run build    # production build
npm run test     # run tests
npm run lint     # lint
```

</details>
