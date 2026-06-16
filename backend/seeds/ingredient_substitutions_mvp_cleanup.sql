update ingredient_substitutions
set
  context = case
    when lower(coalesce(recipe_category, '')) in ('baking', 'dessert') then 'baking'
    when lower(coalesce(recipe_category, '')) = 'sauce' then 'sauce'
    when lower(coalesce(recipe_category, '')) = 'soup' then 'soup'
    when lower(coalesce(recipe_category, '')) = 'stir_fry' then 'stir_fry'
    when lower(coalesce(recipe_category, '')) = 'marinade' then 'marinade'
    when lower(coalesce(recipe_category, '')) = 'salad' then 'salad'
    when lower(coalesce(recipe_category, '')) in ('cooking', 'protein', 'vegetable') then 'cooking'
    else 'general'
  end,
  limitations = case
    when limitations = '' and notes <> '' then notes
    else limitations
  end,
  updated_at = now();

with combo_rows as (
  select
    combination_id,
    ingredient_id,
    substitution_score / 100.0 as confidence_score,
    substitution_type,
    replacement_ratio,
    case
      when lower(coalesce(recipe_category, '')) in ('baking', 'dessert') then 'baking'
      when lower(coalesce(recipe_category, '')) = 'sauce' then 'sauce'
      when lower(coalesce(recipe_category, '')) = 'soup' then 'soup'
      when lower(coalesce(recipe_category, '')) = 'stir_fry' then 'stir_fry'
      when lower(coalesce(recipe_category, '')) = 'marinade' then 'marinade'
      when lower(coalesce(recipe_category, '')) = 'salad' then 'salad'
      when lower(coalesce(recipe_category, '')) in ('cooking', 'protein', 'vegetable') then 'cooking'
      else 'general'
    end as context,
    recipe_category,
    notes,
    source_name,
    source_url
  from ingredient_substitution_combinations
  where active = true
)
insert into ingredient_substitutions (
  ingredient_id,
  substitute_ingredient_id,
  confidence_score,
  substitution_type,
  replacement_ratio,
  recipe_category,
  context,
  notes,
  limitations,
  source_name,
  source_url,
  needs_review,
  review_reason,
  recommended_substitution_type,
  recommended_confidence_score,
  recommended_action,
  updated_at
)
select
  combo_rows.ingredient_id,
  combo_rows.combination_id,
  combo_rows.confidence_score,
  combo_rows.substitution_type,
  combo_rows.replacement_ratio,
  combo_rows.recipe_category,
  combo_rows.context,
  combo_rows.notes,
  combo_rows.notes,
  combo_rows.source_name,
  combo_rows.source_url,
  combo_rows.confidence_score < 0.70 or combo_rows.source_name ilike '%auto-extracted%',
  concat_ws(
    '; ',
    case when combo_rows.confidence_score < 0.70 then 'Combination substitute is below automatic-match threshold.' end,
    case when combo_rows.source_name ilike '%auto-extracted%' then 'Combination substitute was auto-extracted and needs human review before user-facing display.' end
  ),
  combo_rows.substitution_type,
  case when combo_rows.confidence_score < 0.70 then least(combo_rows.confidence_score, 0.59) else combo_rows.confidence_score end,
  case
    when combo_rows.confidence_score < 0.70 then 'manual_review'
    when combo_rows.source_name ilike '%auto-extracted%' then 'manual_review'
    else 'keep'
  end,
  now()
from combo_rows
where exists (select 1 from ingredients where ingredients.ingredient_id = combo_rows.ingredient_id)
on conflict (ingredient_id, substitute_ingredient_id, recipe_category) do update set
  confidence_score = excluded.confidence_score,
  substitution_type = excluded.substitution_type,
  replacement_ratio = excluded.replacement_ratio,
  context = excluded.context,
  notes = excluded.notes,
  limitations = excluded.limitations,
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  needs_review = excluded.needs_review,
  review_reason = excluded.review_reason,
  recommended_substitution_type = excluded.recommended_substitution_type,
  recommended_confidence_score = excluded.recommended_confidence_score,
  recommended_action = excluded.recommended_action,
  updated_at = now();

update ingredient_substitutions
set
  needs_review = true,
  review_reason = concat_ws('; ', nullif(review_reason, ''), 'Substitution appears to duplicate an alias relationship. Move to ingredient_aliases or mark exact_equivalent only if intentionally kept.'),
  recommended_substitution_type = 'alias',
  recommended_confidence_score = 1.0,
  recommended_action = 'move_to_aliases',
  updated_at = now()
where exists (
  select 1
  from ingredient_aliases aliases
  join ingredients target on target.ingredient_id = ingredient_substitutions.substitute_ingredient_id
  where aliases.ingredient_id = ingredient_substitutions.ingredient_id
    and lower(aliases.alias_name) in (
      lower(replace(ingredient_substitutions.substitute_ingredient_id, '_', ' ')),
      lower(target.canonical_name)
    )
);

update ingredient_substitutions
set
  needs_review = true,
  review_reason = concat_ws('; ', nullif(review_reason, ''), 'Substitution appears to be a variety relationship rather than a true substitute.'),
  recommended_substitution_type = 'variety',
  recommended_confidence_score = greatest(confidence_score, 0.90),
  recommended_action = 'move_to_varieties',
  updated_at = now()
from ingredients source, ingredients target
where source.ingredient_id = ingredient_substitutions.ingredient_id
  and target.ingredient_id = ingredient_substitutions.substitute_ingredient_id
  and source.category = target.category
  and source.category in ('fruit', 'vegetable', 'protein', 'pantry', 'dairy', 'grain')
  and (
    lower(target.ingredient_id) like '%' || lower(source.ingredient_id) || '%'
    or lower(source.ingredient_id) like '%' || lower(target.ingredient_id) || '%'
    or lower(target.canonical_name) like '%' || lower(source.canonical_name) || '%'
    or lower(source.canonical_name) like '%' || lower(target.canonical_name) || '%'
  )
  and source.ingredient_id <> target.ingredient_id
  and ingredient_substitutions.recommended_action <> 'move_to_aliases';

