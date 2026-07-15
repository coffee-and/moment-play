-- Keep an existing waiting-room membership aligned with the user's latest
-- profile nickname. Friend-game invite acceptance creates the guest membership
-- before the room route performs its normal profile check; after nickname setup
-- the repeated join call must refresh that already-existing row instead of
-- returning with the stale Guest-xxxxxx value.

create or replace function public.omok_join_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  target_room public.omok_rooms%rowtype;
  profile_nickname text;
  existing_role text;
begin
  if current_user_id is null then
    raise exception '인증된 사용자만 방에 입장할 수 있습니다.';
  end if;

  select * into target_room
  from public.omok_rooms
  where id = p_room_id
  for update;

  if not found then
    raise exception '방을 찾을 수 없습니다.';
  end if;

  profile_nickname := public.omok_get_profile_nickname(current_user_id);

  select player.role
  into existing_role
  from public.omok_room_players as player
  where player.room_id = p_room_id
    and player.user_id = current_user_id
  for update;

  if existing_role is not null then
    -- Nicknames are immutable once play starts. During the waiting state, a
    -- post-invite nickname setup refreshes the already-created membership.
    if target_room.status = 'waiting' then
      update public.omok_room_players
      set nickname = profile_nickname
      where room_id = p_room_id
        and user_id = current_user_id;

      update public.omok_rooms
      set title = case
            when existing_role = 'host' then profile_nickname || '님의 방'
            else title
          end,
          last_activity_at = now()
      where id = p_room_id;
    end if;

    return;
  end if;

  if target_room.status <> 'waiting' then
    raise exception '이미 시작된 방입니다.';
  end if;

  if exists (
    select 1
    from public.omok_room_players
    where room_id = p_room_id
      and role = 'guest'
  ) then
    raise exception '이미 참가자가 있는 방입니다.';
  end if;

  insert into public.omok_room_players (
    room_id,
    user_id,
    nickname,
    role,
    ready,
    show_forbidden_positions,
    explain_forbidden_reasons
  )
  values (
    p_room_id,
    current_user_id,
    profile_nickname,
    'guest',
    false,
    true,
    true
  );

  update public.omok_rooms
  set last_activity_at = now()
  where id = p_room_id;
end;
$$;

revoke all on function public.omok_join_room(uuid) from public, anon, authenticated;
grant execute on function public.omok_join_room(uuid) to authenticated;
