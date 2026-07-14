-- Persist the Canadian address fields required by the signup form.

alter table public.profiles
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists postal text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, address, city, postal, province, discipline, career)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'address', ''),
    nullif(new.raw_user_meta_data ->> 'city', ''),
    nullif(new.raw_user_meta_data ->> 'postal', ''),
    nullif(new.raw_user_meta_data ->> 'province', ''),
    nullif(new.raw_user_meta_data ->> 'discipline', ''),
    nullif(new.raw_user_meta_data ->> 'career', '')
  );
  return new;
end;
$$;
