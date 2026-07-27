-- Release authentication foundation.
--
-- Anonymous Supabase Auth users are no longer a Moment Play account type.
-- Guests remain local browser visitors and cannot create server profiles,
-- rooms, rankings, friendships, or invitations.

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
  values (new.id, 'Player-' || left(new.id::text, 6))
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
  select auth_user.id, 'Player-' || left(auth_user.id::text, 6)
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

create or replace function public.update_my_profile_nickname(p_nickname text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
  normalized_nickname text;
begin
  current_user_id := public.moment_play_require_permanent_user();
  normalized_nickname := btrim(p_nickname);

  if normalized_nickname is null
    or char_length(normalized_nickname) < 2
    or char_length(normalized_nickname) > 12 then
    raise exception 'Nickname must be between 2 and 12 characters';
  end if;

  update public.profiles
  set nickname = normalized_nickname,
      updated_at = now()
  where user_id = current_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  return normalized_nickname;
end;
$$;

revoke insert on table public.profiles from authenticated;
revoke update (nickname, updated_at) on table public.profiles from authenticated;
revoke all on function public.update_my_profile_nickname(text) from public, anon, authenticated;
grant execute on function public.update_my_profile_nickname(text) to authenticated;

-- Room retention stays in place, but account retention no longer contains an
-- anonymous-user lifecycle. Auth account deletion belongs to the future
-- account-management server workflow.
create or replace function public.moment_play_cleanup_expired_data()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  delete from public.omok_rooms
  where status = 'waiting'
    and last_activity_at < now() - interval '24 hours';

  delete from public.omok_rooms
  where last_activity_at < now() - interval '7 days';
end;
$$;

revoke all on function public.moment_play_cleanup_expired_data()
  from public, anon, authenticated;
