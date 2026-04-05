# Add-Recipe Skill Evals

Manual eval suite for the `add-recipe` skill. Each eval simulates a recipe submission scenario and defines expected output criteria.

## How to Run an Eval

### 1. Process the fixture

Open the fixture file and use it as input to the add-recipe skill. For example, to run the Naan Nature eval:

```
# Read the fixture to understand the simulated issue
cat .claude/skills/add-recipe/evals/fixtures/structured-naan-nature.md

# Then invoke the skill with the issue content from the fixture
```

For **file/image evals** (Mamie Yvette), the source file already exists at the path indicated in the fixture.

For **PDF and URL evals**, use the simulated content provided in the fixture file since the real URLs don't exist.

### 2. Validate the output

After the skill has processed the fixture and produced recipe files, run the eval validator:

```bash
# Run all evals
npx vitest run .claude/skills/add-recipe/evals/validate-eval.test.ts

# Run a specific eval by name
npx vitest run .claude/skills/add-recipe/evals/validate-eval.test.ts -t "mamie-yvette"
npx vitest run .claude/skills/add-recipe/evals/validate-eval.test.ts -t "naan-nature"
npx vitest run .claude/skills/add-recipe/evals/validate-eval.test.ts -t "duplicate-slug"
```

### 3. Review results

The validator prints a checklist showing which criteria passed and which failed. Error evals (duplicate-slug, missing-fields) require manual verification.

## Eval Scenarios

### Happy Path

| Eval | Type | Source Lang | Key Tests |
|------|------|-------------|-----------|
| `naan-nature` | Structured issue | French | Basic parsing, Quanto vene on olive oil, tags, translations |
| `mamie-yvette` | File (handwritten image) | French | 3-agent parallel extraction, OCR, consensus, judge validation |
| `pdf-tiramisu` | File (PDF) | Italian | PDF extraction, Italian→French translation, cookTime 0, ingredient groups |
| `url-pesto-genovese` | URL (webpage) | French | URL extraction, Quanto vene on 3 ingredients, cookTime 0 |
| `english-banana-bread` | Structured issue | English | English→French translation, tag vocabulary mapping |

### Error Cases

| Eval | Key Tests |
|------|-----------|
| `duplicate-slug` | Duplicate detection, processing stops, no files modified |
| `missing-fields` | All missing fields reported, processing stops |

## Eval Criteria Reference

### Common checks

- `schema_valid` — Recipe passes Zod schema validation
- `has_translations_en/it` — EN and IT translations present
- `tags_are_french` — Base tags use French vocabulary
- `tags_min_count` / `tags_max_count` — Tag count in range 5-15
- `ingredients_min_count` — Minimum ingredient items
- `steps_min_count` — Minimum steps
- `tips_present` — Tips array exists and is non-empty
- `original_source_type` — Correct source type (text/image/pdf/url)
- `description_max_length` — Description under 200 chars
- `translations_have_ingredients/steps/tags` — Translations include full data

### Extraction-specific checks

- `parallel_extraction_used` — 3-agent extraction was launched (manual check)
- `consensus_report_generated` — Discrepancy report was produced (manual check)
- `judge_validation_run` — Judge agent was run (manual check)
- `ingredients_must_contain` — Specific keywords found in ingredients
- `expected_quantities` — Ingredient quantities match expected values

### Edge case checks

- `quanto_vene_on_olive_oil` — Olive oil has (Quanto vene)
- `quanto_vene_required_on` — Specific ingredients have (Quanto vene)
- `cook_time_is_zero` — cookTime is exactly 0
- `ingredient_groups_min_count` — Minimum number of ingredient groups
- `base_language_is_french` — Base fields are in French, not the source language

## Adding New Evals

1. Create a fixture in `fixtures/` describing the input scenario
2. Create expected criteria in `expected/` with validation checks
3. Add the eval to the table in this README
