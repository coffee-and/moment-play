-- Keep the release profile placeholder within profiles.nickname's 12-character
-- constraint: "Player-" is seven characters, leaving five UUID characters.

create or replace function public.omok_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(new.is_anonymous, false) then
    raise exception 'Anonymous accounts are not supported'
      using errcode = '42501';
  end if;

  insert into public.profiles (user_id, nickname)
  values (new.id, 'Player-' || left(new.id::text, 5))
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.omok_get_profile_nickname(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  profile_nickname text;
begin
  insert into public.profiles (user_id, nickname)
  select auth_user.id, 'Player-' || left(auth_user.id::text, 5)
  from auth.users as auth_user
  where auth_user.id = target_user_id
    and coalesce(auth_user.is_anonymous, false) = false
  on conflict (user_id) do nothing;

  update public.profiles
  set last_active_at = now()
  where user_id = target_user_id;

  select nickname
  into profile_nickname
  from public.profiles
  where user_id = target_user_id;

  if profile_nickname is null then
    raise exception 'Authenticated profile not found' using errcode = '42501';
  end if;

  return profile_nickname;
end;
$$;
