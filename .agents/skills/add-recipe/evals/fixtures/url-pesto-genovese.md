# Eval: Pesto alla Genovese (URL Issue)

## Scenario

A user submits a recipe by sharing a webpage URL through the `recipe-submission-url.yml`
template. The URL points to a French recipe blog with a pesto alla genovese recipe. This
tests URL fetching, extraction from HTML content, and the Quanto vene rule (parmesan +
olive oil).

## Simulated Issue

**Labels:** `recipe-submission`, `needs-formatting`

**Title:** [Recipe] Pesto alla Genovese

### Issue Body

### Recipe Name

Pesto alla Genovese

### Recipe URL

https://example.com/recettes/pesto-alla-genovese

### Recipe Image (optional)

_No response_

### Notes (optional)

La vraie recette ligure avec du basilic frais et du pignon de pin. On l'utilise pour les
trofie ou les trenette.

## Simulated Webpage Content

When fetching the URL, the following content is returned (French recipe blog):

---

# Pesto alla Genovese (La recette authentique)

Le vrai pesto alla genovese se prépare au mortier, avec du basilic frais, des pignons de
pin, de l'ail, du parmesan, du pecorino et une huile d'olive de qualité. Voici la recette
traditionnelle ligure.

**Temps de préparation :** 15 minutes
**Temps de cuisson :** aucun
**Pour :** 4 personnes
**Difficulté :** Facile

## Ingrédients

- 60 g de feuilles de basilic frais (environ 2 gros bouquets)
- 30 g de pignons de pin
- 1 gousse d'ail
- 50 g de parmesan reggiano râpé
- 20 g de pecorino sardo râpé
- 100 ml d'huile d'olive extra vierge
- Sel fin q.b.

## Préparation

1. Laver délicatement les feuilles de basilic et les sécher soigneusement avec un torchon propre. Le basilic ne doit pas être humide.
2. Dans un mortier (ou un mixeur à basse vitesse), écraser l'ail avec une pincée de gros sel.
3. Ajouter les pignons de pin et piler jusqu'à obtenir une pâte grossière.
4. Ajouter les feuilles de basilic par poignées en pilant doucement avec un mouvement rotatif. Ne pas écraser brutalement, le basilic doit libérer son huile sans chauffer.
5. Incorporer le parmesan et le pecorino râpés et mélanger.
6. Verser l'huile d'olive en filet tout en continuant de mélanger, jusqu'à obtenir une sauce onctueuse et homogène.
7. Goûter et ajuster le sel si nécessaire.

## Conseils

- Utilisez un mortier en marbre si possible, le résultat est nettement supérieur au mixeur.
- Le pesto se conserve 3-4 jours au réfrigérateur, recouvert d'un film d'huile d'olive.
- Pour congeler le pesto, omettez le fromage et ajoutez-le au moment de servir.

---

## Key Extraction Challenges

1. **Quanto vene rule**: Three ingredients trigger it:
   - Parmesan reggiano → must have `(Quanto vene)`
   - Pecorino sardo → must have `(Quanto vene)`
   - Huile d'olive extra vierge → must have `(Quanto vene)`
2. **Cook time 0**: "Aucun" means no cooking, cookTime must be 0.
3. **URL source type**: `originalSource` must be `{"type": "url", "data": "https://example.com/recettes/pesto-alla-genovese"}`.
4. **Already in French**: The source is in French, so the base JSON should use the
   source text directly (minimal transformation needed for ingredients/steps).
5. **Category inference**: Pesto is a sauce/condiment, category should be "Antipasti"
   (closest match since there's no "Sauce" category).
