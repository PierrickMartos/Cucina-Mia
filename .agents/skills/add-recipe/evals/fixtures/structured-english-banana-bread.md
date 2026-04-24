# Eval: Banana Bread — Structured Issue in English

## Scenario

A user submits a banana bread recipe through the structured `recipe-submission.yml`
template, but writes all content in English instead of French. The skill must translate
everything to French for the base JSON and provide EN/IT translations. Tests non-French
source language handling.

## Simulated Issue

**Labels:** `recipe-submission`

**Title:** [Recipe] Banana Bread

### Issue Body

### Recipe Title

Banana Bread

### Slug

banana-bread

### Description

A moist and tender banana bread loaded with ripe bananas. Simple to make, perfect for breakfast or an afternoon snack.

### Category

Breakfast

### Difficulty

Facile

### Prep Time (minutes)

15

### Cook Time (minutes)

55

### Servings

8

### Tags

oven, easy, breakfast, snack, vegetarian, kids, comforting, soft, american, banana, sweet

### Ingredients

3 very ripe bananas, mashed
80 g melted butter
150 g sugar
1 egg, beaten
1 teaspoon vanilla extract
1 teaspoon baking soda
Pinch of salt
190 g all-purpose flour

### Steps

Preheat the oven to 175°C (350°F).
Mash the bananas in a large bowl with a fork until smooth.
Stir in the melted butter.
Add the sugar, beaten egg, and vanilla extract. Mix well.
Sprinkle the baking soda and salt over the mixture, then stir in.
Add the flour and fold gently until just combined — do not overmix.
Pour the batter into a greased 23x13 cm loaf pan.
Bake for 55 to 60 minutes, until a toothpick inserted in the center comes out clean.
Let cool in the pan for 10 minutes before turning out onto a wire rack.

### Tips (optional)

The riper the bananas, the better — use bananas with lots of brown spots.
Add 60g of chopped walnuts or chocolate chips for a variation.
Keeps well wrapped in cling film for 3-4 days, or freeze for up to 2 months.

### Source (optional)

_No response_

### Cover Image (optional)

_No response_

## Key Extraction Challenges

1. **English → French translation**: All content is in English and must be translated to
   French for the base JSON. The English version should be preserved in translations.en.
2. **Tag translation**: Tags are provided in English but must be converted to the French
   tag vocabulary (e.g., "oven" → "four", "easy" → "facile", "kids" → "enfants").
3. **Unit consistency**: Ingredient units are already metric, but ensure they're properly
   formatted in French (e.g., "190 g de farine").
4. **Category mapping**: "Breakfast" is a valid category — keep as-is.
5. **No Quanto vene**: No ingredients trigger the rule (butter is not olive oil).
