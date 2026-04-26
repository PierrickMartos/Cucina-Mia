---
name: recipe-hero-image
description: Transform a provided food photograph into a high-resolution, realistic, professional recipe-website hero image. Use when the user supplies or references a food photo and asks for a premium, elegant, moody, cinematic, or website-ready hero image while keeping the dish intact and recognizable.
---

# Recipe Hero Image

## Core Rule

Preserve the dish. Do not change the main ingredients, plating structure, portion proportions, recipe identity, or recognizable preparation style. Treat the source photo as the authority for what the dish is.

Use this skill for image editing from a provided food photo. If the user has not supplied a photo, ask for one unless they explicitly want a generated placeholder.

## Workflow

1. Inspect the source photo before editing.
2. Identify the dish type, visible main ingredients, plating, vessel, angle, and any culturally relevant context.
3. Build an image-editing prompt that preserves those elements and changes only the photography, lighting, background, crop, and optional surrounding styling.
4. Use the image generation or image editing tool available in the environment for raster image output.
5. Return the generated image without extra explanation unless the user asks for details.

## Editing Direction

Use this visual direction unless the user overrides it:

- Moody, premium food photography for a modern kitchen or recipe website.
- Dark rustic surface or background, close to black or deep dark-brown wood.
- Warm directional natural light from the upper left.
- Soft shadows, subtle contrast, and natural color grading.
- Shallow depth of field with a slightly blurred background.
- Sharp, appetizing detail on the dish itself.
- Rich glossy highlights on egg yolks, sauces, oils, glazes, or moist surfaces when present.
- Close-up composition, slightly angled from above, not fully top-down.
- Tight crop with enough breathing room around the plate or bowl.
- High-resolution realistic food photography.

## Prop Rules

Add styling props only if they support the dish type or origin and do not distract from the food.

Good examples:

- Italian pasta: a few basil leaves, parmesan crumbs, linen, dark wood.
- Korean eggs: small ceramic bowl, sesame seeds, scallion, soy-toned sauce dish.
- Dessert: dark linen, cocoa dust, fruit garnish if already compatible.

Avoid:

- Text, logos, packaging, labels, watermarks, hands, or utensils inside the dish.
- Props that imply different ingredients, cuisine, season, or recipe identity.
- Overcrowded tablescapes or restaurant-service scenes.

## Prompt Pattern

When using an image editing tool, write a prompt in this shape:

```text
Transform the provided food photo into a professional, elegant recipe-website hero image. Keep the dish itself intact and recognizable: preserve the main ingredients, plating structure, proportions, vessel, and recipe identity from the source image. Do not add, remove, or replace ingredients on the dish.

Style it as moody premium realistic food photography on a dark rustic background, close to black or dark brown wood. Use warm directional natural light from the upper left, soft shadows, subtle contrast, shallow depth of field, and a slightly blurred background. Keep the composition close-up and slightly angled from above, not fully top-down, with a tight crop and a little breathing room around the plate.

Enhance natural appetizing details: sharp texture on the dish, realistic colors, and glossy highlights on yolks, sauce, oil, or moist surfaces where already present. Add only subtle, culturally appropriate styling props outside the dish if needed. No text, logos, hands, watermarks, cartoon styling, illustration, artificial over-stylization, or utensils inside the dish.
```

Customize the ingredients and prop guidance based on the source photo.

## Quality Checks

Before considering the result acceptable, verify:

- The dish remains the same recipe and is immediately recognizable from the source.
- Main ingredients and plating proportions were not replaced or invented.
- The image reads as realistic photography, not illustration or CGI.
- The dish is sharp and appetizing while the background has gentle depth blur.
- The crop works as a recipe hero image and leaves modest breathing room.
- There is no text, logo, watermark, hand, or utensil intruding into the dish.
