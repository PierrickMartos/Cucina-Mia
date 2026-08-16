# Eval: Mamie Yvette Pain au Lait (File/Image Issue)

## Scenario

A user submits a handwritten recipe image through the `recipe-submission-file.yml`
GitHub issue template. The image is a photo of a handwritten notebook page in French
containing Grandma Yvette's milk bread recipe. This tests the full unstructured extraction
pipeline: parallel 3-agent extraction, consensus building, and LLM judge validation.

## Source Material

The source image is at: `public/images/recipes/pain-au-lait-de-mamie-yvette/source.jpg`

This is a real handwritten recipe on a spiral-bound notebook page. The handwriting is in
blue ink, in French, and reads (approximately):

> Pain au Lait
>
> Faire fondre la levure de boulanger avec une cuillère à café de sel.
> Mettre la farine dans un saladier avec du sel fin. Faire fondre également un morceau
> de beurre. Mettre ½ morceau d'Asta dans une casserole, dans du lait et ajouter un
> peu de lait par la suite.
> Dans le beurre fondu, mettre un peu d'eau, y ajouter à la farine avec le beurre fondu
> et le lait.
> Bien pétrir la pâte. Rouler par terre, elle ajoutera un peu de farine, et si il y a
> trop la farine un peu d'eau.
> Faire les pains au lait et les faire cuire et déguster avec du beurre.
>
> 600 gr farine
> 100 gr beurre
> 3 œufs
> 8 cuillères à soupe de sucre
> 2 cuillères à café de sel
> 2 verres de lait
> ½ cube levure

## Simulated Issue

**Labels:** `recipe-submission`, `needs-formatting`

**Title:** [Recipe] Pain au lait de Mamie Yvette

### Issue Body

### Recipe Name

Pain au lait de Mamie Yvette

### Recipe File

![source](https://user-images.githubusercontent.com/example/source.jpg)

### Recipe Image (optional)

_No response_

### Notes (optional)

C'est la recette de la grand-mère de Pierrick. Son secret c'est de séparer les blancs
des jaunes et de monter les blancs en neige avant de les incorporer à la pâte, ça rend
les pains au lait beaucoup plus légers et aériens. Origine : mamie de Pierrick.

## Key Extraction Challenges

1. **Handwriting OCR**: The handwriting is somewhat difficult to read, "Asta" likely
   refers to yeast/levure, quantities need careful reading
2. **Implicit steps**: The handwritten recipe is informal; steps need to be expanded
   into clear cooking instructions
3. **Missing metadata**: No prep time, cook time, servings, difficulty, or category
   specified, these must be inferred
4. **Notes context**: The notes mention the egg white technique which is NOT in the
   handwritten recipe itself, the skill should incorporate tips from notes
5. **Origin field**: The notes mention "mamie de Pierrick", should set origin to
   "pierrick-grandma"
