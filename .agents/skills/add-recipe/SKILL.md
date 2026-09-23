---
name: add-recipe
description: "Add a new recipe to the Cucina Mia cookbook app from a GitHub issue. Use this skill whenever the user asks to add a recipe, process a recipe submission issue, handle a recipe-submission labeled GitHub issue, or extract a recipe from an uploaded file/document/image. Also use it when the user pastes recipe content and wants it added to the app, or references a GitHub issue number that contains a recipe."
---

# Add Recipe to Cucina Mia

This skill processes recipe submissions and adds them to the Cucina Mia cookbook app. It handles three types of input:
- **Structured issues** from the `recipe-submission.yml` GitHub template (form with all fields)
- **Unstructured file issues** from the `recipe-submission-file.yml` template (uploaded file + recipe name)
- **Unstructured URL issues** from the `recipe-submission-url.yml` template (webpage URL + recipe name)

Each recipe needs: a detail JSON file, an entry in the index, an SVG cover illustration, and translations in French (base), English, and Italian. The detail JSON also carries **step timers** (Step 4b) and **related recipes** (Step 4c).

The recipe page has a **servings dropdown** that rescales the ingredient quantities in the browser (`src/lib/scaleIngredient.ts`). Ingredients stay plain strings, so the only requirements are a correct `servings` value and quantities written the way the scaler reads them, see **Ingredient Quantities & Servings** below.

## Step 1: Fetch and Classify the Issue

If given a GitHub issue number, fetch it:
```bash
gh issue view <number> --json title,body,labels
```

Classify based on labels and body content:
- **Structured**: has `recipe-submission` label but NOT `needs-formatting`. Body has form sections like `### Recipe Title`, `### Slug`, `### Category`, etc.
- **Unstructured (file)**: has both `recipe-submission` and `needs-formatting` labels. Body has `### Recipe Name`, `### Recipe File` (uploaded file URL), optional `### Servings (optional)`, `### Recipe Image` and `### Notes`.
- **Unstructured (URL)**: has both `recipe-submission` and `needs-formatting` labels. Body has `### Recipe Name`, `### Recipe URL` (webpage link), optional `### Servings (optional)`, `### Recipe Image` and `### Notes`.

If the user provides recipe content directly (not via issue), treat it as unstructured input and extract the data.

## Step 2: Extract Recipe Data

> ⚠️ For **structured issues**, do NOT use the Agent tool, parse the form fields directly.
> ⚠️ For **unstructured file/URL issues**, you MUST use the parallel 3-agent extraction described below.

### Storing the Original Source

Every recipe must preserve its original source material in the `originalSource` field. This field has two properties:
- `type`: one of `"pdf"`, `"image"`, or `"text"`
- `data`: the source content or path to the source file

**Rules by source type:**

| Source type | `type` value | `data` value |
|---|---|---|
| Plain text (structured issue body, pasted text) | `"text"` | The original recipe text as submitted (before translation/transformation). Include the raw content from the issue body or pasted text. |
| URL (recipe from a webpage) | `"url"` | The original URL of the recipe webpage (e.g., `https://example.com/recipe/tiramisu`) |
| Uploaded image file (photo of handwritten recipe, screenshot, etc.) | `"image"` | Relative path to the source file stored with recipe assets: `images/recipes/{slug}/source.{ext}` (e.g., `source.jpg`, `source.png`) |
| Uploaded PDF file | `"pdf"` | Relative path to the source file stored with recipe assets: `images/recipes/{slug}/source.pdf` |

**For file sources (image/PDF):**
1. Download the file from the issue attachment URL
2. Save it to `public/images/recipes/{slug}/source.{ext}` (preserve the original extension, do NOT convert it to WebP: source files are kept as-is in the repo and are automatically excluded from the deployed build)
3. Set `data` to the relative path: `images/recipes/{slug}/source.{ext}`

**For text sources:**
- From structured issues: store the full issue body (the recipe section content as submitted)
- From URL issues: store the extracted recipe text from the webpage
- From direct user input: store the original text as provided

**For URL sources:** use `"url"` type with the original webpage URL as `data`.

Place `originalSource` in the detail JSON right after `source` (before `translations`).

### From Structured Issues

Parse the issue body. Each field appears as `### Field Name` followed by the value. Extract and transform:

| Issue Field | JSON Field | Transform |
|---|---|---|
| Recipe Title | `title` | As-is |
| Slug | `slug` | Validate: lowercase, hyphens only |
| Description | `description` | 1-2 sentences |
| Category | `category` | One of: Antipasti, Pasta, Gnocchi, Risotto, Secondi, Dolci, Pizze, Pane, Bambini, Breakfast, Brunch. **Rules**: Pasta = only pasta/noodles/ravioli dishes. Gnocchi = gnocchi-based dishes only. Risotto = rice risotto and "façon risotto" dishes. Secondi = all other mains (meat, fish, poultry, eggs). |
| Difficulty | `difficulty` | One of: Facile, Medio, Difficile |
| Prep Time (minutes) | `prepTime` | Integer |
| Cook Time (minutes) | `cookTime` | Integer |
| Servings | `servings` | Integer, the number of portions (or pieces) the ingredient quantities are written for. Keep the submitted value, never normalize it to 4 |
| Tags | `tags` | Split on commas, trim, lowercase French array, see Tag Strategy below |
| Ingredients | `ingredients` | See below |
| Steps | `steps` | One per line -> `{"text": "..."}`, plus `timers` when the step has a duration (see Step 4b) |
| Tips | `tips` | One per line, omit field if empty |
| History | `history` | Optional anecdote or story about the recipe, omit field if empty |
| Source | `source` | Omit field if empty |
| Cover Image | (for images) | If present, download and use as recipe cover |

