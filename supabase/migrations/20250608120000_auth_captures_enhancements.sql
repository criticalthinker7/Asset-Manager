-- Newsletter signups + wishlist source + richer profile trigger

alter table public.wishlist_signups
  add column if not exists source text;

create table if not exists public.newsletter_signups (
  id bigint generated always as identity primary key,
  name text,
  email text not null,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_signups_email_idx on public.newsletter_signups (email);

alter table public.newsletter_signups enable row level security;

drop policy if exists "Anyone can join newsletter" on public.newsletter_signups;
create policy "Anyone can join newsletter"
  on public.newsletter_signups for insert
  with check (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, province, discipline, career)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'province', ''),
    nullif(new.raw_user_meta_data ->> 'discipline', ''),
    nullif(new.raw_user_meta_data ->> 'career', '')
  );
  return new;
end;
$$;
