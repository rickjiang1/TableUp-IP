# TableUp Project Context

This is the primary entry point for future TableUp work. Future AI assistants should read this file first, then open the detailed documents linked below.

## Mission

TableUp helps households answer two daily questions:

- What food do we have?
- What should we cook tonight?

The long-term goal is to turn a household's ingredients, recipes, preferences, expiration dates, and cooking behavior into a kitchen decision system that reduces food waste, saves time, and lowers dinner decision fatigue.

## Target Users

Initial target:

- Chinese-speaking users in the United States
- Households that buy Asian groceries and want better inventory and dinner planning
- Users who need Chinese ingredient names, aliases, storage logic, and practical home-cooking recipes

Later target:

- Broader US households
- Families with shared grocery and inventory responsibility
- Users who want less waste and easier dinner decisions

## Current Stage

TableUp is in MVP development.

Current focus:

- Native iOS app
- Personal and household inventory
- Photo, album, manual, and voice ingredient capture
- Ingredient matching against a structured ingredient library
- Unit conversion and expiration estimation
- Structured recipe library
- Rule-based recipe matching
- Recommendation cache for faster "what can I cook" results
- Dev/prod backend deployment split

## Technology Stack

Frontend:

- Native iOS
- SwiftUI
- SwiftData for local persistence
- Xcode build configurations for dev/prod backend URLs

Backend:

- Node.js
- Custom HTTP server in `backend/src/server.js`
- Render for cloud hosting
- OpenAI API only on the backend

Database:

- Supabase Postgres
- Separate dev and prod Supabase projects
- Supabase Auth MVP for guest, OAuth, and magic-link direction

Deployment:

- `develop` branch targets dev
- `main` branch targets prod
- GitHub Actions can trigger Render deploy hooks
- See [DEPLOYMENT.md](./DEPLOYMENT.md)

## Core User Journey

1. User opens TableUp.
2. User records ingredients through photo, album, manual entry, or voice.
3. TableUp stores raw user input while matching ingredients to the ingredient library.
4. Unit conversion, storage-life rules, and expiration dates are applied when possible.
5. User reviews inventory through the Youliao experience.
6. User opens Kaifan to decide what to cook.
7. Recommendation engine uses inventory, recipes, aliases, substitutions, expiration dates, and recipe metrics.
8. User cooks a recipe and inventory can be reduced.
9. Over time, TableUp should learn household habits and reduce food waste.

## Major Architectural Decisions

- OpenAI API keys never belong in the iOS app.
- The backend owns AI extraction and cloud database access.
- Recipe matching should remain rule-based unless intentionally redesigned.
- AI can extract raw text, ingredients, quantities, and units, but canonical matching should use the ingredient knowledge base.
- Inventory is the source of truth for recommendation.
- Ingredient IDs are UUIDs; readable slugs are for import/debug/backward compatibility.
- Aliases and modifiers should stay clean instead of storing every product long name.
- Substitutions are dynamic: taxonomy + tags + rules + verified overrides.
- Recommendation results are cached by household inventory version/hash and algorithm/recipe-library versions.
- Language and visual theme are independent systems.

## Product Principles

- Do not become a generic recipe browser.
- Fewer, better structured recipes are more valuable than a huge recipe dump.
- The app should feel like a kitchen assistant, not a database tool.
- User friction must be low; inventory capture is the hardest and most important habit.
- Free users should understand the core value quickly.
- Pro value should come from reducing waste, saving time, and supporting household workflows.

## Roadmap Summary

Phase 1:

- MVP for Chinese users in the US
- Strong ingredient library
- Structured recipe library
- Personal inventory and basic household inventory
- Reliable dinner recommendation

Phase 2:

- Family sharing
- Better preference memory
- Fridge rescue plans
- Smarter shopping lists

Phase 3:

- Western recipe expansion
- Modern Kitchen theme
- Broader US market

Phase 4:

- International expansion
- More regional ingredient and recipe systems

## Detailed Documents

- [PRODUCT_VISION.md](./PRODUCT_VISION.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
- [RECOMMENDATION_ENGINE.md](./RECOMMENDATION_ENGINE.md)
- [THEME_SYSTEM.md](./THEME_SYSTEM.md)
- [CODING_STANDARDS.md](./CODING_STANDARDS.md)
- [ROADMAP.md](./ROADMAP.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
