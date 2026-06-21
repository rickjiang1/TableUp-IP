create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'TableUp User',
  install_id_hash text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists app_user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Kitchen',
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  code text not null unique,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid references app_users(id) on delete set null,
  used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists household_inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  client_id text not null,
  name text not null,
  normalized_name text not null default '',
  description_text text not null default '',
  canonical_ingredient_id uuid,
  quantity numeric not null default 1,
  unit text not null default 'piece',
  canonical_quantity numeric not null default 0,
  canonical_unit text not null default '',
  unit_conversion_ratio numeric not null default 0,
  unit_conversion_needs_review boolean not null default false,
  unit_conversion_review_reason text not null default '',
  category text not null default 'Other',
  location text not null default 'Fridge',
  entered_date date not null default current_date,
  expire_date date not null default current_date,
  created_by uuid references app_users(id) on delete set null,
  updated_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists household_inventory_items_household_client_idx
  on household_inventory_items (household_id, client_id)
  ;

create index if not exists app_user_sessions_token_active_idx
  on app_user_sessions (token_hash)
  where revoked_at is null;

create index if not exists household_members_user_active_idx
  on household_members (user_id, active, household_id)
  where active = true;

create index if not exists household_invites_code_active_idx
  on household_invites (code, expires_at)
  where used_at is null and revoked_at is null;

create index if not exists household_inventory_items_household_updated_idx
  on household_inventory_items (household_id, updated_at desc)
  where deleted_at is null;

create index if not exists household_inventory_items_household_expire_idx
  on household_inventory_items (household_id, expire_date asc, name asc)
  where deleted_at is null;
