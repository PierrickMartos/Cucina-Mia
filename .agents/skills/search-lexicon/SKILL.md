---
name: search-lexicon
description: "Review and update the Cucina Mia search lexicon (src/lib/search/query.ts: filler words, cuisine/origin concepts, dish families, negations, difficulty words) so natural-language searches keep finding the right recipes. Use it after adding or editing recipes (the add-recipe skill calls it), when a search returns bad or missing results, when a new cuisine, dish family, tag or diet appears in the cookbook, or when the user asks to improve, audit or tune the search."
---

# Search Lexicon Review

The app parses natural-language queries before searching ("recettes qui proviennent de l'Inde avec poulet",
"dessert facile en moins de 30 minutes", "pâtes sans porc"). That understanding relies on a hand-maintained
lexicon in `src/lib/search/query.ts`. Every new recipe can introduce vocabulary the lexicon does not know
(a new cuisine, a dish family, a tag translated differently). This skill audits the lexicon against the real
recipes, updates it, and locks the result with regression tests.

## How search understands a query (what you are maintaining)

| Lexicon entry | Role | Example |
|---|---|---|
| `FILLERS` | Words dropped from the query (sentence glue, fr/en/it) | "recettes **qui proviennent** de…", "**je veux** quelque chose", "**food**" |
| `CONCEPTS` | A query word also matches corpus words | `inde → indien`, `curry → korma, tikka, paneng`, `porc → jambon, lardon, guanciale…` |
| `POSITIVE_WITHOUT` | After "sans/no/senza", these stay positive tags instead of exclusions | "sans gluten", "no-cook", "senza lattosio" |
| `MEATLESS` | "sans viande" → vegetarian | |
| `DIFFICULTY_WORDS` | Words turned into a difficulty filter | "facile", "easy", "difficile" |
| `TAG_RULES` | Tags a query word rules out or requires, on **every** result (semantic ones included) | `hiver → avoid été, froid`, `végétarien → require végétarien` |
| `WITHOUT_TAGS` | The `sans-xxx` tag a "sans xxx" query requires | `gluten → sans-gluten` |
| `DURATION` regex | "en moins de 30 minutes", "1h30", "under 20 min" → time filter | |

Things you do **not** maintain by hand:
- Cross-language tag aliases (`quick`/`veloce` → `rapide`) are learnt automatically from tag translations,
  **as long as `translations.{en,it}.tags` are aligned position by position with the French `tags`.**
- Accents, plurals, feminine forms and typos are handled by `src/lib/search/text.ts` and `lexical.ts`.
- Meaning-level similarity is handled by the semantic layer (embeddings, rebuilt in CI).

Keep entries as **normalised words**: lowercase, no accents, `œ` → `oe` (e.g. `thailande`, `coree`, `boeuf`).
Keys and targets are stemmed automatically, so write the plain word (`indien`, not `indi`).

## Step 1: Run the audit

```bash
npx vitest run src/test/searchLexicon.test.ts
```

Hard checks (must pass):
1. **Tag alignment**: every `translations.{en,it}.tags` has the same length and order as the French `tags`.
2. **No swallowed tag**: no tag is entirely made of filler words (it would be unsearchable).
3. **Every recipe is found by each of its tags**, in fr, en and it.
4. **Every recipe is found by its title** (top 5), in fr, en and it.

It also prints a `── Search lexicon report ──` to review:
- *Concept targets not found in the corpus*: a typo in the lexicon, or a word kept for future recipes (fine for
  genuine dish names, e.g. `vindaloo`).
- *Tags without a concept pointing to them, possibly origins/cuisines*: a regional or national tag (`milanais`,
  `libanais`, `mexicain`…) needs the place names that lead to it (fr/en/it). Non-origin adjectives listed there
  (`économique`, `classique`, `technique`) need nothing.
- *Filler/difficulty words also used in titles or tags*: check each one is still noise in a query. If a filler
  became meaningful (a recipe titled "Tout chocolat"), consider removing it from `FILLERS`.

## Step 2: Review the new or changed recipes

When called from `add-recipe`, focus on the recipe just added (`public/data/recipes/{slug}.json`), otherwise on
the whole cookbook. For each recipe, ask:

