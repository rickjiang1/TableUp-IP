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
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

## Run

```bash
npm run dev
```

Health check:

```text
http://localhost:8787/health
```

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
unknown_ingredients
```

Media files are stored in `pantry_media` as base64 text for the MVP, and served back through:

```text
GET /api/media/:fileName
```

For the MVP, edit recipe rows directly in Supabase or through the iOS app. The iOS app syncs active recipes through this backend, and Supabase keys stay in `backend/.env` or Render environment variables.

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
