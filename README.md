# Pantry Pilot MVP

A small browser MVP for managing cooking inventory and matching recipes against what is currently in storage.

## Run

From this folder:

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:5173/index.html
```

## What Works

- Add grocery items manually.
- Simulate a grocery photo scan and confirm detected items.
- View storage inventory.
- Add recipes with ingredients, cooking steps, and an optional video URL.
- See which recipes can be cooked from current storage.
- Open cooking mode and subtract used ingredients after cooking.
- Persist data in browser `localStorage`.

## MVP Limits

The photo scan is currently simulated. The real version should call a backend endpoint such as:

```text
POST /api/extract-grocery-photo
```

The backend would send the image to an AI vision model with a strict JSON schema, validate the result, normalize ingredient names and units, then return detected items for user confirmation.

Example extraction shape:

```json
{
  "items": [
    {
      "name": "chicken thigh",
      "quantity": 2.34,
      "unit": "lb",
      "location": "Fridge",
      "confidence": 0.92,
      "sourceText": "CHICKEN THIGHS 2.34 LB"
    }
  ]
}
```

## Next Build Step

The next real product step is to replace the simulated scan in `app.js` with a backend call, then add a confirmation/edit screen using the returned structured ingredients.
