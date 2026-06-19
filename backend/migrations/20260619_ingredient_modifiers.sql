create extension if not exists pgcrypto;

create table if not exists ingredient_modifiers (
  id uuid primary key default gen_random_uuid(),
  modifier_text text not null,
  normalized_text text not null,
  modifier_type text not null,
  normalized_value text not null,
  language text not null default 'mixed',
  strength text not null default 'weak',
  active boolean not null default true,
  confidence_score numeric not null default 1.0,
  notes text not null default '',
  source_name text not null default 'curated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredient_modifiers_type_check check (modifier_type in (
    'storage',
    'usage',
    'cut',
    'package',
    'part',
    'preparation',
    'origin',
    'quality',
    'brand',
    'other'
  )),
  constraint ingredient_modifiers_strength_check check (strength in ('weak', 'strong')),
  constraint ingredient_modifiers_confidence_check check (confidence_score >= 0 and confidence_score <= 1),
  constraint ingredient_modifiers_unique_text_type_value unique (modifier_text, modifier_type, normalized_value, language)
);

create index if not exists ingredient_modifiers_active_text_idx
  on ingredient_modifiers (active, modifier_text);

create index if not exists ingredient_modifiers_active_type_language_idx
  on ingredient_modifiers (active, modifier_type, language, strength);

create index if not exists ingredient_modifiers_active_normalized_text_idx
  on ingredient_modifiers (active, normalized_text);

grant select, insert, update, delete on ingredient_modifiers to anon;
