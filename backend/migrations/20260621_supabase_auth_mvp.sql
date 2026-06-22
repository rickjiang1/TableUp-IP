alter table app_users
  add column if not exists email text,
  add column if not exists avatar_url text,
  add column if not exists auth_provider text not null default 'guest',
  add column if not exists supabase_auth_user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_users_auth_provider_check'
  ) then
    alter table app_users
      add constraint app_users_auth_provider_check
      check (auth_provider in ('guest', 'apple', 'google', 'email'));
  end if;
end
$$;

create unique index if not exists app_users_supabase_auth_user_idx
  on app_users (supabase_auth_user_id)
  where supabase_auth_user_id is not null;

create index if not exists app_users_auth_provider_idx
  on app_users (auth_provider, updated_at desc);