**Tag Strategy:**

Tags are always in **French** in the base JSON (and translated into EN/IT in the translations block). Aim for 5-15 tags per recipe chosen from the discovery dimensions below. Pick only tags that genuinely apply.

| Dimension | French examples |
|---|---|
| Cooking method | `four`, `vapeur`, `poêle`, `plancha`, `wok`, `grillé`, `friture`, `cru`, `no-cuisson`, `mijoté`, `bain-marie` |
| Season / occasion | `printemps`, `été`, `automne`, `hiver`, `noël`, `pâques`, `apéro`, `fête`, `pique-nique`, `anniversaire`, `brunch`, `buffet` |
| Diet / lifestyle | `végétarien`, `végétalien`, `sans-gluten`, `sans-lactose`, `léger`, `protéiné`, `riche-en-fibres`, `faible-calories`, `sans-sucre`, `équilibré` |
| Ease of eating | `finger-food`, `à-la-cuillère`, `à-partager`, `en-verrines`, `en-sandwich` |
| Audience | `enfants`, `toute-la-famille`, `adultes`, `bébés` |
| Effort | `rapide`, `facile`, `économique`, `batch-cooking`, `préparation-à-lavance`, `5-ingrédients`, `one-pot` |
| Texture / format | `croustillant`, `moelleux`, `fondant`, `croquant`, `onctueux` |
| Meal type | `petit-déjeuner`, `goûter`, `entrée`, `plat-principal`, `dessert`, `snack` |
| Cuisine origin | `italien`, `français`, `asiatique`, `méditerranéen`, `mexicain`, `japonais`, `indien`, `espagnol`, `américain` |
| Main ingredient | `poulet`, `bœuf`, `porc`, `poisson`, `fruits-de-mer`, `pâtes`, `riz`, `œufs`, `légumes`, `fromage`, `chocolat`, `fruits` |
| Mood / vibe | `réconfortant`, `festif`, `romantique`, `convivial`, `nostalgique`, `léger`, `gourmand` |
| Served temperature | `chaud`, `froid`, `glacé`, `tiède` |
| Practical life | `se-congèle`, `restes-bienvenus`, `meal-prep` |
| Allergen-aware | `sans-noix`, `sans-œufs`, `sans-porc`, `halal`, `casher` |
| Flavor profile | `sucré-salé`, `épicé`, `acidulé`, `doux`, `umami`, `herbacé` |
| Equipment required | `thermomix`, `robot-pâtissier`, `mixeur-plongeant`, `cocotte-minute`, `sans-équipement-spécial` |

Single lowercase words or hyphenated compounds only. No accents in tag slugs (use `no-cuisson` not `no-cuisson`, keep accents where natural, e.g. `léger` is fine).

**Ingredient parsing:**
- Lines starting with `## ` begin a new group: `{"group": "Group Name", "items": [...]}`
- Lines without a group header go in a single object without the `group` field
- Empty lines are skipped
- When an ingredient contains pecorino, parmesan/parmigiano, or olive oil (in any language), append `(Quanto basta)` after the ingredient text. Example: `"50 g de pecorino râpé (Quanto basta)"`
- Rewrite each line so its quantity comes first, see **Ingredient Quantities & Servings** below

### Ingredient Quantities & Servings

Visitors pick the number of servings in a dropdown and every ingredient quantity is multiplied by `chosen / servings` at display time. The scaler reads free text, so write quantities in a form it understands:

**What gets scaled:**
- The quantity at the **start** of the line, optionally after `environ`/`about`/`circa`/`da`: `4 œufs`, `200 g de farine`, `680g de courge`, `1,5 l de bouillon`, `1/2 citron`, `1 1/2 c. à soupe`, `½ ananas`
- Both ends of a range: `6 à 8 feuilles`, `3-4 cucchiai`, `2 ou 3 tomates`, `1/2 to 1 tsp`
- Metric weights/volumes later in the line (`kg`, `g`, `mg`, `l`, `dl`, `cl`, `ml`): `1 filet mignon (environ 600 g)`, `½ mangue (200 g)`, `200 g de sucre + 125 g pour le caramel`
- A head count: `Gnocchi pour 2 personnes`

**What is left as written:** lines without a leading number (`Sel et poivre`, `Quelques feuilles de menthe`, `Huile d'olive (Quanto basta)`), lengths (`5 cm`, `5 mm`), percentages, flour types (`T55`), per-unit amounts (`2 g each`, `2 g chacune`) and per-person notes (`1 par personne`).

