# Eval: Missing Required Fields — Error Handling

## Scenario

A user submits a structured recipe issue but leaves several required fields empty.
The skill must detect the missing fields and report them clearly without proceeding.

## Simulated Issue

**Labels:** `recipe-submission`

**Title:** [Recipe] Crème brûlée

### Issue Body

### Recipe Title

Crème brûlée

### Slug

creme-brulee

### Description

_No response_

### Category

Dolci

### Difficulty

Medio

### Prep Time (minutes)

_No response_

### Cook Time (minutes)

45

### Servings

_No response_

### Tags

_No response_

### Ingredients

500 ml de crème liquide
4 jaunes d'œufs
80 g de sucre
1 gousse de vanille
Cassonade pour le caramel

### Steps

_No response_

### Tips (optional)

_No response_

### Source (optional)

_No response_

### Cover Image (optional)

_No response_

## Key Validation

Missing required fields:
- `description` — empty
- `prepTime` — empty
- `servings` — empty
- `tags` — empty
- `steps` — empty (critical — recipe has no instructions)

The skill MUST:
1. Detect all missing required fields during Step 4 (Validate)
2. Report ALL missing fields (not just the first one found)
3. Stop processing — do not write partial files
4. Clearly list which fields need to be provided
