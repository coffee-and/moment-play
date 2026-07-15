-- Hardens friend Omok invite cleanup for room and friendship lifecycle edges.

alter table public.friend_game_invites
  drop constraint friend_game_invites_response_shape;

alter table public.friend_game_invites
  add constraint friend_game_invites_response_shape check (
    (status = 'pending' and responded_at is null)
    or (status <> 'pending' and responded_at is not null)
  );

create or replace function public.moment_play_cleanup_deleted_friend_omok_invite()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.status = 'pending' then
    perform public.moment_play_cleanup_friend_omok_room(old.room_id);
  end if;

  return old;
end;
$$;

revoke all on function public.moment_play_cleanup_deleted_friend_omok_invite()
  from public, anon, authenticated;

drop trigger if exists friend_game_invites_cleanup_deleted_room
  on public.friend_game_invites;

create trigger friend_game_invites_cleanup_deleted_room
after delete on public.friend_game_invites
for each row
execute function public.moment_play_cleanup_deleted_friend_omok_invite();

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
      and (
        invite.expires_at <= now()
        or invite.room_id is null
        or not exists (
          select 1
          from public.omok_rooms as room
          join public.omok_room_players as host_player
            on host_player.room_id = room.id
           and host_player.user_id = invite.sender_id
           and host_player.role = 'host'
          where room.id = invite.room_id
            and room.status = 'waiting'
        )
      )
    returning invite.room_id
  loop
    expired_count := expired_count + 1;
    perform public.moment_play_cleanup_friend_omok_room(expired_invite.room_id);
  end loop;

  return expired_count;
end;
$$;

revoke all on function public.moment_play_expire_friend_omok_invites()
  from public, anon, authenticated;

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
    if target_invite.room_id is null
      or not exists (
        select 1
        from public.omok_rooms as room
        join public.omok_room_players as host_player
          on host_player.room_id = room.id
         and host_player.user_id = target_invite.sender_id
         and host_player.role = 'host'
        where room.id = target_invite.room_id
          and room.status = 'waiting'
      ) then
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

revoke all on function public.respond_friend_omok_invite(uuid, text)
  from public, anon;
grant execute on function public.respond_friend_omok_invite(uuid, text)
  to authenticated;
