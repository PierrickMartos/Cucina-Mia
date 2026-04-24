# Add-Recipe Skill Evals

Eval suite for the `add-recipe` skill, following the [agentskills.io eval pattern](https://agentskills.io/skill-creation/evaluating-skills).

## Overview

Each eval is a test case with a **prompt** (realistic user input), **expected output** (what success looks like), and **assertions** (verifiable pass/fail checks). The eval loop is: run the skill, grade outputs, review with a human, iterate.

## File Structure

```
evals/
├── evals.json                  # All test cases with prompts and assertions
├── files/                      # Input files referenced by test cases
│   └── mamie-yvette-source.jpg # (symlink or copy of existing source)
├── fixtures/                   # Detailed scenario descriptions (supplementary)
│   ├── structured-naan-nature.md
│   ├── file-mamie-yvette.md
│   ├── file-pdf-tiramisu.md
│   ├── url-pesto-genovese.md
│   ├── structured-english-banana-bread.md
│   ├── structured-duplicate-slug.md
│   └── structured-missing-fields.md
├── expected/                   # Mechanical check criteria per eval
├── validate-eval.test.ts       # Vitest mechanical checker (supplementary)
└── README.md
```

## Test Cases (evals.json)

| ID | Name | Type | Key Tests |
|----|------|------|-----------|
| 1 | Naan Nature | Structured (French) | Basic parsing, Quanto vene on olive oil, translations |
| 2 | Mamie Yvette | File/image (handwritten) | 3-agent extraction, OCR, consensus, judge validation |
| 3 | Tiramisù Classico | File/PDF (Italian) | PDF extraction, Italian→French, cookTime 0, ingredient groups |
| 4 | Pesto alla Genovese | URL (French) | URL extraction, Quanto vene on 3 ingredients, cookTime 0 |
| 5 | Banana Bread | Structured (English) | English→French translation, tag vocabulary mapping |
| 6 | Duplicate Slug | Error case | Duplicate detection, processing stops |
| 7 | Missing Fields | Error case | All missing fields reported, processing stops |

## How to Run Evals

### Step 1: Run each test case

For each eval in `evals.json`, run the add-recipe skill with the `prompt` field as input. Each run should start with a clean context.

```
# Example for eval 1 (Naan Nature):
Execute this task:
- Skill path: .agents/skills/add-recipe
- Task: <paste the prompt from evals.json eval id 1>
- Save outputs to: add-recipe-workspace/iteration-1/eval-naan-nature/with_skill/outputs/
```

For baseline comparison, run the same prompt without the skill.

### Step 2: Grade the outputs

For each run, grade every assertion in the eval against the actual outputs.

**Mechanical checks** (schema validation, field counts, file existence):
```bash
npx vitest run .agents/skills/add-recipe/evals/validate-eval.test.ts
```

**LLM grading** for assertions that need judgment (extraction quality, translation accuracy):

Give the outputs and assertions to an LLM and ask it to evaluate each one with evidence. Save results to `grading.json`:

```json
{
  "assertion_results": [
    {
      "text": "The olive oil ingredient includes '(Quanto vene)' annotation",
      "passed": true,
      "evidence": "Found in naan-nature.json ingredients: '2 cuillères à soupe d'huile d'olive (Quanto vene)'"
    }
  ],
  "summary": {
    "passed": 15,
    "failed": 2,
    "total": 17,
    "pass_rate": 0.88
  }
}
```

### Step 3: Capture timing

When each run completes, save timing data:

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332
}
```

### Step 4: Review with a human

Review actual outputs alongside grades. Record feedback:

```json
{
  "eval-naan-nature": "Looks good, all fields correct.",
  "eval-mamie-yvette": "Missed the egg white tip in step 5, got quantities right."
}
```

### Step 5: Iterate

Use failed assertions + human feedback + execution transcripts to improve the skill. Rerun in `iteration-2/`.

## Assertions Guide

Good assertions for this skill:

- **Mechanical** (check with code): "The recipe JSON passes the Zod RecipeDetailSchema validation", "cookTime is exactly 0", "The olive oil ingredient includes '(Quanto vene)'"
- **Extraction quality** (check with LLM): "The ingredients contain farine (600 g)", "The base language is French, not Italian"
- **Process** (check from transcript): "The parallel 3-agent extraction was used", "A consensus was built from the 3 agent results"

The `validate-eval.test.ts` handles mechanical checks automatically. LLM grading and process checks require manual or LLM-assisted review.

## Adding New Evals

1. Add a new entry to `evals/evals.json` with `id`, `prompt`, `expected_output`, and `assertions`
2. Optionally add input files to `evals/files/`
3. Optionally add a detailed fixture description to `fixtures/`
4. Optionally add mechanical check criteria to `expected/`
5. Start with 2-3 assertions, expand after seeing first results
