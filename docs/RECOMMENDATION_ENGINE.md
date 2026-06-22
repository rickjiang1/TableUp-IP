# TableUp Recommendation Engine

## Purpose

The recommendation engine answers:

```text
Given this household's current inventory, what should they cook?
```

It should be rule-based by default. AI should not decide live ingredient matches.

## Inputs

Recommendation uses:

- Household inventory
- Structured recipe library
- Ingredient aliases
- Ingredient modifiers
- Ingredient taxonomy
- Functional tags
- Verified substitutions
- Substitution rules
- Expiration dates
- Recipe metrics

## Ingredient Matching

Matching priority:

1. Exact canonical ingredient match
2. Alias match
3. Verified substitution
4. Dynamic substitution candidate
5. Missing

Inventory and recipe ingredients should both resolve through the ingredient knowledge base.

## Alias Matching

Aliases map different names to the same canonical ingredient.

Examples:

- green onion -> scallion
- spring onion -> scallion
- 小葱 -> scallion
- 西红柿 -> tomato

Aliases should be stable reusable names, not every product long name.

## Modifier Handling

Modifiers help parse product-style ingredient names.

Example:

```text
冰鲜火锅牛肉卷
```

Possible modifiers:

- 冰鲜: storage/chilled
- 火锅: usage/hotpot
- 卷: cut/rolled

Matching should remove weak modifiers first, keep strong cut/body-part modifiers during longest-alias matching, and only fall back when confidence is low.

## Substitute Matching

Substitution is not a huge static table.

Current direction:

- Use `verified_substitutions` first.
- If no verified substitution exists, use category and functional tag similarity.
- Use recipe context where available.

Dynamic score:

```text
category_score * 0.45
+ tag_similarity_score * 0.40
+ context_score * 0.15
```

Low-confidence same-family substitutions should not automatically drive recommendations.

Important rule:

- Main ingredient substitution should be conservative.
- A weak substitute should not tell a user to replace tomato with a leafy green.

## Pantry And Seasoning Handling

Pantry/seasoning ingredients should be listed but should not dominate recommendation quality.

Examples:

- salt
- black pepper
- oil
- soy sauce
- vinegar
- sugar

In recipe detail and can-cook views, pantry items may be shown without full substitution logic.

## Recipe Scoring

Important scoring signals:

- Ingredient match score
- Fridge rescue score
- Active time
- Total time
- Difficulty
- Leftover score
- Missing ingredient count
- User preference signals in the future

Long-term Dinner Fit direction:

```text
Dinner Fit Score =
  ingredient match
  + fridge rescue value
  + active time fit
  + difficulty fit
  + leftover usefulness
  + household preference
```

Current implementation stores:

- `match_score`
- `fridge_rescue_score`
- `tonight_score`
- `active_time_minutes`
- `difficulty`
- `leftover_score`

## Can-Cook Buckets

Current user-facing buckets:

- Ready / can cook
- Almost there
- Favorites
- All / recommendation views

Almost-there behavior should include recipes in the 50%-79% match range.

## Recommendation Cache

Recommendation cache prevents rescanning all recipes every time the app opens.

Tables:

- `household_inventory_state`
- `user_recommendation_cache`

Cache keys:

- household id
- user id
- inventory version
- inventory hash
- recipe library version
- algorithm version

Current cache threshold:

- Cache recommendation rows with match score at or above the configured minimum.
- MVP default is 50 so the same cache can serve ready and almost-there views.

## Inventory Hash

Inventory hash is based on recommendation-relevant fields such as:

- canonical ingredient id
- quantity
- unit
- expiration date

Rows must be sorted before hashing so equivalent inventory states produce the same hash.

## Cache Invalidation

Inventory changes should:

1. Update `household_inventory_items`.
2. Increment `household_inventory_state.inventory_version`.
3. Mark `recommendation_cache_status = stale`.

Recommendation requests should:

1. Read household inventory state.
2. If status is ready and versions/hashes match, return cached rows.
3. If stale, recompute recommendations.
4. Record the start inventory version.
5. Before writing cache, re-check current inventory version.
6. Write cache only if the version did not change.
7. Drop stale calculation results if inventory changed during computation.

This prevents old recommendation results from overwriting newer inventory recommendations.

## Recipe Library Version

Recipe library version should change when recommendation-relevant recipe data changes.

This ensures updated recipes can invalidate old cached recommendations.

## Algorithm Version

Algorithm version should change when scoring logic changes.

This ensures old cached results do not survive recommendation behavior changes.

## Future Enhancements

Future recommendation improvements:

- Household preference scoring
- Fridge Rescue Plan
- Shopping-list-aware recommendation
- Weekly waste report
- More context-specific substitutions
- Recipe outcome feedback
- Personalized active-time and difficulty preference
- Baby/kid/family-friendly filters
