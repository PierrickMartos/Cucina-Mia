# Eval: Duplicate Slug Detection — Error Handling

## Scenario

A user submits a recipe with a slug that already exists in the index. The skill must
detect the duplicate and stop with an error message — never overwrite an existing recipe.

## Simulated Issue

**Labels:** `recipe-submission`

**Title:** [Recipe] Pasta alla Carbonara

### Issue Body

### Recipe Title

Pasta alla Carbonara

### Slug

pasta-carbonara

### Description

La recette romaine classique de la carbonara, avec guanciale, pecorino et œufs.

### Category

Pasta

### Difficulty

Medio

### Prep Time (minutes)

10

### Cook Time (minutes)

20

### Servings

4

### Tags

pâtes, italien, porc, œufs, fromage, traditionnel, rapide, plat-principal

### Ingredients

400 g de spaghetti
150 g de guanciale
4 jaunes d'œufs
100 g de pecorino romano râpé (Quanto vene)
Poivre noir fraîchement moulu

### Steps

Couper le guanciale en lardons et le faire revenir à sec dans une poêle jusqu'à ce qu'il soit croustillant.
Cuire les spaghetti dans une grande casserole d'eau bouillante salée.
Mélanger les jaunes d'œufs avec le pecorino et le poivre dans un bol.
Égoutter les pâtes en réservant un peu d'eau de cuisson, puis les mélanger avec le guanciale hors du feu.
Ajouter le mélange d'œufs et de fromage en remuant vigoureusement, en ajoutant un peu d'eau de cuisson pour obtenir une sauce crémeuse.

### Tips (optional)

_No response_

### Source (optional)

_No response_

### Cover Image (optional)

_No response_

## Key Validation

The slug `pasta-carbonara` already exists in `public/data/recipes/index.json`.
The skill MUST:
1. Detect the duplicate during Step 4 (Validate)
2. Stop processing immediately
3. Report the error clearly to the user
4. NOT overwrite the existing `pasta-carbonara.json` file
5. NOT modify `index.json`