**Rules when writing ingredients (base AND translations):**
1. **Quantity first, in digits**: `1 citron vert (jus)`, not `Jus d'1 citron vert`; `2 œufs`, not `deux œufs`; `1 grosse pincée de sel`, not `Une grosse pincée de sel`; `1 morceau de gingembre (5 cm)`, not `5 cm de gingembre`
2. **Same structure in every language**: if the French line starts with a quantity, the EN and IT lines at the same position must too (`1 large pinch of onion powder`, not `A large pinch of onion powder`). `npm run validate:recipes` fails otherwise
3. **Fractions** as `1/2`, `1 1/2` or `½`; decimals with a comma in FR/IT (`1,5`) and a dot in EN (`1.5`)
4. **Ranges** with `à` (FR), `-` (IT) or `to` (EN), and the unit after the second number: `100 à 150 g`
5. **Keep the metric equivalent** in parentheses when the source gives one: `2 aubergines (environ 500 g)`
6. **Non-scalable amounts** (salt, garnish, oil for the pan) have no leading number: `Sel`, `Beurre pour le moule`
7. Do not put quantities in the steps when they already appear in the ingredients: steps are not scaled (the page says so when scaled)

**Servings value:**
- Use the number stated by the source (`pour 6 personnes`, `serves 2`, `per 4 persone`)
- For recipes that make pieces (cookies, naans, crêpes, cannelés), use the number of pieces when the source gives it (`12` for "12 cookies") rather than guessing a number of people
- Only when the source says nothing, estimate it from the quantities (~100 g of dry pasta, ~150 g of meat per person) and mention it as inferred in the report; `4` is the last-resort default
- Never change the quantities to fit a different number of servings: keep the source's quantities and its servings together

### From Unstructured File Issues

1. Extract the recipe name from `### Recipe Name`
2. Download/read the file from `### Recipe File` (image URL, PDF, etc.)
   - For images: read directly (Claude can process images)
   - For PDFs/docs: download via WebFetch
3. **Save the original source file** to `public/images/recipes/{slug}/source.{ext}` (preserve the original file extension). This will be referenced in `originalSource.data`.
4. Check `### Recipe Image` for an optional cover photo
5. Read `### Servings (optional)`: when filled, it is the number of servings the submitter confirms for the quantities and takes precedence over the extraction
6. Read any `### Notes` for context (origin, variations, tips)
7. **Run Parallel 3-Agent Extraction** (see below) on the file content
8. Generate the slug from the recipe title: lowercase, replace spaces with hyphens, remove accents, keep only `[a-z0-9-]`
9. Infer missing fields with reasonable defaults:
   - `difficulty`: estimate from technique complexity
   - `prepTime`/`cookTime`: estimate from recipe
   - `servings`: from the source, see **Servings value** above (default 4 only as a last resort)
   - `category`: infer from dish type
   - `tags`: 5-15 relevant French tags, see **Tag Strategy** above

### From Unstructured URL Issues

1. Extract the recipe name from `### Recipe Name`
2. Fetch the webpage from `### Recipe URL` using WebFetch
3. Check `### Recipe Image` for an optional cover photo
4. Read `### Servings (optional)`: when filled, it is the number of servings the submitter confirms for the quantities and takes precedence over the extraction
5. Read any `### Notes` for context (origin, variations, tips)
6. **Run Parallel 3-Agent Extraction** (see below) on the fetched page content
7. Generate the slug from the recipe title: lowercase, replace spaces with hyphens, remove accents, keep only `[a-z0-9-]`
8. Infer missing fields with reasonable defaults:
   - `difficulty`: estimate from technique complexity
   - `prepTime`/`cookTime`: estimate from recipe or page metadata (schema.org `recipeYield` gives the servings)
   - `servings`: from the source, see **Servings value** above (default 4 only as a last resort)
   - `category`: infer from dish type
   - `tags`: 5-15 relevant French tags, see **Tag Strategy** above

### Parallel 3-Agent Extraction (for unstructured file and URL issues)

When extracting a recipe from an unstructured source (uploaded file, image, or URL), launch **3 agents in parallel** using the Agent tool. Each agent independently extracts the full recipe data from the same source material. This redundancy catches OCR errors, misreadings, and interpretation differences.

**How to launch the 3 agents:**

Use a single message with 3 Agent tool calls. Each agent receives the same prompt with the source content (file path, image, or fetched webpage text) and must return a JSON object with these fields:

```
{
  "title": "...",
  "description": "...",
  "ingredients": [{"group": "optional", "items": ["..."]}],
  "steps": [{"text": "..."}],
  "tips": ["..."],
  "prepTime": number,
  "cookTime": number,
  "servings": number,
  "difficulty": "Facile|Medio|Difficile",
  "category": "...",
  "source": "..."
}
```

**Agent prompt template** (adapt the source reference for file vs URL):

