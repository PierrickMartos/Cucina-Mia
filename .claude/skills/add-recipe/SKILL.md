---
name: add-recipe
description: "Add a new recipe to the Cucina Mia cookbook app from a GitHub issue. Use this skill whenever the user asks to add a recipe, process a recipe submission issue, handle a recipe-submission labeled GitHub issue, or extract a recipe from an uploaded file/document/image. Also use it when the user pastes recipe content and wants it added to the app, or references a GitHub issue number that contains a recipe."
---

# Add Recipe to Cucina Mia

This skill processes recipe submissions and adds them to the Cucina Mia cookbook app. It handles three types of input:
- **Structured issues** from the `recipe-submission.yml` GitHub template (form with all fields)
- **Unstructured file issues** from the `recipe-submission-file.yml` template (uploaded file + recipe name)
- **Unstructured URL issues** from the `recipe-submission-url.yml` template (webpage URL + recipe name)

Each recipe needs: a detail JSON file, an entry in the index, an SVG cover illustration, and translations in Italian (base), English, and French.

## Step 1: Fetch and Classify the Issue

If given a GitHub issue number, fetch it:
```bash
gh issue view <number> --json title,body,labels
```

Classify based on labels and body content:
- **Structured**: has `recipe-submission` label but NOT `needs-formatting`. Body has form sections like `### Recipe Title`, `### Slug`, `### Category`, etc.
- **Unstructured (file)**: has both `recipe-submission` and `needs-formatting` labels. Body has `### Recipe Name`, `### Recipe File` (uploaded file URL), optional `### Recipe Image` and `### Notes`.
- **Unstructured (URL)**: has both `recipe-submission` and `needs-formatting` labels. Body has `### Recipe Name`, `### Recipe URL` (webpage link), optional `### Recipe Image` and `### Notes`.

If the user provides recipe content directly (not via issue), treat it as unstructured input and extract the data.

## Step 2: Extract Recipe Data

### From Structured Issues

Parse the issue body. Each field appears as `### Field Name` followed by the value. Extract and transform:

| Issue Field | JSON Field | Transform |
|---|---|---|
| Recipe Title | `title` | As-is |
| Slug | `slug` | Validate: lowercase, hyphens only |
| Description | `description` | 1-2 sentences |
| Category | `category` | One of: Antipasti, Secondi, Dolci, Pizze, Pane, Bambini, Breakfast, Brunch |
| Difficulty | `difficulty` | One of: Facile, Medio, Difficile |
| Prep Time (minutes) | `prepTime` | Integer |
| Cook Time (minutes) | `cookTime` | Integer |
| Servings | `servings` | Integer |
| Tags | `tags` | Split on commas, trim, lowercase array |
| Ingredients | `ingredients` | See below |
| Steps | `steps` | One per line -> `{"text": "..."}` |
| Tips | `tips` | One per line, omit field if empty |
| Source | `source` | Omit field if empty |
| Cover Image | (for images) | If present, download and use as recipe cover |

**Ingredient parsing:**
- Lines starting with `## ` begin a new group: `{"group": "Group Name", "items": [...]}`
- Lines without a group header go in a single object without the `group` field
- Empty lines are skipped

### From Unstructured File Issues

1. Extract the recipe name from `### Recipe Name`
2. Download/read the file from `### Recipe File` (image URL, PDF, etc.)
   - For images: read directly (Claude can process images)
   - For PDFs/docs: download via WebFetch
3. Check `### Recipe Image` for an optional cover photo
4. Read any `### Notes` for context (origin, variations, tips)
5. Extract all recipe info from the file. The content may be in any language.
6. Generate the slug from the recipe title: lowercase, replace spaces with hyphens, remove accents, keep only `[a-z0-9-]`
7. Infer missing fields with reasonable defaults:
   - `difficulty`: estimate from technique complexity
   - `prepTime`/`cookTime`: estimate from recipe
   - `servings`: default 4 if unclear
   - `category`: infer from dish type
   - `tags`: 3-5 relevant lowercase Italian tags

### From Unstructured URL Issues

1. Extract the recipe name from `### Recipe Name`
2. Fetch the webpage from `### Recipe URL` using WebFetch
3. Extract all recipe info from the page content. The content may be in any language.
4. Check `### Recipe Image` for an optional cover photo
5. Read any `### Notes` for context (origin, variations, tips)
6. Generate the slug from the recipe title: lowercase, replace spaces with hyphens, remove accents, keep only `[a-z0-9-]`
7. Infer missing fields with reasonable defaults:
   - `difficulty`: estimate from technique complexity
   - `prepTime`/`cookTime`: estimate from recipe or page metadata
   - `servings`: default 4 if unclear
   - `category`: infer from dish type
   - `tags`: 3-5 relevant lowercase Italian tags

## Step 3: Translate

The base language is **Italian**. All top-level text fields (title, description, ingredients, steps, tips) must be in Italian. Then provide translations for English and French.

