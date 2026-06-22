# TableUp Coding Standards

## General Principles

- Prefer simple, reliable MVP architecture over clever abstractions.
- Keep secrets out of the iOS app.
- Keep OpenAI usage on the backend.
- Prefer rule-based ingredient and recipe matching.
- Treat inventory as the source of truth.
- Keep dev and prod data separate.

## Documentation Policy

Update `/docs` only when a change affects future decision-making, architecture, database design, recommendation logic, product strategy, theme/localization architecture, or project-wide standards.

Do not update docs for:

- Minor UI polish
- Background image swaps
- Small bug fixes
- Refactors without behavior changes
- Component cleanup

## iOS Standards

- Use SwiftUI for app UI.
- Preserve native iOS behavior unless there is a strong product reason not to.
- Avoid putting business rules only in views when a service/model layer is more appropriate.
- Keep user-facing strings localizable.
- Keep language and theme independent.
- Do not put backend secrets in build settings or source files.
- Dev builds should point to dev backend.
- Release builds should point to prod backend.

## Backend Standards

- Backend owns OpenAI calls.
- Backend owns Supabase writes that require secrets or direct Postgres access.
- Use environment variables for secrets.
- Keep migration scripts environment-gated when possible.
- Validate inputs before writing database records.
- Prefer stable API contracts for iOS.

## Database Standards

- Use UUID ingredient IDs for relationships.
- Keep ingredient slugs for readable import/debug support.
- Do not add noisy long product names to `ingredient_aliases`.
- Use `ingredient_modifiers` for storage/usage/cut/package words.
- When adding new ingredients, update related tables when relevant:
  - aliases
  - category
  - functional tags
  - unit conversion
  - storage life
  - nutrition when available
- Prefer quality over quantity for substitutions.

## Recommendation Standards

- Live matching should be rule-based unless intentionally redesigned.
- Alias match should outrank substitution.
- Pantry items should not dominate match score.
- Main ingredient substitutions should be conservative.
- Recommendation cache must be invalidated by inventory version/hash, recipe library version, and algorithm version.
- Do not write stale recommendation results if inventory changed during calculation.

## Theme Standards

- Do not hardcode theme assets in feature logic long-term.
- Do not hardcode colors outside theme tokens long-term.
- Theme should affect presentation only.
- Localization should affect text only.
- A language change should not force a theme change.
- A theme change should not force a language change.

## AI Usage Standards

AI may:

- Extract raw ingredient names
- Extract raw quantities and units
- Parse recipe text into structure
- Help with offline data enrichment after review

AI should not:

- Decide final canonical ingredient ID in live matching
- Decide final unit conversion
- Silently add low-quality aliases
- Replace rule-based recommendation logic without explicit redesign

## Git And Deployment Standards

Preferred flow:

```text
develop -> dev deploy -> test -> main -> prod deploy
```

Ask before commit/push/deploy unless the user explicitly authorizes it for the current task.

Production deploys should be intentional and reviewed.
