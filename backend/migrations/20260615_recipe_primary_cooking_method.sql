alter table pantry_recipes
  add column if not exists primary_cooking_method text not null default '';