Whatever language the source content is in, translate it to all three languages. The recipe `title` stays in Italian at top level (it's the dish name) and is NOT translated.

### Detail JSON translations structure
```json
"translations": {
  "en": {
    "description": "English description",
    "ingredients": [{"items": ["ingredient in English"]}],
    "steps": [{"text": "Step in English"}],
    "tips": ["Tip in English"]
  },
  "fr": {
    "description": "French description",
    "ingredients": [{"items": ["ingredient in French"]}],
    "steps": [{"text": "Step in French"}],
    "tips": ["Tip in French"]
  }
}
```

### Index JSON translations structure (description only)
```json
"translations": {
  "en": { "description": "English description" },
  "fr": { "description": "French description" }
}
```

Important: ingredient group names (if any) should also be translated within the translations object. The `group` field in translated ingredients should be in the target language.

## Step 4: Validate

Before writing files, check:

1. **Slug**: matches `/^[a-z0-9]+(-[a-z0-9]+)*$/` — no consecutive hyphens, no leading/trailing hyphens
2. **No duplicate**: `public/data/recipes/{slug}.json` must NOT already exist. Stop and report if it does.
3. **Required fields**: slug, title, description, prepTime, cookTime, servings, difficulty, category, tags (non-empty), ingredients (at least one item), steps (at least one)
4. **Enums**: difficulty is "Facile"|"Medio"|"Difficile"; category is a known value
5. **Numbers**: prepTime, cookTime, servings are non-negative integers
6. **Translations**: both `en` and `fr` translations are present with description, ingredients, steps, and tips (if tips exist in base)

## Step 5: Write the Recipe Detail JSON

Create `public/data/recipes/{slug}.json` following the exact structure of existing recipes. Reference `public/data/recipes/pasta-carbonara.json` for format.

Key rules:
- `images` is an object with two keys:
  ```json
  "images": {
    "cover": "images/recipes/{slug}/cover.jpg",
    "web": "images/recipes/{slug}/web.jpg"
  }
  ```
  Use `.jpg` extension when the image comes from Pixabay or an uploaded photo. Use `.svg` only if an SVG illustration was generated.
- Omit `tips` entirely if none (no empty array)
- Omit `source` entirely if none (no empty string)
- Omit `group` from ingredient objects when there's no group
- Omit `image` from step objects (not used)
- 2-space indentation, trailing newline
- `translations` object at the end, with `en` and `fr` keys

## Step 6: Update the Recipe Index

Read `public/data/recipes/index.json`, parse it, append a new entry at the END of the array with the RecipeSummary fields plus translations (description only). The index entry uses the same `images` object format as the detail JSON:
```json
"images": {
  "cover": "images/recipes/{slug}/cover.jpg",
  "web": "images/recipes/{slug}/web.jpg"
}
```

Write back with 2-space indentation and trailing newline.

Do NOT re-sort the array. The existing order is intentional.

## Step 7: Get the Recipe Cover Image

Create directory `public/images/recipes/{slug}/` if needed.

### If a cover image was uploaded in the issue
Download the uploaded image and save it as `public/images/recipes/{slug}/cover.jpg` (or the appropriate extension). Also create a web-sized version at `public/images/recipes/{slug}/web.jpg` if the uploaded image is large (resize or use it directly if already web-appropriate).

### If no cover image was provided
Use the **pixabay-recipe-image** skill (`.claude/skills/pixabay-recipe-image/SKILL.md`) to find and download a professional food photograph from Pixabay. Pass the recipe title and a brief summary of ingredients/description as context. The skill will:
- Search Pixabay with `category=food` using the recipe name
- Score candidates by metadata and visual inspection
- Download both `cover.jpg` (1280px) and `web.jpg` (640px) to `public/images/recipes/{slug}/`

The `PIXABAY_API_KEY` environment variable must be set. If it's not available, fall back to generating an SVG illustration (see below).

### Fallback: SVG illustration (only if Pixabay is unavailable)

If the Pixabay API key is not set or the search returns no results, generate an SVG cover illustration. Read 1-2 existing SVGs from `public/images/recipes/*/cover.svg` for reference. The style is:

1. **ViewBox**: `0 0 800 600`
2. **Background**: dark warm tones via `<radialGradient>`. Center ~`#2e2822`, edges ~`#1a1510`
3. **Gradient IDs**: prefix with a 2-3 letter abbreviation of the slug to avoid collisions
4. **Composition**: dish centered, on a plate/surface. Subtle environment at low opacity
5. **Food rendering**: basic SVG shapes with gradients and opacity. Painterly feel. No text, no photorealism
6. **Colors**: warm, rich, food-appropriate. Dark background makes food pop
7. **Size**: target 2.5-5.5KB
8. **No embedded images or text**: pure SVG shapes only

When using SVG, set both `cover` and `web` in the `images` object to the same `.svg` path.

## Step 8: Verify

1. Validate JSON syntax: `cat public/data/recipes/{slug}.json | python3 -m json.tool`
2. Validate index: `cat public/data/recipes/index.json | python3 -m json.tool`
3. Confirm cover image exists at `public/images/recipes/{slug}/cover.{jpg,svg}` and web image at `public/images/recipes/{slug}/web.{jpg,svg}`
4. Run `npm run build` to confirm nothing breaks

## Step 9: Report

Summarize:
- Recipe title, slug, category, difficulty
- Number of ingredients, steps, tips
- Languages: IT (base), EN, FR
- Files created/modified:
  - `public/data/recipes/{slug}.json` (new)
  - `public/data/recipes/index.json` (updated)
  - `public/images/recipes/{slug}/cover.svg` (new)
- For unstructured input: note which fields were inferred vs extracted

## Edge Cases

- **Duplicate slug**: stop and ask the user. Never overwrite.
- **Missing required fields** (structured): report which fields are missing and stop.
- **Unreadable file** (unstructured file): report the error and stop.
- **Unreachable URL** (unstructured URL): report the error and stop. Do not guess recipe content.
- **Non-Italian source content**: translate to Italian for base fields, then to EN and FR for translations.
- **Long descriptions**: keep to 1-2 sentences (<200 chars). Extra detail goes to tips.
- **Tags**: single lowercase words or hyphenated compounds (e.g., `no-cottura`, `frutti-di-bosco`).
- **Cook time 0**: valid (e.g., tiramisu, gelato).
- **Category not in template dropdown**: accept if reasonable (e.g., "Bambini" is valid).
