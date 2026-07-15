-- Friend-to-friend Omok invitations for permanent Moment Play accounts.
--
-- A create RPC verifies an accepted friendship, creates the existing Omok room,
-- and stores the invitation in one transaction. Accept joins the receiver to the
-- room atomically. Decline, cancel, and expiry clean up unused waiting rooms.

create table public.friend_game_invites (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references public.friendships(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null default 'omok' check (game_key = 'omok'),
  room_id uuid null references public.omok_rooms(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  responded_at timestamptz null,
  constraint friend_game_invites_distinct_users check (sender_id <> receiver_id),
  constraint friend_game_invites_expiry_after_creation check (expires_at > created_at),
  constraint friend_game_invites_response_shape check (
    (status = 'pending' and responded_at is null and room_id is not null)
    or (status <> 'pending' and responded_at is not null)
  )
);

create unique index friend_game_invites_one_pending_pair_idx
on public.friend_game_invites (
  least(sender_id, receiver_id),
  greatest(sender_id, receiver_id)
)
where status = 'pending';

create unique index friend_game_invites_room_idx
on public.friend_game_invites (room_id)
where room_id is not null;

create index friend_game_invites_receiver_status_idx
on public.friend_game_invites (receiver_id, status, created_at desc);

create index friend_game_invites_sender_status_idx
on public.friend_game_invites (sender_id, status, created_at desc);

create index friend_game_invites_pending_expiry_idx
on public.friend_game_invites (expires_at)
where status = 'pending';

alter table public.friend_game_invites enable row level security;

revoke all on table public.friend_game_invites from anon, authenticated;

create policy friend_game_invites_select_participant_permanent
on public.friend_game_invites
for select
to authenticated
using (
  (sender_id = auth.uid() or receiver_id = auth.uid())
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) = false
);

create or replace function public.moment_play_cleanup_friend_omok_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_room_id is null then
    return;
  end if;

  delete from public.omok_rooms as room
  where room.id = p_room_id
    and room.status = 'waiting'
    and not exists (
      select 1
      from public.omok_room_players as player
      where player.room_id = room.id
        and player.role = 'guest'
    );
end;
$$;

create or replace function public.moment_play_expire_friend_omok_invites()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  expired_invite record;
  expired_count integer := 0;
begin
  for expired_invite in
    update public.friend_game_invites as invite
    set status = 'expired',
        responded_at = now()
    where invite.status = 'pending'
      and invite.expires_at <= now()
    returning invite.room_id
  loop
    expired_count := expired_count + 1;
    perform public.moment_play_cleanup_friend_omok_room(expired_invite.room_id);
  end loop;

  return expired_count;
end;
$$;

revoke all on function public.moment_play_cleanup_friend_omok_room(uuid)
  from public, anon, authenticated;
revoke all on function public.moment_play_expire_friend_omok_invites()
  from public, anon, authenticated;

create or replace function public.create_friend_omok_invite(
  p_friendship_id uuid,
  p_game_mode text,
  p_show_forbidden_positions boolean,
  p_explain_forbidden_reasons boolean,
  p_allow_forbidden_positions boolean,
  p_allow_forbidden_reasons boolean
)
returns table (
  invite_id uuid,
  room_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
  target_friendship public.friendships%rowtype;
  target_receiver_id uuid;
  created_room_id uuid;
  created_invite_id uuid;
  created_expires_at timestamptz;
begin
  current_user_id := public.moment_play_require_permanent_user();

  if p_game_mode is null or p_game_mode not in ('standard', 'free') then
    raise exception 'Unsupported Omok game mode';
  end if;

  if p_show_forbidden_positions is null
    or p_explain_forbidden_reasons is null
    or p_allow_forbidden_positions is null
    or p_allow_forbidden_reasons is null then
    raise exception 'Omok invite settings are required';
  end if;

  perform public.moment_play_expire_friend_omok_invites();

  select friendship.*
  into target_friendship
  from public.friendships as friendship
  where friendship.id = p_friendship_id
    and friendship.status = 'accepted'
    and (
      friendship.requester_id = current_user_id
      or friendship.addressee_id = current_user_id
    )
  for update;

  if not found then
    raise exception 'Accepted friendship not found';
  end if;

  target_receiver_id := case
    when target_friendship.requester_id = current_user_id
      then target_friendship.addressee_id
    else target_friendship.requester_id
  end;

  if exists (
    select 1
    from public.friend_game_invites as invite
    where invite.status = 'pending'
      and invite.expires_at > now()
      and least(invite.sender_id, invite.receiver_id) = least(current_user_id, target_receiver_id)
      and greatest(invite.sender_id, invite.receiver_id) = greatest(current_user_id, target_receiver_id)
  ) then
    raise exception 'Active Omok invite already exists';
  end if;

  created_room_id := public.omok_create_room(
    p_game_mode,
    p_show_forbidden_positions,
    p_explain_forbidden_reasons,
    p_allow_forbidden_positions,
    p_allow_forbidden_reasons
  );

  insert into public.friend_game_invites (
    friendship_id,
    sender_id,
    receiver_id,
    room_id
  )
  values (
    target_friendship.id,
    current_user_id,
    target_receiver_id,
    created_room_id
  )
  returning id, friend_game_invites.expires_at
  into created_invite_id, created_expires_at;

  return query
  select created_invite_id, created_room_id, created_expires_at;
exception
  when unique_violation then
    raise exception 'Active Omok invite already exists';
end;
$$;

create or replace function public.respond_friend_omok_invite(
  p_invite_id uuid,
  p_action text
)
returns table (
  invite_id uuid,
  room_id uuid,
  invite_status text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
  normalized_action text;
  target_invite public.friend_game_invites%rowtype;
begin
  current_user_id := public.moment_play_require_permanent_user();
  normalized_action := lower(btrim(p_action));

  if normalized_action is null or normalized_action not in ('accept', 'decline') then
    raise exception 'Unsupported Omok invite action';
  end if;

  select invite.*
  into target_invite
  from public.friend_game_invites as invite
  where invite.id = p_invite_id
    and invite.receiver_id = current_user_id
  for update;

  if not found then
    raise exception 'Incoming Omok invite not found';
  end if;

  if target_invite.status <> 'pending' then
    raise exception 'Omok invite is no longer pending';
  end if;

  if target_invite.expires_at <= now() then
    raise exception 'Omok invite expired';
  end if;

  if normalized_action = 'accept' then
    if target_invite.room_id is null then
      raise exception 'Omok invite room is unavailable';
    end if;

    perform public.omok_join_room(target_invite.room_id);

    update public.friend_game_invites as invite
    set status = 'accepted',
        responded_at = now()
    where invite.id = target_invite.id;
  else
    update public.friend_game_invites as invite
    set status = 'declined',
        responded_at = now()
    where invite.id = target_invite.id;

    perform public.moment_play_cleanup_friend_omok_room(target_invite.room_id);
  end if;

  return query
  select
    invite.id,
    invite.room_id,
    invite.status
  from public.friend_game_invites as invite
  where invite.id = target_invite.id;
end;
$$;

create or replace function public.cancel_friend_omok_invite(p_invite_id uuid)
returns table (
  invite_id uuid,
  room_id uuid,
  invite_status text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
  target_invite public.friend_game_invites%rowtype;
begin
  current_user_id := public.moment_play_require_permanent_user();

  select invite.*
  into target_invite
  from public.friend_game_invites as invite
  where invite.id = p_invite_id
    and invite.sender_id = current_user_id
  for update;

  if not found then
    raise exception 'Outgoing Omok invite not found';
  end if;

  if target_invite.status <> 'pending' then
    raise exception 'Omok invite is no longer pending';
  end if;

  if target_invite.expires_at <= now() then
    raise exception 'Omok invite expired';
  end if;

  update public.friend_game_invites as invite
  set status = 'cancelled',
      responded_at = now()
  where invite.id = target_invite.id;

  perform public.moment_play_cleanup_friend_omok_room(target_invite.room_id);

  return query
  select
    invite.id,
    invite.room_id,
    invite.status
  from public.friend_game_invites as invite
  where invite.id = target_invite.id;
end;
$$;

create or replace function public.get_friend_omok_invites()
returns table (
  invite_id uuid,
  direction text,
  status text,
  friend_code text,
  nickname text,
  room_id uuid,
  game_mode text,
  created_at timestamptz,
  expires_at timestamptz,
  responded_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
begin
  current_user_id := public.moment_play_require_permanent_user();
  perform public.moment_play_expire_friend_omok_invites();

  return query
  select
    invite.id,
    case when invite.receiver_id = current_user_id then 'incoming' else 'outgoing' end,
    invite.status,
    profile.friend_code,
    coalesce(profile.nickname, 'Player'),
    invite.room_id,
    room.game_mode,
    invite.created_at,
    invite.expires_at,
    invite.responded_at
  from public.friend_game_invites as invite
  join public.profiles as profile
    on profile.user_id = case
      when invite.sender_id = current_user_id then invite.receiver_id
      else invite.sender_id
    end
  left join public.omok_rooms as room on room.id = invite.room_id
  where invite.sender_id = current_user_id
     or invite.receiver_id = current_user_id
  order by
    case when invite.status = 'pending' then 0 else 1 end,
    invite.created_at desc;
end;
$$;

create or replace function public.get_pending_friend_omok_invite_count()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid;
  pending_count integer;
begin
  current_user_id := public.moment_play_require_permanent_user();
  perform public.moment_play_expire_friend_omok_invites();

  select count(*)::integer
  into pending_count
  from public.friend_game_invites as invite
  where invite.receiver_id = current_user_id
    and invite.status = 'pending'
    and invite.expires_at > now();

  return pending_count;
end;
$$;

revoke all on function public.create_friend_omok_invite(uuid, text, boolean, boolean, boolean, boolean)
  from public, anon;
revoke all on function public.respond_friend_omok_invite(uuid, text)
  from public, anon;
revoke all on function public.cancel_friend_omok_invite(uuid)
  from public, anon;
revoke all on function public.get_friend_omok_invites()
  from public, anon;
revoke all on function public.get_pending_friend_omok_invite_count()
  from public, anon;

grant execute on function public.create_friend_omok_invite(uuid, text, boolean, boolean, boolean, boolean)
  to authenticated;
grant execute on function public.respond_friend_omok_invite(uuid, text)
  to authenticated;
grant execute on function public.cancel_friend_omok_invite(uuid)
  to authenticated;
grant execute on function public.get_friend_omok_invites()
  to authenticated;
grant execute on function public.get_pending_friend_omok_invite_count()
  to authenticated;
