-- CanGrants Supabase schema
-- Generated using Supabase plugin skills (RLS-by-default + Postgres best practices)
-- Run via: supabase db reset (local) or MCP execute_sql after auth

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  province text,
  discipline text,
  career text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Grants catalog (replaces static src/data/grants.ts)
-- ---------------------------------------------------------------------------
create table public.grants (
  id bigint generated always as identity primary key,
  name text not null,
  org text not null,
  open_date date,
  close_date date,
  close_label text not null default 'Rolling',
  url text not null,
  discipline text[] not null default '{}',
  location text not null default 'Canada',
  amount text,
  tags text[] not null default '{}',
  eligibility text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index grants_discipline_gin_idx on public.grants using gin (discipline);
create index grants_tags_gin_idx on public.grants using gin (tags);
create index grants_close_date_idx on public.grants (close_date) where is_active = true;

alter table public.grants enable row level security;

create policy "Anyone can read active grants"
  on public.grants for select
  using (is_active = true);

-- ---------------------------------------------------------------------------
-- Saved grants (per-user bookmarks)
-- ---------------------------------------------------------------------------
create table public.saved_grants (
  user_id uuid not null references auth.users (id) on delete cascade,
  grant_id bigint not null references public.grants (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, grant_id)
);

create index saved_grants_user_id_idx on public.saved_grants (user_id);
create index saved_grants_grant_id_idx on public.saved_grants (grant_id);

alter table public.saved_grants enable row level security;

create policy "Users can view own saved grants"
  on public.saved_grants for select
  using (auth.uid() = user_id);

create policy "Users can save grants"
  on public.saved_grants for insert
  with check (auth.uid() = user_id);

create policy "Users can unsave grants"
  on public.saved_grants for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Applications (grant tracking)
-- ---------------------------------------------------------------------------
create type public.application_status as enum (
  'not_started',
  'in_progress',
  'submitted'
);

create table public.applications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  grant_id bigint not null references public.grants (id) on delete cascade,
  status public.application_status not null default 'not_started',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, grant_id)
);

create index applications_user_id_idx on public.applications (user_id);
create index applications_grant_id_idx on public.applications (grant_id);
create index applications_status_idx on public.applications (user_id, status);

alter table public.applications enable row level security;

create policy "Users can view own applications"
  on public.applications for select
  using (auth.uid() = user_id);

create policy "Users can create own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

create policy "Users can update own applications"
  on public.applications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own applications"
  on public.applications for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Wishlist signups (replaces Google Sheets endpoint)
-- ---------------------------------------------------------------------------
create table public.wishlist_signups (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  city text,
  country text,
  created_at timestamptz not null default now()
);

create index wishlist_signups_email_idx on public.wishlist_signups (email);

alter table public.wishlist_signups enable row level security;

-- Public insert only; no public read (prevents email harvesting)
create policy "Anyone can join wishlist"
  on public.wishlist_signups for insert
  with check (true);

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
