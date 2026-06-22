# TableUp Architecture

## Overview

TableUp is a native iOS app backed by a Node.js service and Supabase Postgres.

High-level flow:

```text
iOS app
  -> TableUp backend on Render
    -> Supabase Postgres
    -> OpenAI API for extraction only
```

OpenAI keys and Supabase database credentials must stay on the backend or Render environment variables, not inside the iOS app.

## Frontend Architecture

Location:

```text
ios/PantryPilot
```

Main frontend technologies:

- SwiftUI
- SwiftData
- iOS 17+

Important areas:

- `RootTabView.swift`: main app navigation shell
- `TableUpHomeViews.swift`: Youliao and Kaifan home experiences
- `StorageView.swift`: inventory and unmatched ingredient management
- `RecipesView.swift`: recipe folders, recipe CRUD, recipe detail
- `CanCookView.swift`: can-cook matching and recommendation surfaces
- `TableUpLoginView.swift`: login/guest entry UI
- `HouseholdSyncService.swift`: backend/session/sync integration
- `GroceryPhotoExtractor.swift`: image extraction API client
- `RecipeMatcher.swift`: local matching support
- `InventoryQuantityFormatter.swift`: raw/canonical quantity display

Current bottom navigation direction:

- Youliao: what food the household has
- Kaifan: what to cook
- Settings

## Backend Architecture

Location:

```text
backend
```

Main entry:

```text
backend/src/server.js
```

Backend responsibilities:

- AI photo extraction
- Voice/text ingredient parsing support
- Recipe parsing
- Supabase reads/writes
- Household session/auth endpoints
- Ingredient dictionary and matching-rule APIs
- Recipe sync APIs
- Recommendation cache APIs
- Media storage proxy for MVP

The backend uses a small custom HTTP server rather than a large framework.

## Supabase Architecture

Supabase is used for:

- Ingredient knowledge base
- Recipe library
- Household inventory
- User and household tables
- Recommendation cache
- Media storage table for MVP

The backend accesses Supabase through:

- REST APIs for many table reads/writes
- Direct Postgres connection for migrations and complex SQL

Dev and prod must use separate Supabase projects.

## Authentication Flow

MVP direction:

- Continue as Guest
- Continue with Apple
- Continue with Google
- Continue with Email magic link

Guest mode should generate and persist an install ID on first launch. Guest data can later be migrated or linked to an authenticated user.

Current user/household tables support:

- `app_users`
- `app_user_sessions`
- `households`
- `household_members`
- `household_invites`

Household inventory is scoped by household, not only by device.

## AI Integrations

AI should be used for extraction and structure, not live ingredient matching.

AI responsibilities:

- Extract raw ingredient names from photos
- Extract raw quantities and units
- Parse recipe text into structured data
- Support voice/text capture flows after transcription

Rule engine responsibilities:

- Canonical ingredient matching
- Alias matching
- Modifier handling
- Unit conversion
- Substitution scoring
- Recommendation ranking

## Cache Architecture

Recommendation cache exists to avoid rescanning all recipes every time the user opens Kaifan.

Key concepts:

- `household_inventory_state`
- `inventory_version`
- `inventory_hash`
- `recipe_library_version`
- `algorithm_version`
- `user_recommendation_cache`

Inventory changes mark recommendation cache stale and increment `inventory_version`.

Recommendation recalculation records the version at start. Before writing results, the backend checks whether the household inventory version changed. If it changed, the old calculation result is discarded.

See [RECOMMENDATION_ENGINE.md](./RECOMMENDATION_ENGINE.md).

## Deployment Architecture

MVP environments:

- dev
- prod

Branch mapping:

- `develop` -> dev backend
- `main` -> prod backend

Hosting:

- Render backend services
- Supabase dev/prod projects
- GitHub Actions deployment workflow

See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Service Boundaries

iOS app should own:

- Native UI
- Local SwiftData state
- Camera/photo/voice input surfaces
- User-facing display and editing

Backend should own:

- Secrets
- AI extraction
- Database sync
- Recommendation cache calculation
- Ingredient dictionary APIs

Supabase should own:

- Persistent data
- Relational constraints
- Indexes
- Long-term knowledge tables
