---
name: pixabay-recipe-image
description: "Find and download the best food photograph from Pixabay for a recipe. Use this skill whenever you need a cover image for a recipe, when replacing an SVG illustration with a real photo, when the user asks for a recipe image from Pixabay, or when adding a new recipe that needs a photo instead of a generated illustration. Also use it when the user mentions Pixabay in the context of recipe images."
---

# Pixabay Recipe Image Finder

Finds the best professional-quality food photograph on Pixabay for a given recipe. "Best" means: high-resolution, popular with the community, looks like a pro food photo (the plate is the hero, colorful, appetizing).

## Prerequisites

The Pixabay API key must be available as the environment variable `PIXABAY_API_KEY`. If it's missing, stop and ask the user to set it:
```
export PIXABAY_API_KEY="your-key-here"
```

## Step 1: Build Search Queries

Generate 2 search queries from the recipe, ordered by specificity. Pixabay search works best with short, focused queries (2-4 words).

**Query strategy, recipe name carries the most weight:**

1. **Primary query**: the dish name itself, translated to English if needed (e.g., `pasta carbonara`, `tiramisu`, `pizza margherita`). This is the most important query.
2. **Simplified query**: if the dish name has 3+ words, try a shorter variant focusing on the key ingredient or dish type (e.g., `carbonara` from "pasta alla carbonara", `tiramisù` → `tiramisu`).
3. **Ingredient-based query** (optional, only if the first two return < 10 results): main ingredient + cooking style from the recipe content (e.g., `grilled salmon`, `chocolate cake`).

Remove accents and special characters from queries. Use `+` to join words.

## Step 2: Search Pixabay

For each query, call the Pixabay API. Always use these fixed parameters:

```
https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q={query}&image_type=photo&category=food&per_page=10&order=popular&safesearch=true&content_type=authentic
```

Key parameters explained:
- `image_type=photo`: real photographs only, no illustrations or vectors
- `category=food`: restricts to food photography
- `order=popular`: Pixabay's own popularity ranking (accounts for likes, downloads, views)
- `per_page=10`: enough candidates without overwhelming

Use `/usr/bin/curl` (not `curl`) to bypass any shell aliases, and pipe through `python3 -c "import json,sys; ..."` to parse the response.

Collect all hits from all queries into a single candidate pool. Deduplicate by `id`.

## Step 3: Pre-filter and Score Candidates by Metadata

First, score each image using API metadata to narrow down candidates. The scoring formula balances community validation, resolution quality, and aspect ratio suitability:

```
metadata_score = (popularity_score * 0.5) + (resolution_score * 0.3) + (aspect_score * 0.2)
```

### Popularity score (0-100)
Community engagement is the strongest signal for photo quality:
```
raw = (likes * 3) + (downloads * 0.5) + (collections * 5) + (views * 0.01)
popularity_score = min(100, raw / max_raw_in_pool * 100)
```
Normalize across the candidate pool so the most popular image gets 100.

### Resolution score (0-100)
Higher resolution images are sharper and more professional:
```
megapixels = (imageWidth * imageHeight) / 1_000_000
resolution_score = min(100, megapixels / 12 * 100)
```
12MP (e.g., 4000x3000) gets a perfect score. Anything above is capped at 100.

### Aspect ratio score (0-100)
Landscape or square images work best for recipe cards. Tall portrait images are less suitable:
```
ratio = imageWidth / imageHeight
if ratio >= 1.2 and ratio <= 1.8:    # landscape (ideal)
    aspect_score = 100
elif ratio >= 0.9 and ratio < 1.2:   # square-ish (good)
    aspect_score = 80
elif ratio > 1.8:                     # ultra-wide (ok)
    aspect_score = 60
else:                                 # portrait (less suitable)
    aspect_score = 30
```

### Tiebreakers
- Prefer images that are NOT AI-generated (`isAiGenerated: false`)
- Between equal scores, prefer images from the primary (dish name) query

### Disqualify
- Skip any image where `isLowQuality` is `true`
- Skip images smaller than 800x600

## Step 4: Visual Inspection of Top Candidates

Take the top 5 candidates by `metadata_score` and visually inspect them. For each, download the preview image from `webformatURL` (640px wide, fast to load) and evaluate how well it matches the recipe.

```bash
/usr/bin/curl -sL "{webformatURL}" -o /tmp/pixabay_candidate_{id}.jpg
```

Then read each downloaded preview image (Claude can process images natively). For each candidate, assess:

1. **Recipe match (0-10)**: Does the image actually show the correct dish? A carbonara search might return generic pasta, penalize images that don't match the specific recipe.
2. **Plate focus (0-10)**: Is the dish the clear hero of the photo? Ideally you see mostly the plate/bowl with the food, not a wide table scene or a person eating.
3. **Professional quality (0-10)**: Does it look like a pro food photo? Good lighting, sharp focus, styled plating, appealing colors.
4. **Color appeal (0-10)**: Is the image vibrant and appetizing? Rich, warm colors score higher than dull or washed-out photos.

Calculate a `visual_score` (0-100):
```
visual_score = (recipe_match * 4) + (plate_focus * 3) + (pro_quality * 2) + (color_appeal * 1)
```

Recipe match gets the highest weight because an image of the wrong dish is useless no matter how beautiful.

### Final score

Combine metadata and visual scores, visual inspection carries more weight since it captures what actually matters (showing the right dish beautifully):

```
final_score = (metadata_score * 0.3) + (visual_score * 0.7)
```

## Step 5: Select and Download

1. Pick the candidate with the highest `final_score`
2. Download both versions:
   - `largeImageURL` (1280px) → save to the target path (caller specifies this, or default to `cover.jpg` in current directory)
   - `webformatURL` (640px) → save as `web.jpg` in the same directory as the main image

```bash
/usr/bin/curl -sL "{largeImageURL}" -o {output_path}
/usr/bin/curl -sL "{webformatURL}" -o {output_dir}/web.jpg
```

3. Verify both downloads:
   - Files exist and are > 10KB
   - `file` command confirms they are JPEG images

## Step 6: Report

Print a short summary including these fields:
- Pixabay image ID and page URL (`pageURL`)
- `webformatURL`: the 640px preview URL
- `largeImageURL`: the 1280px download URL
- Photographer credit (`user`) and profile URL (`userURL`) if available
- Image dimensions and score breakdown
- The search query that found this image
- Output file path

**Important**: Pixabay's license requires attribution for some uses. Include the photographer name and URL so the caller can credit them.

## Example

For a recipe "Pasta alla Carbonara" with ingredients guanciale, pecorino, eggs:

1. Queries: `pasta+carbonara`, `carbonara`
2. Search returns ~370 food photos
3. Top candidate: 6000x4000, 15 likes, 5067 downloads → score 87
4. Download `largeImageURL` → `cover.jpg`

## Edge Cases

- **No results**: try broader queries (just the main ingredient, or the category like `pasta`, `dessert`). If still nothing, report failure, don't download a random image.
- **API error**: check the error message. Common issues: invalid key, rate limit (100 requests/minute on free tier), `per_page` must be 3-200.
- **Non-Italian dish name**: translate to English for the search query since Pixabay tags are primarily in English.
