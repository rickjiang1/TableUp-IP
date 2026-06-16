# TableUp Backend

Small backend for AI extraction. It keeps the OpenAI API key off the iOS app.

## Setup

```bash
cd backend
npm install
cp .env.example .env
```

Put a fresh OpenAI API key in `.env`.

Do not reuse any key pasted into chat. Rotate it first.

For Supabase recipe sync and media storage, also add:

```env
APP_ENV=dev
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Optional extraction speed controls:

```env
OPENAI_EXTRACTION_MAX_OUTPUT_TOKENS=2500
OPENAI_VISION_DETAIL=low
MATCHING_RULES_CACHE_TTL_MS=60000
INGREDIENT_DICTIONARY_CACHE_TTL_MS=60000
```

## Run

```bash
npm run dev
```

Health check:

```text
http://localhost:8787/health
```

The health check includes the active environment:

```json
{ "ok": true, "env": "dev" }
```

For MVP deployment, use separate Render services and separate Supabase projects for `dev` and `prod`. See `../docs/DEPLOYMENT.md`.

## Import Ingredients

Ingredient imports must always target an explicit environment. The import script refuses to write if the Supabase project ref does not match the selected environment.

```bash
node src/import-ingredients-csv.js --env dev /path/to/Ingredient.csv
```

For local dev imports, put the DEV Supabase values in ignored file `backend/.env.dev.local`.

Production imports are blocked unless they are intentional:

```bash
node src/import-ingredients-csv.js --env prod --allow-prod-write /path/to/Ingredient.csv
```

Unit conversion seed data is also environment-gated:

```bash
npm run seed:unit-conversions -- --env dev
npm run seed:unit-conversions -- --env prod --allow-prod-write
```

This adds `ingredients.canonical_unit`, `unit_aliases`, and `ingredient_unit_conversion`. AI extraction should keep raw quantity/unit; canonical quantity conversion happens after the inventory item is matched to the ingredient library.

## Endpoints

```text
POST /api/extract-grocery-photo
multipart/form-data: photo=<image>
```

```text
POST /api/parse-recipe
json: { "text": "...", "sourceUrl": "" }
```

```text
GET /api/recipes
```

The server uses OpenAI Responses API image input and Structured Outputs.

## Supabase Tables

The backend creates these tables automatically on first use:

```text
pantry_recipes
pantry_recipe_ingredients
pantry_recipe_steps
pantry_media
ingredients
ingredient_aliases
ingredient_substitutions
ingredient_substitution_components
unknown_ingredients
```

Media files are stored in `pantry_media` as base64 text for the MVP, and served back through:

```text
GET /api/media/:fileName
```

For the MVP, edit recipe rows directly in Supabase or through the iOS app. The iOS app syncs active recipes through this backend, and Supabase keys stay in `backend/.env` or Render environment variables.

## Ingredient UUID Relationships

`ingredients.ingredient_id` is the canonical UUID identifier for database relationships. The old readable text id is kept as `ingredients.ingredient_slug` for imports, debug, and backward compatibility.

Downstream ingredient reference columns also use UUID values:

```text
ingredient_aliases.ingredient_id
ingredient_substitutions.ingredient_id
ingredient_substitutions.substitute_ingredient_id
ingredient_substitution_components.component_ingredient_id
ingredient_unit_conversion.ingredient_id
ingredient_storage_life_rules.ingredient_id
pantry_recipe_ingredients.canonical_ingredient_id
unknown_ingredients.suggested_ingredient_id
```

Legacy slugs are still available as `*_slug` columns where useful. Run the migration with:

```bash
node backend/src/apply-ingredient-uuid-migration.js --env dev
```

Use `--env prod --allow-prod-write` only when intentionally migrating production.

## Ingredient Alias Dictionary

Recipe matching is rule-based. It first resolves inventory and recipe ingredient names through `ingredient_aliases`, then compares canonical ingredient IDs. For example:

```text
鸡胸 -> chicken_breast
鸡胸肉 -> chicken_breast
```

Unknown inventory or recipe ingredients are recorded in `unknown_ingredients` with `status = pending` during `/api/recipe-matches`. Review these later and add approved aliases through:

```text
GET /api/unknown-ingredients
POST /api/ingredient-aliases
```

Run the schema/seed script after setting `SUPABASE_DATABASE_URL` in `backend/.env` or your shell:

```bash
npm run seed:matching
```

AI suggestions for unknown aliases should be a review workflow, not part of live matching. Only enable an AI suggestion endpoint after you explicitly approve sending unknown ingredient names to the external AI service.

## Databricks Migration

If the old Databricks variables are still present in `.env`, migrate existing recipes into Supabase with:

```bash
npm run migrate:databricks:supabase
```
