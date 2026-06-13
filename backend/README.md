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
```

Media files are stored in `pantry_media` as base64 text for the MVP, and served back through:

```text
GET /api/media/:fileName
```

For the MVP, edit recipe rows directly in Supabase or through the iOS app. The iOS app syncs active recipes through this backend, and Supabase keys stay in `backend/.env` or Render environment variables.

## Databricks Migration

If the old Databricks variables are still present in `.env`, migrate existing recipes into Supabase with:

```bash
npm run migrate:databricks:supabase
```