1. **Cuisine / origin**: does it belong to a cuisine or region? Its French tag must exist (`indien`, `thaï`,
   `libanais`…) and `CONCEPTS` must map the place names in fr/en/it to it:
   `liban: ["libanais"], lebanon: ["libanais"], libano: ["libanais"], lebanese: ["libanais"]`.
   If the cuisine belongs to a broader one, add it to the umbrella concept too (e.g. a Korean dish → `asie`).
2. **Dish family**: is it a kind of dish people search by family name? ("curry", "gratin", "soupe", "tarte",
   "pâtes", "risotto"…). If some members of the family do not carry the family word in their title or tags,
   add them to the family concept: `curry: ["curry", "korma", "tikka", "paneng", "vindaloo"]`. Only add words
   that really designate that family (garam masala in a biryani does not make it a curry).
3. **Ingredient groups**: does it use an ingredient that a group word should cover? (`porc` → `guanciale`,
   `fromage` → `burrata`, `viande` → `veau`, `poisson` → `cabillaud`…). These groups power both positive queries
   and exclusions ("sans porc").
4. **Diets and "sans" tags**: a new `sans-xxx` / `no-xxx` tag means `xxx` (and its en/it translations) must be in
   `POSITIVE_WITHOUT` and `WITHOUT_TAGS`, otherwise "sans xxx" becomes an exclusion.
5. **Contradictions**: the semantic layer does not understand opposites (it may suggest a cold summer gaspacho for
   "réconfortant pour l'hiver"). When a tag has an opposite (seasons, hot/cold) or a diet must hold strictly,
   add it to `TAG_RULES` in fr/en/it. Only add rules that are always true: "hiver" never wants a summer dish,
   but "léger" does not rule out "réconfortant".
6. **Natural queries**: write 2-3 queries a real user would type to find this recipe (in French first, then one
   in English or Italian), e.g. for a Lebanese chicken shawarma: "plat libanais au poulet",
   "lebanese street food", "recette du moyen-orient". Probe them:
   ```bash
   SEARCH_PROBE="plat libanais au poulet;lebanese street food" npx vitest run src/test/searchLexicon.test.ts
   ```
   The output shows how each query was parsed and the lexical results. To check what the semantic layer may
   add, use `search(query, semanticSlugs)` from `src/test/helpers/realSearch.ts` in a test: semantic hits are
   only kept among recipes matching part of the query, then filtered by `TAG_RULES`. The recipe should appear, and unrelated
   recipes should not. If a word is lost or misread, fix the lexicon. If the query needs meaning rather than
   vocabulary ("quelque chose de réconfortant"), leave it to the semantic layer: do not stuff the lexicon.

## Step 3: Update the lexicon

Edit `src/lib/search/query.ts` with the smallest change that fixes what Step 2 found:
- Prefer adding a `CONCEPTS` entry over adding tags to many recipes.
- Always cover **fr, en and it** for a new concept (keys are what users type, targets are the French tags or
  corpus words).
- Never add a word to `FILLERS` if it is a tag or a meaningful title word (the audit catches tags, not titles).
- Do not add broad expansions that would drown results (e.g. `plat → everything`). A concept should keep
  results coherent: probe before and after.

If a hard check fails because of recipe data (misaligned tag translations, a tag that is only a filler word),
fix the recipe JSON **and** the matching entry in `public/data/recipes/index.json`, not the audit.

## Step 4: Lock it with regression tests

Add the meaningful queries from Step 2 to `src/test/searchRealData.test.ts`, asserting on properties rather
than exact lists, so that future recipes do not break them:

```ts
it("understands 'plat libanais au poulet'", () => {
  const results = search("plat libanais au poulet")
  expect(results).toContain("chawarma-de-poulet")
  for (const slug of results) expect(byslug.get(slug)!.tags).toContain("libanais")
})
```

## Step 5: Verify

```bash
npx vitest run src/test/searchLexicon.test.ts src/test/searchRealData.test.ts src/test/search.test.ts
npx tsc -b && npm run lint
```

All must pass before committing.

## Step 6: Report

Summarise in a few lines (and in the PR body when called from `add-recipe`, under a `## Search` section):
- Lexicon entries added or changed (e.g. `+ liban/lebanon/libano → libanais`, `+ curry family: dal`)
- Probe queries tried and whether the recipe is found
- Regression tests added
- Remaining report items deliberately left as is, and why

If nothing needed to change, say so explicitly: "Search lexicon: no change needed (audit clean, probes OK)".