> Extract the complete recipe from the following source material. Return ONLY a JSON object with these fields: title, description, ingredients (array of {group?, items[]}), steps (array of {text}), tips (array of strings, omit if none), prepTime (minutes, integer), cookTime (minutes, integer), servings (integer, the number of portions or pieces the quantities are for, as stated by the source), difficulty (Facile/Medio/Difficile), category, source. Extract every ingredient and every step, do not summarize or skip. Write each ingredient with its quantity first, in digits (e.g. "2 eggs", "200 g flour", "1 lime (juice)"), keeping the source's amounts unchanged. All text should be in the original language of the source. If any field is ambiguous, use your best judgment.
>
> Source: [insert file content, image path to read, or fetched URL text]

**Important:** All 3 agents MUST be launched in the same message (parallel tool calls), not sequentially.

### Consensus Assessment (Step 2b)

After all 3 agents return their results, compare them to build a consensus recipe:

1. **Ingredients comparison**: Compare ingredient lists across all 3 extractions.
   - Normalize for minor wording differences (e.g., "200g butter" vs "200 g of butter" are equivalent)
   - Flag ingredients that appear in only 1 or 2 of the 3 extractions
   - Flag ingredients where quantities differ across extractions (e.g., "100g" vs "150g")

2. **Steps comparison**: Compare step lists across all 3 extractions.
   - Flag steps that appear in only 1 or 2 of the 3 extractions
   - Flag steps where the order differs significantly
   - Flag steps where key details differ (temperatures, times, techniques)

3. **Metadata comparison**: Compare title, prepTime, cookTime, servings, difficulty.
   - Use majority rule (2-of-3 agreement) for each field
   - Flag fields where all 3 disagree

4. **Build the consensus recipe**:
   - For each field, use the value that at least 2 agents agree on
   - If all 3 disagree on a field, use the value from Agent 1 but flag it as uncertain
   - For ingredients and steps: use the most complete list (longest) as the base, but flag any items not confirmed by at least 2 agents

5. **Generate a discrepancy report** (used in Step 10 and PR comments):
   - List every discrepancy found, grouped by category:
     - `🔴 High confidence issue`: all 3 agents disagree on an ingredient quantity or a step detail
     - `🟡 Medium confidence issue`: 2 agents agree but 1 differs
     - `🟢 Minor variation`: wording differences only, no semantic impact
   - Include the specific values from each agent for each discrepancy
   - If there are **zero discrepancies**, note: "All 3 extraction agents produced consistent results, high confidence extraction."

**If any `🔴 High confidence issues` are found**, print a warning to the user in the terminal output:

```
⚠️  EXTRACTION DISCREPANCIES DETECTED
The 3 parallel extraction agents disagreed on the following:
[list discrepancies]
The consensus values were used, but please review the flagged items.
```

### LLM-as-a-Judge Validation (Step 2c)

After building the consensus recipe, launch a **single judge agent** that independently validates the consensus against the original source material. The judge catches **systematic errors**, mistakes all 3 extraction agents made identically (e.g., misreading a handwritten "6" as "0", confusing "tbsp" with "tsp", skipping a faded line).

