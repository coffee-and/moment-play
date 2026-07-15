alter table public.profiles
add column friend_code text;

do $$
declare
  profile_row record;
  candidate text;
  attempt integer;
begin
  for profile_row in
    select user_id
    from public.profiles
    where friend_code is null
    order by user_id
  loop
    attempt := 0;

    loop
      candidate := upper(substr(md5(profile_row.user_id::text || ':' || attempt::text), 1, 10));

      exit when not exists (
        select 1
        from public.profiles as existing_profile
        where existing_profile.friend_code = candidate
      );

      attempt := attempt + 1;
      if attempt > 100 then
        raise exception 'Unable to allocate a unique friend code';
      end if;
    end loop;

    update public.profiles
    set friend_code = candidate
    where user_id = profile_row.user_id;
  end loop;
end;
$$;

create or replace function public.moment_play_assign_friend_code()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  candidate text;
  attempt integer := 0;
begin
  if new.friend_code is not null then
    new.friend_code := upper(btrim(new.friend_code));
    return new;
  end if;

  loop
    candidate := upper(substr(md5(new.user_id::text || ':' || attempt::text), 1, 10));

    exit when not exists (
      select 1
      from public.profiles as existing_profile
      where existing_profile.friend_code = candidate
    );

    attempt := attempt + 1;
    if attempt > 100 then
      raise exception 'Unable to allocate a unique friend code';
    end if;
  end loop;

  new.friend_code := candidate;
  return new;
end;
$$;

revoke all on function public.moment_play_assign_friend_code() from public, anon, authenticated;

drop trigger if exists moment_play_assign_friend_code on public.profiles;
create trigger moment_play_assign_friend_code
before insert on public.profiles
for each row
execute function public.moment_play_assign_friend_code();

alter table public.profiles
  alter column friend_code set not null,
  add constraint profiles_friend_code_key unique (friend_code),
  add constraint profiles_friend_code_format check (friend_code ~ '^[A-F0-9]{10}$');

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz null,
  constraint friendships_distinct_users check (requester_id <> addressee_id),
  constraint friendships_response_shape check (
    (status = 'pending' and responded_at is null)
    or (status = 'accepted' and responded_at is not null)
  )
);

create unique index friendships_unique_pair_idx
on public.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);

create index friendships_requester_status_idx
on public.friendships (requester_id, status, created_at desc);

create index friendships_addressee_status_idx
on public.friendships (addressee_id, status, created_at desc);

alter table public.friendships enable row level security;

revoke all on table public.friendships from anon, authenticated;

create policy friendships_select_participant_permanent
on public.friendships
for select
to authenticated
using (
  (requester_id = auth.uid() or addressee_id = auth.uid())
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) = false
);

create or replace function public.moment_play_require_permanent_user()
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
begin
  select auth_user.id
  into current_user_id
  from auth.users as auth_user
  where auth_user.id = auth.uid()
    and coalesce(auth_user.is_anonymous, false) = false;

  if current_user_id is null then
    raise exception 'Permanent account required' using errcode = '42501';
  end if;

  return current_user_id;
end;
$$;

revoke all on function public.moment_play_require_permanent_user() from public, anon, authenticated;

