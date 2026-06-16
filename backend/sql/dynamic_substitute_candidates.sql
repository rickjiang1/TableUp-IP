-- Dynamic substitute candidate query.
-- Parameters:
--   $1 = source ingredient_id uuid
--   $2 = context text, for example general/soup/sauce/salad/stir_fry/baking
--   $3 = result limit integer

with source_ingredient as (
  select ingredient_id, category_id, subcategory_id
  from ingredients
  where ingredient_id = $1::uuid
),
source_tags as (
  select tag_id, weight
  from ingredient_functional_profiles
  where ingredient_id = $1::uuid
),
candidate_tags as (
  select
    candidate.ingredient_id,
    sum(least(source_tags.weight, profiles.weight)) as overlap_weight,
    sum(source_tags.weight) as source_weight
  from ingredients candidate
  join ingredient_functional_profiles profiles on profiles.ingredient_id = candidate.ingredient_id
  join source_tags on source_tags.tag_id = profiles.tag_id
  where candidate.ingredient_id <> $1::uuid
  group by candidate.ingredient_id
),
dynamic_candidates as (
  select
    candidate.ingredient_id,
    candidate.ingredient_slug,
    candidate.canonical_name,
    case
      when candidate.subcategory_id is not null
        and candidate.subcategory_id = source_ingredient.subcategory_id then 0.95
      when candidate.category_id is not null
        and candidate.category_id = source_ingredient.category_id then 0.78
      when source_parent.id is not null
        and source_parent.id = target_parent.id then 0.72
      else 0
    end as category_score,
    coalesce(candidate_tags.overlap_weight / nullif(candidate_tags.source_weight, 0), 0) as tag_similarity_score,
    coalesce(context_rule.base_score, general_rule.base_score, 0) as context_score
  from source_ingredient
  join ingredients candidate on candidate.ingredient_id <> source_ingredient.ingredient_id
  left join candidate_tags on candidate_tags.ingredient_id = candidate.ingredient_id
  left join ingredient_categories source_category on source_category.id = source_ingredient.subcategory_id
  left join ingredient_categories target_category on target_category.id = candidate.subcategory_id
  left join ingredient_categories source_parent on source_parent.id = source_category.parent_category_id
  left join ingredient_categories target_parent on target_parent.id = target_category.parent_category_id
  left join substitution_rules context_rule
    on context_rule.source_category_id = source_ingredient.subcategory_id
   and context_rule.target_category_id = candidate.subcategory_id
   and context_rule.context = $2::text
  left join substitution_rules general_rule
    on general_rule.source_category_id = source_ingredient.subcategory_id
   and general_rule.target_category_id = candidate.subcategory_id
   and general_rule.context = 'general'
)
select
  ingredient_id,
  ingredient_slug,
  canonical_name,
  category_score,
  tag_similarity_score,
  context_score,
  round((
    category_score * 0.45
    + tag_similarity_score * 0.40
    + context_score * 0.15
  )::numeric, 4) as substitute_score
from dynamic_candidates
where category_score > 0
order by substitute_score desc, canonical_name asc
limit greatest(1, $3::integer);