update ingredient_substitutions
set
  needs_review = true,
  substitution_type = case when substitution_type = 'same_family' then 'category_mapping' else substitution_type end,
  review_reason = concat_ws('; ', nullif(review_reason, ''), 'Target looks like a broad category or parent ingredient, not a precise substitute.'),
  recommended_substitution_type = 'category_mapping',
  recommended_confidence_score = least(confidence_score, 0.45),
  recommended_action = 'remove_from_substitutions',
  updated_at = now()
where substitute_ingredient_id in (
  'berries',
  'beans',
  'cheese',
  'fish',
  'greens',
  'meat',
  'nuts',
  'peppers',
  'potatoes',
  'squash',
  'tortillas'
)
  and recommended_action not in ('move_to_aliases', 'move_to_varieties');

update ingredient_substitutions
set
  needs_review = true,
  review_reason = concat_ws('; ', nullif(review_reason, ''), 'Auto-extracted substitution has generic source notes or missing specific usage context.'),
  recommended_substitution_type = case when recommended_substitution_type = '' then substitution_type else recommended_substitution_type end,
  recommended_confidence_score = case
    when recommended_confidence_score is null then least(confidence_score, 0.69)
    else least(recommended_confidence_score, 0.69)
  end,
  recommended_action = case
    when recommended_action = '' or recommended_action = 'keep' then 'manual_review'
    else recommended_action
  end,
  updated_at = now()
where source_name ilike '%auto-extracted%'
  and (
    replacement_ratio is null
    or trim(replacement_ratio) = ''
    or lower(replacement_ratio) in ('unknown', 'review source-specific quantity guidance')
    or notes ilike '%auto-extracted structured substitution pair%'
    or context = 'general'
  );

update ingredient_substitutions
set
  needs_review = true,
  review_reason = concat_ws('; ', nullif(review_reason, ''), 'Missing or non-actionable replacement ratio.'),
  recommended_substitution_type = case when recommended_substitution_type = '' then substitution_type else recommended_substitution_type end,
  recommended_confidence_score = coalesce(recommended_confidence_score, least(confidence_score, 0.69)),
  recommended_action = case
    when recommended_action = '' or recommended_action = 'keep' then 'add_replacement_ratio'
    else recommended_action
  end,
  updated_at = now()
where replacement_ratio is null
  or trim(replacement_ratio) = ''
  or lower(replacement_ratio) in ('unknown', 'review source-specific quantity guidance');

with low_quality (ingredient_id, substitute_ingredient_id, recipe_category, recommended_score, reason) as (
  values
    ('avocado', 'squash', 'vegetable', 0.35, 'Avocado and squash differ strongly in fat, texture, water content, and usage.'),
    ('kumquats', 'orange', 'vegetable', 0.55, 'Kumquat and orange overlap in citrus flavor but differ in peel usage, sweetness, and size.'),
    ('pretzels', 'tortillas', 'cooking', 0.35, 'Pretzels and tortillas differ strongly in texture, salt level, and usage.'),
    ('cornflake_crumbs', 'tortillas', 'cooking', 0.40, 'Cornflake crumbs and tortillas are both crunchy grain products only in narrow coating/crust contexts.'),
    ('bread', 'potato_chips', 'cooking', 0.45, 'Bread and potato chips are only loosely useful as crumb/crunch replacements.'),
    ('bread', 'pretzels', 'cooking', 0.45, 'Bread and pretzels are only loosely useful as crumb/crunch replacements.'),
    ('chicken_stock', 'white_wine', 'cooking', 0.45, 'Wine is not a broad stock substitute; use only for deglazing or sauce acidity.'),
    ('yam', 'orange', 'vegetable', 0.30, 'Yam to orange is likely an OCR or context extraction error.'),
    ('tomato', 'peppers', 'vegetable', 0.50, 'Tomato and pepper overlap in color/acidity only in narrow emergency contexts.')
)
update ingredient_substitutions
set
  needs_review = true,
  review_reason = concat_ws('; ', nullif(review_reason, ''), low_quality.reason),
  recommended_substitution_type = case
    when recommended_substitution_type = '' then 'emergency'
    else recommended_substitution_type
  end,
  recommended_confidence_score = low_quality.recommended_score,
  recommended_action = 'lower_confidence',
  updated_at = now()
from low_quality
where ingredient_substitutions.ingredient_id = low_quality.ingredient_id
  and ingredient_substitutions.substitute_ingredient_id = low_quality.substitute_ingredient_id
  and ingredient_substitutions.recipe_category = low_quality.recipe_category;

update ingredient_substitutions
set
  needs_review = true,
  review_reason = concat_ws('; ', nullif(review_reason, ''), 'Confidence score is below the MVP automatic-match threshold of 0.70; use only for hints or manual review.'),
  recommended_substitution_type = case
    when recommended_substitution_type = '' then substitution_type
    else recommended_substitution_type
  end,
  recommended_confidence_score = coalesce(recommended_confidence_score, confidence_score),
  recommended_action = case
    when recommended_action = '' or recommended_action = 'keep' then 'manual_review'
    else recommended_action
  end,
  updated_at = now()
where confidence_score < 0.70;

update ingredient_substitutions
set
  recommended_action = 'keep',
  recommended_substitution_type = substitution_type,
  recommended_confidence_score = confidence_score,
  updated_at = now()
where needs_review = false
  and recommended_action = '';
