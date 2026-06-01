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

The server uses OpenAI Responses API image input and Structured Outputs.
