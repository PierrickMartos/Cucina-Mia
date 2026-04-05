# Eval: Tiramisu Classique — PDF File Issue

## Scenario

A user submits a recipe as a PDF file through the `recipe-submission-file.yml` template.
The PDF contains a formatted tiramisu recipe in Italian. This tests PDF extraction,
translation from Italian to French (base) + EN/IT, and the cook time 0 edge case.

## Simulated Issue

**Labels:** `recipe-submission`, `needs-formatting`

**Title:** [Recipe] Tiramisù classico

### Issue Body

### Recipe Name

Tiramisù classico

### Recipe File

[tiramisù-classico.pdf](https://user-images.githubusercontent.com/example/tiramisù-classico.pdf)

### Recipe Image (optional)

_No response_

### Notes (optional)

Recette de la famille, toujours préparée la veille pour Noël. Pas d'alcool dans cette
version pour que les enfants puissent en manger aussi.

## Simulated PDF Content

The PDF contains the following text (in Italian):

---

**Tiramisù Classico**

*Per 6 persone*

**Ingredienti:**

Per la crema:
- 3 tuorli d'uovo
- 100 g di zucchero
- 500 g di mascarpone
- 3 albumi d'uovo

Per l'assemblaggio:
- 300 ml di caffè espresso freddo
- 300 g di savoiardi (biscuits à la cuillère)
- Cacao amaro in polvere q.b.

**Preparazione:**

1. Sbattere i tuorli con lo zucchero fino a ottenere un composto chiaro e spumoso.
2. Aggiungere il mascarpone al composto di tuorli e mescolare delicatamente fino a ottenere una crema liscia e omogenea.
3. In una ciotola separata, montare gli albumi a neve ferma.
4. Incorporare gli albumi montati alla crema di mascarpone con movimenti dal basso verso l'alto per non smontarli.
5. Versare il caffè freddo in un piatto fondo. Immergere rapidamente i savoiardi nel caffè — devono essere inzuppati ma non fradici.
6. Disporre uno strato di savoiardi inzuppati sul fondo di una pirofila rettangolare.
7. Coprire con uno strato generoso di crema al mascarpone.
8. Ripetere con un secondo strato di savoiardi inzuppati e un altro strato di crema.
9. Spolverare abbondantemente con cacao amaro in polvere.
10. Coprire con pellicola trasparente e riporre in frigorifero per almeno 4 ore, meglio tutta la notte.

**Consiglio:** Il tiramisù è ancora più buono preparato il giorno prima. Il riposo in
frigorifero permette ai sapori di amalgamarsi.

---

## Key Extraction Challenges

1. **Italian source → French base**: The PDF is in Italian, but the base recipe JSON
   must be in French. All ingredients and steps need translation.
2. **Cook time 0**: Tiramisu has no cooking — cookTime must be 0 (valid per skill rules).
3. **Ingredient groups**: The recipe has two ingredient groups ("Per la crema" and
   "Per l'assemblaggio") that must be preserved and translated.
4. **PDF source storage**: The original PDF must be saved as
   `public/images/recipes/tiramisu-classico/source.pdf` with `originalSource.type: "pdf"`.
5. **Notes integration**: The notes mention it's a family recipe for Christmas with no
   alcohol — this context should inform tags (e.g., `noël`, `enfants`, `sans-alcool`).
6. **Quanto vene**: No ingredients trigger the Quanto vene rule in this recipe.
