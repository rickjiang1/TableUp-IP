# TableUp Recipe Matching Rule Engine

Rule-based recipe matching for TableUp. This module does not use AI.

## Features

- Exact ingredient matching
- Alias matching through a canonical ingredient table
- Substitute matching with confidence scores
- Required, optional, and pantry item weighting
- Ranked recipe output with detailed missing and substituted ingredients

## Run Tests

```bash
python3 -m unittest recipe_matching_engine.test_matcher -v
```

## Demo Rankings

Print ranked mock recipes against a mixed demo inventory:

```bash
python3 -m recipe_matching_engine.demo_rankings
```

## Integration Notes

The engine is intentionally plain Python dataclasses and pure functions/classes. It can later be wired into:

- FastAPI endpoints
- PostgreSQL tables
- Supabase-backed recipe and inventory sync

The matcher expects data that can be loaded from any source, then normalized into the dataclasses in `models.py`.
