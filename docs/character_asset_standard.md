# Character Asset Standard

All TableUp / Fridge Jianghu character assets should live inside one character folder.

## Canon Folder Pattern

```text
characters/
  character_id/
    README.md
    prompts.md
    reference/
      character_id_concept_sheet.png
    expressions/
    comic/
    animation/
```

## Rules

1. Use lowercase snake_case for `character_id`.
2. Store the main uploaded concept image as `reference/character_id_concept_sheet.png`.
3. Keep the character bible in `README.md`.
4. Keep reusable AI prompts in `prompts.md`.
5. Put future expression sheets in `expressions/`, comic panels in `comic/`, and animation assets in `animation/`.
6. Do not add new character files under `assets/characters/` or `docs/characters/`; those were legacy locations.
7. Update `docs/assets.md` and `docs/character_bible.md` whenever a character is added.