**When to run the judge:** Always run it for unstructured file/URL extractions. Skip it for structured issues (form data doesn't need re-verification).

**Launch the judge agent** using the Agent tool with this prompt template:

> You are a recipe extraction judge. Your job is to verify the accuracy of an extracted recipe by comparing it against the original source material.
>
> ## Original Source
> [Insert the original file content, image path to read, or fetched URL text, the same source given to the 3 extraction agents]
>
> ## Consensus Recipe (from 3-agent extraction)
> [Insert the consensus JSON built in Step 2b]
>
> ## Discrepancy Report
> [Insert the discrepancy report from Step 2b, or "None, all 3 agents agreed" if clean]
>
> ## Your Task
>
> Re-read the original source carefully and verify EVERY field in the consensus recipe. Focus especially on these common failure modes:
>
> 1. **Quantities & units**: Check every ingredient quantity against the source. Common errors: confusing g/kg, ml/L, tsp/tbsp, misreading handwritten numbers (6↔0, 1↔7, 5↔8), dropping a digit (150g→15g)
> 2. **Temperatures**: Verify oven temps, cooking temps. Common errors: °C↔°F confusion, misread digits
> 3. **Times**: Verify prep/cook times and any times mentioned in steps. Common errors: minutes↔hours, misread digits
> 4. **Completeness**: Verify that NO ingredients or steps were omitted. Re-read the source line by line and check each item is present in the consensus
> 5. **Ingredient names**: Verify correct identification, especially for similar items (e.g., baking soda vs baking powder, cream vs crème fraîche, stock vs broth)
> 6. **Step ordering**: Verify the steps follow the correct sequence from the source
> 7. **Servings**: Verify the serving count matches the source (people or pieces), and that the quantities were not rescaled to another number of servings
>
> Return a JSON object with this structure:
> ```json
> {
>   "verdict": "PASS" | "FAIL",
>   "confidence": 1-10,
>   "corrections": [
>     {
>       "field": "ingredients[0].items[2]" | "steps[3].text" | "prepTime" | etc.,
>       "consensus_value": "what the consensus says",
>       "correct_value": "what the source actually says",
>       "severity": "critical" | "minor",
>       "reasoning": "brief explanation of the error"
>     }
>   ],
>   "missing_items": [
>     {
>       "type": "ingredient" | "step" | "tip",
>       "value": "the missing item text from the source",
>       "insert_after": "field reference for where it should go",
>       "reasoning": "why it was likely missed"
>     }
>   ],
>   "notes": "any general observations about extraction quality"
> }
> ```
>
> If everything is correct, return `"verdict": "PASS"` with an empty `corrections` array.
> Only flag real errors you can verify against the source, do NOT speculate or add items not in the source.

**Processing the judge's response:**

1. **If `verdict` is `PASS`**: No changes needed. Record judge confidence score in the report.

2. **If `verdict` is `FAIL`**: Apply corrections to the consensus recipe:
   - For each item in `corrections`: replace the consensus value with `correct_value`
   - For each item in `missing_items`: insert the missing ingredient/step/tip at the indicated position
   - Only apply corrections with `severity: "critical"` automatically. For `minor` corrections, apply them but note in the report that they were minor judge adjustments.

3. **Update the discrepancy report** with a new section:
   ```
   ### 🧑‍⚖️ Judge Validation
   - Verdict: PASS/FAIL
   - Confidence: X/10
   - Corrections applied: N (list them)
   - Missing items added: N (list them)
   ```

4. **If the judge finds corrections**, print to the terminal:
   ```
   🧑‍⚖️ JUDGE CORRECTIONS APPLIED
   The judge agent found N issue(s) missed by all 3 extraction agents:
   [list corrections]
   These have been corrected in the final recipe.
   ```

**Important constraints:**
- The judge MUST read the original source material directly (not rely on the extraction agents' interpretations)
- The judge should be conservative, only flag clear, verifiable errors, not subjective improvements
- If the judge's corrections contradict the 3-agent consensus AND the source is ambiguous, prefer the consensus (majority rules unless the judge has clear evidence)

## Step 3: Translate

The base language is **French**. All top-level text fields (description, ingredients, steps, tips) must be in French. Then provide translations for English (`en`) and Italian (`it`).

Whatever language the source content is in, translate it to all three languages. The recipe `title` must also be translated, use the natural name in the target language (e.g. "Gâteau de Savoie" → "Torta di Savoia" in Italian, kept as-is in English since it has no common equivalent).

### Detail JSON translations structure
```json
"translations": {
  "en": {
    "title": "English title",
    "description": "English description",
    "tags": ["oven", "winter", "kids", "easy"],
    "ingredients": [{"items": ["ingredient in English"]}],
    "steps": [{"text": "Step in English"}],
    "tips": ["Tip in English"],
    "history": "History in English"
  },
  "it": {
    "title": "Italian title",
    "description": "Italian description",
    "tags": ["forno", "inverno", "bambini", "facile"],
    "ingredients": [{"items": ["ingredient in Italian"]}],
    "steps": [{"text": "Step in Italian"}],
    "tips": ["Tip in Italian"],
    "history": "History in Italian"
  }
}
```

### Index JSON translations structure (title + description + tags)
```json
"translations": {
  "en": { "title": "English title", "description": "English description", "tags": ["oven", "winter", "kids"] },
  "it": { "title": "Italian title", "description": "Italian description", "tags": ["forno", "inverno", "bambini"] }
}
```

Important: ingredient group names (if any) should also be translated within the translations object. The `group` field in translated ingredients should be in the target language.

Keep ingredient quantities identical and **at the start of the line** in every language (same position, same numbers): `"1 citron vert (jus)"` → `"1 lime (juice)"` → `"1 lime (succo)"`, not `"Juice of 1 lime"`. Only the decimal separator changes (`1,5` in FR/IT, `1.5` in EN). See **Ingredient Quantities & Servings**.

## Step 4: Validate

Before writing files, check:

1. **Slug**: matches `/^[a-z0-9]+(-[a-z0-9]+)*$/`, no consecutive hyphens, no leading/trailing hyphens
2. **No duplicate**: `public/data/recipes/{slug}.json` must NOT already exist. Check with:
   ```bash
   grep -q '"slug": "{slug}"' public/data/recipes/index.json && echo "EXISTS"
   ```
   Stop and report if it does.
3. **Required fields**: slug, title, description, prepTime, cookTime, servings, difficulty, category, tags (non-empty), ingredients (at least one item), steps (at least one)
4. **Enums**: difficulty is "Facile"|"Medio"|"Difficile"; category is a known value
5. **Numbers**: prepTime, cookTime are non-negative integers; servings is a positive integer matching the source (see **Servings value**)
6. **Scalable quantities**: every ingredient with an amount starts with it, in digits, in FR, EN and IT alike (see **Ingredient Quantities & Servings**)
7. **Translations**: both `en` and `it` translations are present with title, description, tags, ingredients, steps, tips (if tips exist in base), and history (if history exists in base)

## Step 4b: Add Step Timers

Every step that tells the cook to wait for a duration gets a `timers` array: one number per duration, **in minutes**, in the order they appear in the text. The recipe page turns each one into a tap-to-start countdown button (with an alarm), so timers must match the step text exactly.

```json
{ "text": "Plonger les œufs 5 min, puis 1 min dans l'eau froide.", "timers": [5, 1] }
```

Rules:
- **Minutes**, decimals allowed for seconds: `30 secondes` -> `0.5`, `5 min 30` -> `5.5`, `2 minutes 20` -> `2.33`. Hours are converted: `1 h 30` -> `90`, `12 heures` -> `720`.
- **Ranges use the lower bound** (the cook checks doneness, then adds time from the timer): `20 à 25 minutes` -> `20`.
- Durations in words count too: `une quinzaine de minutes` -> `15`, `une demi-heure` -> `30`, `une minute` -> `1`.
- Include cooking, simmering, baking, resting, soaking, marinating, rising, kneading and whisking durations, long ones included (marinade `6 heures` -> `360`).
- **No timer** for relative or vague durations: `5 minutes avant la fin`, `2 minutes de moins que le paquet`, `selon le temps indiqué`, `quelques minutes`, `idéalement 24 h` (only the minimum `au moins 6 heures` gets one).
- `3 minutes par face` / `2 minutes de chaque côté` -> one timer (`[3]`), the cook restarts it for the other side.
- Omit `timers` on steps without a duration (no empty array). Values must be > 0 and ≤ 2880 (48 h).
- Only on the **base (French) steps**. Translated steps keep `{"text": "..."}` only: they reuse the base timers by position, so every translation must have exactly the same number of steps as the base.

`npm run validate:recipes` rejects timers in translations, misaligned translated steps and timers on a step whose text has no duration.

## Step 4c: Pick Related Recipes

Every recipe lists 3 to 4 similar recipes in `related` (slugs), shown as "Vous aimerez aussi" cards at the end of the recipe page.

1. Get ranked candidates (shared tags and ingredients weighted by rarity, same category, sweet/savoury penalty). Run it **after** writing the detail JSON (Step 5), then add `related` to the file:
   ```bash
   node scripts/suggest-related.mjs {slug}
   ```
2. Pick 4 slugs by judgment, not blindly the top of the list. Prefer, in this order: the same dish family or technique (other curries, risottos, gnocchi, crêpes/gaufres/pancakes), the same cuisine, the same main ingredient, the same meal moment (brunch, apéro, dessert). Never mix sweet and savoury, and avoid four near-duplicates when a varied pick is as relevant.
3. Place `related` in the detail JSON right before `translations`, one slug per line:
   ```json
   "related": [
     "pasta-amatriciana",
     "spaghettis-alla-vittorio",
     "pates-chevre-speck-et-huile-de-truffe",
     "fettuccine-funghi-porcini"
   ],
   ```
4. **Link back from existing recipes**: check the new recipe's strongest matches (`node scripts/suggest-related.mjs <other-slug>` shows their current list). When the new recipe is a clearly better match than the weakest entry of 1 to 3 of them, replace that entry, keeping every list at 3 to 4 slugs. A new recipe should be linked from at least one existing recipe so it can be discovered.

`npm run validate:recipes` checks that every recipe has 3 to 4 related slugs, all existing, without duplicates or self-reference.

## Step 5: Write the Recipe Detail JSON

Create `public/data/recipes/{slug}.json` following the exact structure of existing recipes. Reference `public/data/recipes/pasta-carbonara.json` for format.

Key rules:
- `images` is an object with two keys:
  ```json
  "images": {
    "cover": "images/recipes/{slug}/cover.webp",
    "web": "images/recipes/{slug}/web.webp"
  }
  ```
  Use `.webp` extension when the image comes from Unsplash, Pixabay or an uploaded photo (photos are converted to WebP in Step 7). Use `.svg` only if an SVG illustration was generated. Never reference `.jpg`/`.png` cover or web images.
- When the image comes from Unsplash, add an `imageCredit` object immediately after `images`, be careful to not rename keys:
  ```json
  "imageCredit": {
    "author": "Photographer Name",
    "url": "https://unsplash.com/@username"
  }
  ```
  Use `user.name` from the Unsplash hit for `author`, and `user.links.html` for `url`. Omit `imageCredit` entirely when using an SVG illustration or an uploaded image without attribution.
- Omit `tips` entirely if none (no empty array)
- Omit `history` entirely if none (no empty string)
- Omit `source` entirely if none (no empty string)
- Include `originalSource` with `type` and `data`, see **Storing the Original Source** above. Place it after `source`, before `translations`.
- Omit `group` from ingredient objects when there's no group
- Omit `image` from step objects (not used)
- Add `timers` on base steps with a duration (Step 4b), never in translated steps
- Add `related` right before `translations` (Step 4c)
- 2-space indentation, trailing newline
- `translations` object at the end, with `en` and `it` keys

## Step 6: Update the Recipe Index

> ⚠️ Do NOT read `index.json` directly, the file is too large and will exceed token limits. Use the Python script below instead.

Append a new entry at the END of the array using Python. The index entry uses the same `images` object format as the detail JSON:
```json
"images": {
  "cover": "images/recipes/{slug}/cover.webp",
  "web": "images/recipes/{slug}/web.webp"
}
```

Write the new entry to a temp file then append it:
```bash
cat > /tmp/new-recipe-entry.json << 'EOF'
{
  "slug": "...",
  ... (full RecipeSummary entry with translations)
}
EOF

python3 -c "
import json
with open('public/data/recipes/index.json') as f:
    data = json.load(f)
with open('/tmp/new-recipe-entry.json') as f:
    new_entry = json.load(f)
data.append(new_entry)
with open('public/data/recipes/index.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write('\n')
"
```

Do NOT re-sort the array. The existing order is intentional.

## Step 7: Get the Recipe Cover Image

> ⚠️ Do NOT use the Agent tool to fetch or process images. Download and read cover images inline using WebFetch or the Read tool directly.

Create directory `public/images/recipes/{slug}/` if needed.

### If a cover image was uploaded in the issue
Download the uploaded image and save it as `public/images/recipes/{slug}/cover.jpg` (or the appropriate extension), and also copy it to `public/images/recipes/{slug}/web.jpg`. Then convert both to WebP (see **Convert photos to WebP** below), which also resizes them.

### If no cover image was provided
Use the **unsplash-recipe-image** skill (`.agents/skills/unsplash-recipe-image/SKILL.md`) to find and download a professional food photograph from Unsplash. Pass the recipe title and a brief summary of ingredients/description as context.

**Fall back to SVG immediately if any of the following occur:**
- `UNSPLASH_ACCESS_KEY` is not set
- The API returns an error
- No results are returned after all queries
- The best candidate's `recipe_match` visual score is < 5/10 (i.e. the image does not clearly show the correct dish)

Do not settle for a loosely-related image. If Unsplash cannot find a photo that actually shows the dish, generate an SVG instead.

### SVG illustration (fallback)

Generate an SVG cover illustration. Read 1-2 existing SVGs from `public/images/recipes/*/cover.svg` for reference. The style is:

1. **ViewBox**: `0 0 800 600`
2. **Background**: dark warm tones via `<radialGradient>`. Center ~`#2e2822`, edges ~`#1a1510`
3. **Gradient IDs**: prefix with a 2-3 letter abbreviation of the slug to avoid collisions
4. **Composition**: dish centered, on a plate/surface. Subtle environment at low opacity
5. **Food rendering**: basic SVG shapes with gradients and opacity. Painterly feel. No text, no photorealism
6. **Colors**: warm, rich, food-appropriate. Dark background makes food pop
7. **Size**: target 2.5-5.5KB
8. **No embedded images or text**: pure SVG shapes only

When using SVG, set both `cover` and `web` in the `images` object to the same `.svg` path.

### Convert photos to WebP

Every photo cover (uploaded, Unsplash or Pixabay) must be served as WebP. After the `cover.*` and `web.*` files are in place, run:

```bash
npm run images:webp -- public/images/recipes/{slug}
```

The script (`scripts/convert-images-to-webp.mjs`) converts `cover.jpg|png` (max 1600px wide) and `web.jpg|png` (max 800px wide) to `.webp`, deletes the JPG/PNG originals, updates any `.jpg`/`.png` references in `public/data/**/*.json`, and never touches `source*` files. Run `npm ci` first if `node_modules` is missing (it needs the `sharp` dev dependency).

## Step 8: Verify

1. Confirm cover image exists at `public/images/recipes/{slug}/cover.{webp,svg}` and web image at `public/images/recipes/{slug}/web.{webp,svg}`, and that no `cover.jpg`/`web.jpg` is left in that directory
2. Sync `stepCount` and `ingredientCount` in the index from the actual recipe files:
   ```bash
   python3 .agents/skills/add-recipe/sync-recipe-counts.py
   ```
3. Validate recipe JSON and index against the Zod schemas:
   ```bash
   npm run validate:recipes
   ```
   This validates all recipe detail files and `index.json` against the TypeScript types, and checks that each ingredient line scales the same way in FR, EN and IT (a translation that lost its leading quantity fails). Fix any reported errors before proceeding.
4. Run `npm run build` to confirm nothing breaks

## Step 9: Update the Search Lexicon

Invoke the **`search-lexicon`** skill (`.agents/skills/search-lexicon/SKILL.md`) for the new recipe, so that
natural-language searches find it ("plat libanais au poulet", "curry", "sans porc"…). In short:

1. Run the audit: `npx vitest run src/test/searchLexicon.test.ts` (it also fails if the EN/IT `tags` are not
   translated **position by position**, in the same order as the French `tags`, so keep them aligned).
2. Review the recipe's cuisine/origin, dish family, ingredient groups and `sans-xxx` tags against
   `src/lib/search/query.ts`, and probe 2-3 realistic queries with `SEARCH_PROBE="…"`.
3. Update the lexicon if needed (fr/en/it) and add the meaningful queries to `src/test/searchRealData.test.ts`.
4. Include `src/lib/search/query.ts` and `src/test/searchRealData.test.ts` in the same commit/PR when changed.

Do not skip this step when nothing seems new: the audit is quick, and "no change needed" is a valid outcome to
report.

## Step 10: Report

Summarize:
- Recipe title, slug, category, difficulty
- Number of ingredients, steps, tips, and steps with timers
- Related recipes picked, and the existing recipes updated to link back to it
- Languages: IT (base), EN, FR
- Files created/modified:
  - `public/data/recipes/{slug}.json` (new)
  - `public/data/recipes/index.json` (updated)
  - `public/data/recipes/{other-slug}.json` (if their `related` list now includes the new recipe)
  - `public/images/recipes/{slug}/cover.svg` (new)
  - `src/lib/search/query.ts` and `src/test/searchRealData.test.ts` (if the search lexicon was updated)
- **Search**: lexicon changes and probe queries from Step 9, or "Search lexicon: no change needed"
- For unstructured input: note which fields were inferred vs extracted (say explicitly when `servings` was inferred rather than stated by the source)
- **Extraction confidence** (for unstructured file/URL issues only):
  - If all 3 agents agreed: "✅ High confidence, all 3 extraction agents produced consistent results"
  - If discrepancies exist: list them with severity levels (🔴/🟡/🟢)
- **Judge validation** (for unstructured file/URL issues only):
  - Verdict: PASS or FAIL
  - Confidence: X/10
  - Corrections applied (if any): list each correction with before/after values
  - Missing items added (if any): list each addition

### PR Comment: Extraction Discrepancy Report

When creating a PR for an **unstructured file/URL recipe** (i.e., one that used the parallel 3-agent extraction), include an extraction confidence section in the PR body AND post a separate PR review comment if there are any 🔴 or 🟡 discrepancies.

**PR body**, always include this section for unstructured recipes:

```markdown
## Extraction Confidence

[One of the following:]

✅ **High confidence**, all 3 extraction agents produced consistent results. Judge verdict: PASS (confidence X/10).

⚠️ **Discrepancies detected**, the 3 extraction agents disagreed on some items.
See the review comment below for details. Judge verdict: PASS/FAIL (confidence X/10).

🧑‍⚖️ **Judge corrections applied**, the judge agent found N systematic error(s) that all 3 extraction agents missed.
These have been corrected in the final recipe. See details below.
```

**PR review comment**, post ONLY if there are 🔴 or 🟡 discrepancies OR the judge applied corrections:

```markdown
## ⚠️ Recipe Extraction Discrepancies

The recipe was extracted from an unstructured source using 3 parallel agents + LLM judge validation.
The consensus values (2-of-3 agreement) were used as a base, then verified by a judge agent against the original source.

### Agent Discrepancies
[Include only if there are 🔴 or 🟡 discrepancies]

#### Ingredients
| Item | Agent 1 | Agent 2 | Agent 3 | Consensus | Severity |
|------|---------|---------|---------|-----------|----------|
| ... | ... | ... | ... | ... | 🔴/🟡 |

#### Steps
| Step # | Agent 1 | Agent 2 | Agent 3 | Consensus | Severity |
|--------|---------|---------|---------|-----------|----------|
| ... | ... | ... | ... | ... | 🔴/🟡 |

#### Metadata
| Field | Agent 1 | Agent 2 | Agent 3 | Consensus | Severity |
|-------|---------|---------|---------|-----------|----------|
| ... | ... | ... | ... | ... | 🔴/🟡 |

> **Legend:** 🔴 All 3 agents disagree, 🟡 2 agree, 1 differs, 🟢 Minor wording only (not shown)

### 🧑‍⚖️ Judge Validation
[Always include this section]

- **Verdict:** PASS/FAIL (confidence: X/10)
- **Corrections applied:** N

[Include only if judge found corrections:]
| Field | Consensus Value | Corrected Value | Severity | Reasoning |
|-------|----------------|-----------------|----------|-----------|
| ... | ... | ... | critical/minor | ... |

[Include only if judge found missing items:]
| Type | Missing Item | Insert After | Reasoning |
|------|-------------|--------------|-----------|
| ingredient/step/tip | ... | ... | ... |
```

Only include the table sections that actually have content, omit empty sections.

This review comment helps PR reviewers quickly identify which parts of the recipe may need manual verification against the original source.

## Edge Cases

- **Duplicate slug**: stop and ask the user. Never overwrite.
- **Missing required fields** (structured): report which fields are missing and stop.
- **Unreadable file** (unstructured file): report the error and stop.
- **Unreachable URL** (unstructured URL): report the error and stop. Do not guess recipe content.
- **Non-French source content**: translate to French for base fields, then to EN and IT for translations.
- **Long descriptions**: keep to 1-2 sentences (<200 chars). Extra detail goes to tips.
- **Tags**: 5-15 tags per recipe using the Tag Strategy dimensions. Single lowercase words or hyphenated compounds in French (e.g., `four`, `no-cuisson`, `enfants`, `sans-gluten`, `été`). Translate to EN and IT in the translations block.
- **Cook time 0**: valid (e.g., tiramisu, gelato).
- **Yield in pieces or a mould size** ("12 cookies", "1 moule de 24 cm"): use the number of pieces for `servings` when given; for a single cake/tart use the number of slices the source states, else estimate (a 24 cm tart ≈ 8) and report it as inferred.
- **Category not in template dropdown**: accept if reasonable (e.g., "Bambini" is valid).
