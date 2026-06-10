# Pantry Pilot Backend

Small backend for AI extraction. It keeps the OpenAI API key off the iOS app.

## Setup

```bash
cd backend
npm install
cp .env.example .env
```

Put a fresh OpenAI API key in `.env`.

Do not reuse any key pasted into chat. Rotate it first.

For Databricks recipe sync, also add:

```env
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_TOKEN=your_token_here
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/your_warehouse_id
DATABRICKS_CATALOG=workspace
DATABRICKS_SCHEMA=foodmanagement
DATABRICKS_VOLUME=pantry_media
DATABRICKS_VOLUME_PATH=/Volumes/workspace/foodmanagement/pantry_media
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

## Databricks Recipe Tables

The cloud recipe sync reads these tables:

```text
workspace.foodmanagement
pantry_recipes
pantry_recipe_ingredients
pantry_recipe_steps
pantry_units
```

Media files should live in this Databricks volume:

```text
/Volumes/workspace/foodmanagement/pantry_media
```

For the MVP, edit recipe rows directly in Databricks or through the iOS app. The iOS app syncs active recipes through this backend, and Databricks credentials stay in `backend/.env`.
