# TableUp Database

## Overview

TableUp uses Supabase Postgres as the source of truth for cloud data and knowledge-base data.

Important principles:

- `ingredients.ingredient_id` is the canonical UUID identifier.
- Human-readable ingredient slugs are for imports, debug, and compatibility.
- Downstream tables should reference ingredient UUIDs where possible.
- Dev and prod databases must remain separate.
- Data quality matters more than raw row count.

## Naming Direction

Current schema contains a mix of early MVP names and newer names.

Preferred direction:

- UUID primary/reference IDs for relationships
- Stable slugs for import/debug
- Explicit environment-gated migration and seed scripts
- Avoid storing long product names as canonical ingredients

## Ingredient Knowledge Tables

### ingredients

The ingredient master table.

Important fields:

- `ingredient_id` UUID
- `ingredient_slug`
- `canonical_name`
- `category`
- `category_id`
- `subcategory_id`
- `canonical_unit`

Note: `default_unit` was removed because it was confusing with canonical unit conversion.

### ingredient_aliases

Stores stable reusable names for ingredients.

Examples:

- 小葱 -> scallion
- green onion -> scallion
- 牛肉卷 -> beef_sliced

Alias table should not store every long product title. Product modifiers should be separated into modifiers.

Quality controls:

- `active`
- `review_status`
- confidence and verification fields where available

### ingredient_modifiers

Stores modifier words such as:

- storage: frozen, chilled, fresh
- usage: hotpot, grill, soup
- cut: sliced, rolled, diced, minced
- package: boxed, bagged

Modifiers help parse names like:

```text
冰鲜火锅牛肉卷
```

without polluting `ingredient_aliases`.

### ingredient_categories

Taxonomy table for broad and nested ingredient categories.

Used by:

- ingredient browsing
- substitution candidate generation
- future filtering and analytics

### ingredient_tags

Functional and culinary tags.

Tag types may include:

- flavor
- texture
- function
- nutrition
- form
- cooking_role

### ingredient_functional_profiles

Connects ingredients to tags with weights.

Used by dynamic substitution scoring.

### ingredient_unit_conversion

Ingredient-specific unit conversion rules.

Example:

```text
garlic: head -> clove, ratio 10
milk: cup -> ml, ratio 240
```

AI should extract raw quantity/unit. The system converts to canonical quantity through this table after ingredient matching.

### unit_aliases

Maps unit names into canonical unit tokens.

Examples:

- g, gram, grams -> gram
- tbsp, tablespoon -> tbsp
- 个 may map to piece/whole depending on context

Unit aliases are global unit normalization data. Ingredient-specific meaning belongs in `ingredient_unit_conversion`.

### ingredient_storage_life_rules

Stores expiration/storage-life rules by ingredient and storage location.

Used to update or recommend expiration dates when an inventory item is matched to a known ingredient.

Storage choices should normalize to a clean set such as:

- room temperature
- fridge
- freezer

### ingredient_nutrition_profiles

Stores nutrition and calorie information when available.

Preferred sources:

- USDA FoodData Central
- Wikidata where useful

Nutrition data should be source-aware and quality-aware.

## Substitution Tables

### substitution_rules

Dynamic category/context scoring rules.

Examples:

- same subcategory in cooking context
- same parent category in soup context
- functional similarity in sauce context

### verified_substitutions

Small set of high-confidence verified substitutions.

Used as override before dynamic scoring.

Examples:

- buttermilk -> milk + acid
- heavy cream -> milk + butter, only in certain contexts

### Deprecated substitution tables

Old static substitution tables were intentionally removed or deprecated:

- `ingredient_substitutions`
- `ingredient_substitution_components`
- `ingredient_cooking_profiles`

Do not rebuild a massive static substitution list unless the product direction changes.

## Recipe Tables

### pantry_recipes

Main recipe table.

Stores structured recipe metadata such as:

- recipe id/name
- folder/category
- image/video
- total time
- active time
- difficulty
- leftover score
- fridge rescue fields
- cooking method

### pantry_recipe_ingredients

Structured recipe ingredients.

Important concepts:

- primary ingredients
- secondary ingredients
- pantry/seasoning ingredients
- quantity and unit
- canonical ingredient ID when matched

Recipe detail can display ingredients by role. Matching logic should treat pantry/seasoning differently from main ingredients.

### pantry_recipe_steps

Recipe workflow steps.

Current direction groups steps by phase:

- planning
- prep
- cook
- finish

Cleanup was removed from the phase model for now.

Each step can support images later.

### Recipe folders

Recipe folders are used to organize central/custom recipes. UI currently presents folder cards rather than file-manager-style folders.

## Inventory Tables

### household_inventory_items

Cloud household inventory table.

Stores:

- household id
- client id
- raw name
- matched canonical ingredient id
- raw quantity/unit
- canonical quantity/unit
- location
- entered date
- expiration date
- category
- soft delete timestamp

Inventory is the source of truth for recommendation.

## User And Household Tables

### app_users

App-level user table.

Supports:

- guest users
- email
- OAuth providers
- install ID hash
- Supabase Auth user linkage

### app_user_sessions

Backend session tokens for app users.

### households

Represents a kitchen/household.

### household_members

Connects users to households.

Roles:

- owner
- member

### household_invites

Invite-code based household sharing.

## Recommendation Cache Tables

### household_inventory_state

Tracks recommendation-relevant inventory state for a household.

Important fields:

- `household_id`
- `inventory_version`
- `recommendation_cache_status`
- `inventory_hash`
- `recipe_library_version`
- `algorithm_version`
- recalculation timestamps

Inventory changes increment `inventory_version` and mark cache stale.

### user_recommendation_cache

Stores recommendation result snapshots.

Important fields:

- user id
- household id
- recipe id
- rank
- match score
- fridge rescue score
- tonight score
- active time
- difficulty
- leftover score
- reason JSON
- inventory hash
- inventory version
- recipe library version
- algorithm version

This table does not store full recipe content.

## Media Table

### pantry_media

MVP media storage table.

Stores base64 media data and MIME type. This is acceptable for MVP but should move to object storage later if media volume grows.

## Unknown Ingredient Workflow

### unknown_ingredients

Stores unmatched ingredients that need review.

Unknowns can come from:

- inventory input
- recipe ingredients
- extraction results

Resolution should usually update the source item or accepted alias workflow, not blindly add low-quality aliases.

## Index Strategy

Important lookup areas:

- ingredient aliases by normalized alias
- ingredients by UUID and slug
- inventory by household
- recommendation cache by household/version/hash
- recipe ingredients by recipe and ingredient
- storage life by ingredient/location

Performance indexes are managed through migrations.

## Schema Evolution Rules

- Prefer additive migrations.
- Do not silently mix dev and prod.
- Use environment-gated scripts for imports and destructive changes.
- Do not remove original data when a review flag is safer.
- Keep docs updated for major table changes.