create or replace function public.get_my_friend_profile()
returns table (
  friend_code text,
  nickname text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
begin
  current_user_id := public.moment_play_require_permanent_user();

  return query
  select
    profile.friend_code,
    coalesce(profile.nickname, 'Player')
  from public.profiles as profile
  where profile.user_id = current_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

create or replace function public.find_friend_by_code(p_friend_code text)
returns table (
  friend_code text,
  nickname text,
  relationship_status text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
  target_user_id uuid;
  normalized_code text;
  existing_status text;
  existing_requester_id uuid;
begin
  current_user_id := public.moment_play_require_permanent_user();
  normalized_code := upper(btrim(p_friend_code));

  if normalized_code is null or normalized_code !~ '^[A-F0-9]{10}$' then
    raise exception 'Invalid friend code';
  end if;

  select profile.user_id
  into target_user_id
  from public.profiles as profile
  join auth.users as auth_user on auth_user.id = profile.user_id
  where profile.friend_code = normalized_code
    and coalesce(auth_user.is_anonymous, false) = false;

  if target_user_id is null then
    raise exception 'Friend code not found';
  end if;

  if target_user_id = current_user_id then
    raise exception 'You cannot add yourself';
  end if;

  select friendship.status, friendship.requester_id
  into existing_status, existing_requester_id
  from public.friendships as friendship
  where least(friendship.requester_id, friendship.addressee_id) = least(current_user_id, target_user_id)
    and greatest(friendship.requester_id, friendship.addressee_id) = greatest(current_user_id, target_user_id);

  return query
  select
    profile.friend_code,
    coalesce(profile.nickname, 'Player'),
    case
      when existing_status is null then 'none'
      when existing_status = 'accepted' then 'friend'
      when existing_requester_id = current_user_id then 'pending_outgoing'
      else 'pending_incoming'
    end
  from public.profiles as profile
  where profile.user_id = target_user_id;
end;
$$;

create or replace function public.send_friend_request(p_friend_code text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
  target_user_id uuid;
  normalized_code text;
  existing_friendship public.friendships%rowtype;
  created_friendship_id uuid;
begin
  current_user_id := public.moment_play_require_permanent_user();
  normalized_code := upper(btrim(p_friend_code));

  if normalized_code is null or normalized_code !~ '^[A-F0-9]{10}$' then
    raise exception 'Invalid friend code';
  end if;

  select profile.user_id
  into target_user_id
  from public.profiles as profile
  join auth.users as auth_user on auth_user.id = profile.user_id
  where profile.friend_code = normalized_code
    and coalesce(auth_user.is_anonymous, false) = false;

  if target_user_id is null then
    raise exception 'Friend code not found';
  end if;

  if target_user_id = current_user_id then
    raise exception 'You cannot add yourself';
  end if;

  select friendship.*
  into existing_friendship
  from public.friendships as friendship
  where least(friendship.requester_id, friendship.addressee_id) = least(current_user_id, target_user_id)
    and greatest(friendship.requester_id, friendship.addressee_id) = greatest(current_user_id, target_user_id);

  if existing_friendship.id is not null then
    if existing_friendship.status = 'accepted' then
      raise exception 'Already friends';
    end if;

    raise exception 'Friend request already exists';
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (current_user_id, target_user_id)
  returning id into created_friendship_id;

  return created_friendship_id;
exception
  when unique_violation then
    raise exception 'Friend request already exists';
end;
$$;

create or replace function public.respond_friend_request(
  p_friendship_id uuid,
  p_action text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
  normalized_action text;
  locked_friendship_id uuid;
begin
  current_user_id := public.moment_play_require_permanent_user();
  normalized_action := lower(btrim(p_action));

  if normalized_action not in ('accept', 'reject') then
    raise exception 'Unsupported friend request action';
  end if;

  select friendship.id
  into locked_friendship_id
  from public.friendships as friendship
  where friendship.id = p_friendship_id
    and friendship.addressee_id = current_user_id
    and friendship.status = 'pending'
  for update;

  if locked_friendship_id is null then
    raise exception 'Pending friend request not found';
  end if;

  if normalized_action = 'accept' then
    update public.friendships
    set status = 'accepted', responded_at = now()
    where id = locked_friendship_id;
  else
    delete from public.friendships
    where id = locked_friendship_id;
  end if;

  return locked_friendship_id;
end;
$$;

create or replace function public.cancel_friend_request(p_friendship_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
  deleted_friendship_id uuid;
begin
  current_user_id := public.moment_play_require_permanent_user();

  delete from public.friendships
  where id = p_friendship_id
    and requester_id = current_user_id
    and status = 'pending'
  returning id into deleted_friendship_id;

  if deleted_friendship_id is null then
    raise exception 'Outgoing friend request not found';
  end if;

  return deleted_friendship_id;
end;
$$;

create or replace function public.remove_friend(p_friendship_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
  deleted_friendship_id uuid;
begin
  current_user_id := public.moment_play_require_permanent_user();

  delete from public.friendships
  where id = p_friendship_id
    and status = 'accepted'
    and (requester_id = current_user_id or addressee_id = current_user_id)
  returning id into deleted_friendship_id;

  if deleted_friendship_id is null then
    raise exception 'Friendship not found';
  end if;

  return deleted_friendship_id;
end;
$$;

create or replace function public.get_friend_overview()
returns table (
  friendship_id uuid,
  friend_code text,
  nickname text,
  status text,
  direction text,
  created_at timestamptz,
  responded_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
begin
  current_user_id := public.moment_play_require_permanent_user();

  return query
  select
    friendship.id,
    profile.friend_code,
    coalesce(profile.nickname, 'Player'),
    friendship.status,
    case
      when friendship.status = 'accepted' then 'friend'
      when friendship.addressee_id = current_user_id then 'incoming'
      else 'outgoing'
    end,
    friendship.created_at,
    friendship.responded_at
  from public.friendships as friendship
  join public.profiles as profile
    on profile.user_id = case
      when friendship.requester_id = current_user_id then friendship.addressee_id
      else friendship.requester_id
    end
  where friendship.requester_id = current_user_id
     or friendship.addressee_id = current_user_id
  order by
    case when friendship.status = 'pending' then 0 else 1 end,
    friendship.created_at desc;
end;
$$;

revoke all on function public.get_my_friend_profile() from public, anon;
revoke all on function public.find_friend_by_code(text) from public, anon;
revoke all on function public.send_friend_request(text) from public, anon;
revoke all on function public.respond_friend_request(uuid, text) from public, anon;
revoke all on function public.cancel_friend_request(uuid) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.get_friend_overview() from public, anon;

grant execute on function public.get_my_friend_profile() to authenticated;
grant execute on function public.find_friend_by_code(text) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, text) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.get_friend_overview() to authenticated;
