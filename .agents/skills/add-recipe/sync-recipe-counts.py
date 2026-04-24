#!/usr/bin/env python3
"""
Sync stepCount and ingredientCount in index.json from individual recipe JSON files.
Run from the repository root: python3 .claude/skills/add-recipe/sync-recipe-counts.py
"""
import json
import os
import sys
import glob

RECIPES_DIR = "public/data/recipes"
INDEX_FILE = os.path.join(RECIPES_DIR, "index.json")


def count_ingredients(ingredients: list) -> int:
    return sum(len(group.get("items", [])) for group in ingredients)


def main():
    if not os.path.exists(INDEX_FILE):
        print(f"ERROR: {INDEX_FILE} not found. Run from the repository root.", file=sys.stderr)
        sys.exit(1)

    # Build lookup: slug -> counts from individual recipe files
    counts: dict[str, dict] = {}
    for path in glob.glob(os.path.join(RECIPES_DIR, "*.json")):
        if os.path.basename(path) == "index.json":
            continue
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        slug = data.get("slug")
        if not slug:
            continue
        counts[slug] = {
            "stepCount": len(data.get("steps", [])),
            "ingredientCount": count_ingredients(data.get("ingredients", [])),
        }

    # Update index
    with open(INDEX_FILE, encoding="utf-8") as f:
        index = json.load(f)

    updated = []
    for recipe in index:
        slug = recipe.get("slug")
        if slug not in counts:
            print(f"  WARNING: no detail file found for slug '{slug}', skipping counts")
            continue
        old_steps = recipe.get("stepCount")
        old_ingredients = recipe.get("ingredientCount")
        new_steps = counts[slug]["stepCount"]
        new_ingredients = counts[slug]["ingredientCount"]
        recipe["stepCount"] = new_steps
        recipe["ingredientCount"] = new_ingredients
        if old_steps != new_steps or old_ingredients != new_ingredients:
            updated.append(f"  {slug}: stepCount={new_steps}, ingredientCount={new_ingredients}")

    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
        f.write("\n")

    if updated:
        print("Updated counts in index.json:")
        for line in updated:
            print(line)
    else:
        print("index.json counts are already up to date.")


if __name__ == "__main__":
    main()
