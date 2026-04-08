---
name: unsplash-recipe-image
description: "Find and download the best food photograph from Unsplash for a recipe. Use this skill whenever you need a cover image for a recipe, when replacing an SVG illustration with a real photo, when the user asks for a recipe image from Unsplash, or when adding a new recipe that needs a photo instead of a generated illustration. Also use it when the user mentions Unsplash in the context of recipe images."
---

# Unsplash Recipe Image Finder

Finds the best professional-quality food photograph on Unsplash for a given recipe. "Best" means: high-resolution, community-validated, looks like a pro food photo (the plate is the hero, colorful, appetizing).

## Prerequisites

The Unsplash API access key must be available as the environment variable `UNSPLASH_ACCESS_KEY`. If it's missing, stop and ask the user to set it:
```
export UNSPLASH_ACCESS_KEY="your-access-key-here"
```

All API requests use the header `Authorization: Client-ID $UNSPLASH_ACCESS_KEY`.

## Step 1: Build Search Queries

Generate 2 search queries from the recipe, ordered by specificity. Unsplash search works best with short, focused queries (2-4 words).

**Query strategy — recipe name carries the most weight:**

1. **Primary query**: the dish name itself, translated to English if needed (e.g., `pasta carbonara`, `tiramisu`, `pizza margherita`). This is the most important query.
2. **Simplified query**: if the dish name has 3+ words, try a shorter variant focusing on the key ingredient or dish type (e.g., `carbonara` from "pasta alla carbonara", `tiramisù` → `tiramisu`).
3. **Ingredient-based query** (optional, only if the first two return < 10 results): main ingredient + cooking style from the recipe content (e.g., `grilled salmon`, `chocolate cake`).

Remove accents and special characters from queries. Use `%20` to encode spaces in URLs.

## Step 2: Search Unsplash

For each query, call the Unsplash API. Always use these fixed parameters:

```
https://api.unsplash.com/search/photos?query={query}&per_page=10&orientation=landscape&content_filter=high&order_by=relevant
```

Pass the auth header:
```
-H "Authorization: Client-ID $UNSPLASH_ACCESS_KEY"
```

Key parameters explained:
- `orientation=landscape` — landscape images work best for recipe card covers
- `content_filter=high` — filters out low-quality or inappropriate content
- `order_by=relevant` — Unsplash's relevance ranking
- `per_page=10` — enough candidates without overwhelming

Use `/usr/bin/curl` (not `curl`) to bypass any shell aliases, and pipe through `python3 -c "import json,sys; ..."` to parse the response.

Example command:
```bash
/usr/bin/curl -s "https://api.unsplash.com/search/photos?query=pasta+carbonara&per_page=10&orientation=landscape&content_filter=high" \
  -H "Authorization: Client-ID $UNSPLASH_ACCESS_KEY" | python3 -c "import json,sys; data=json.load(sys.stdin); print(json.dumps(data['results'], indent=2))"
```

Collect all hits from all queries into a single candidate pool. Deduplicate by `id`.

## Step 3: Pre-filter and Score Candidates by Metadata

First, score each image using API metadata to narrow down candidates. The scoring formula balances community validation, resolution quality, and aspect ratio suitability:

```
metadata_score = (popularity_score * 0.5) + (resolution_score * 0.3) + (aspect_score * 0.2)
```

### Popularity score (0-100)
Likes are the primary community engagement signal available from the search response:
```
raw = likes * 3
popularity_score = min(100, raw / max_raw_in_pool * 100)
```
Normalize across the candidate pool so the most popular image gets 100.

### Resolution score (0-100)
Higher resolution images are sharper and more professional:
```
megapixels = (width * height) / 1_000_000
resolution_score = min(100, megapixels / 12 * 100)
```
12MP (e.g., 4000x3000) gets a perfect score. Anything above is capped at 100.

### Aspect ratio score (0-100)
Landscape images work best for recipe cards. Tall portrait images are less suitable:
```
ratio = width / height
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
- Between equal scores, prefer images from the primary (dish name) query

### Disqualify
- Skip images smaller than 800x600

## Step 4: Visual Inspection of Top Candidates

Take the top 5 candidates by `metadata_score` and visually inspect them. For each, download the small preview from `urls.small` (400px wide, fast to load) and evaluate how well it matches the recipe.

```bash
/usr/bin/curl -sL "{urls.small}" -o /tmp/unsplash_candidate_{id}.jpg
```

Then read each downloaded preview image (Claude can process images natively). For each candidate, assess:

1. **Recipe match (0-10)**: Does the image actually show the correct dish? A carbonara search might return generic pasta — penalize images that don't match the specific recipe.
2. **Plate focus (0-10)**: Is the dish the clear hero of the photo? Ideally you see mostly the plate/bowl with the food, not a wide table scene or a person eating.
3. **Professional quality (0-10)**: Does it look like a pro food photo? Good lighting, sharp focus, styled plating, appealing colors.
4. **Color appeal (0-10)**: Is the image vibrant and appetizing? Rich, warm colors score higher than dull or washed-out photos.

Calculate a `visual_score` (0-100):
```
visual_score = (recipe_match * 4) + (plate_focus * 3) + (pro_quality * 2) + (color_appeal * 1)
```

Recipe match gets the highest weight because an image of the wrong dish is useless no matter how beautiful.

### Final score

Combine metadata and visual scores — visual inspection carries more weight since it captures what actually matters (showing the right dish beautifully):

```
final_score = (metadata_score * 0.3) + (visual_score * 0.7)
```

## Step 5: Select and Download

1. Pick the candidate with the highest `final_score`

2. **Trigger the download event** (required by Unsplash API guidelines to credit photographer stats):
```bash
/usr/bin/curl -s "https://api.unsplash.com/photos/{id}/download" \
  -H "Authorization: Client-ID $UNSPLASH_ACCESS_KEY" > /dev/null
```

3. Download both versions:
   - `urls.regular` (1080px) → save to the target path (caller specifies this, or default to `cover.jpg` in current directory)
   - `urls.small` (400px) → save as `web.jpg` in the same directory as the main image

```bash
/usr/bin/curl -sL "{urls.regular}" -o {output_path}
/usr/bin/curl -sL "{urls.small}" -o {output_dir}/web.jpg
```

4. Verify both downloads:
   - Files exist and are > 10KB
   - `file` command confirms they are JPEG images

## Step 6: Report

Print a short summary including these fields:
- Unsplash photo ID and page URL (`links.html`)
- `urls.small` — the 400px preview URL
- `urls.regular` — the 1080px download URL
- Photographer credit: `user.name` and `user.links.html`
- Image dimensions and score breakdown
- The search query that found this image
- Output file path

**Important**: Unsplash's license requires attribution. Always include the photographer name and link so the caller can credit them as: "Photo by {user.name} on Unsplash".

## Example

For a recipe "Pasta alla Carbonara":

1. Queries: `pasta+carbonara`, `carbonara`
2. Search returns ~20 food photos across both queries
3. Top candidate after visual scoring: 5472x3648, 87 likes → final_score 82
4. Trigger download event for photo ID
5. Download `urls.regular` → `cover.jpg`, `urls.small` → `web.jpg`

## Edge Cases

- **No results**: try broader queries (just the main ingredient, or the category like `pasta`, `dessert`). If still nothing, report failure — don't download a random image.
- **API error 401**: invalid or missing `UNSPLASH_ACCESS_KEY`. Ask the user to check the key.
- **Rate limit (403/429)**: demo apps are limited to 50 requests/hour. Wait or ask user to upgrade to production.
- **Non-Italian dish name**: translate to English for the search query since Unsplash tags are primarily in English.
