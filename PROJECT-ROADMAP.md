# Pantry Pilot Roadmap

## Phase 1: Native Local App

- Create Xcode project from `ios/PantryPilot`.
- Build and run on iPhone.
- Verify local SwiftData storage.
- Seed a few ingredients and recipes.
- Test Can Cook matching and automatic subtraction.

## Phase 2: Backend AI

- Rotate the exposed API key.
- Put the fresh key in `backend/.env`.
- Run backend locally.
- Replace simulated iOS extraction with backend calls.
- Test with real grocery photos and recipe text.

## Phase 3: Real Data Polish

- Add your real grocery examples.
- Add your real recipes.
- Tune unit conversion and category detection.
- Tune expiration estimates.
- Tune the adjustable match threshold.

## Phase 4: Optional Cloud

Default remains local-only.

Optional providers:

- Supabase
- Firebase
- iCloud

For self-use, cloud sync should wait until the local app feels right.

## Security Note

The OpenAI API key pasted in chat must be revoked/rotated. Never commit API keys to this repo. Use `backend/.env`, which should stay local and private.
