-- Adds shared room-level guide permissions to public.omok_rooms and the RPCs
-- needed to change shared room settings (host-only) and per-player guide
-- preferences (own row only). Shared setting changes reset stale ready states
-- atomically; personal guide preferences preserve both players' readiness.
-- Forward-only: 20260711000000 and 20260711010000 are already applied
-- remotely and are not modified here.

alter table public.omok_rooms
  add column allow_forbidden_positions boolean not null default true,
  add column allow_forbidden_reasons boolean not null default true;

-- omok_create_room gains two room-level permission params. The 3-arg
-- overload from the initial migration is dropped so clients cannot bypass
-- the new room-level permissions by calling the old signature.
drop function if exists public.omok_create_room(text, boolean, boolean);

create or replace function public.omok_create_room(
  p_game_mode text,
  p_show_forbidden_positions boolean,
  p_explain_forbidden_reasons boolean,
  p_allow_forbidden_positions boolean,
  p_allow_forbidden_reasons boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  profile_nickname text;
  new_room_id uuid;
begin
  if current_user_id is null then
    raise exception '인증된 사용자만 방을 만들 수 있습니다.';
  end if;

  if p_game_mode not in ('standard', 'free') then
    raise exception '지원하지 않는 오목 규칙입니다.';
  end if;

  profile_nickname := public.omok_get_profile_nickname(current_user_id);

  insert into public.omok_rooms (
    host_user_id,
    title,
    game_mode,
    allow_forbidden_positions,
    allow_forbidden_reasons
  )
  values (
    current_user_id,
    profile_nickname || '님의 방',
    p_game_mode,
    coalesce(p_allow_forbidden_positions, true),
    coalesce(p_allow_forbidden_reasons, true)
  )
  returning id into new_room_id;

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
    new_room_id,
    current_user_id,
    profile_nickname,
    'host',
    false,
    coalesce(p_show_forbidden_positions, true),
    coalesce(p_explain_forbidden_reasons, true)
  );

  return new_room_id;
end;
$$;

create or replace function public.omok_update_room_settings(
  p_room_id uuid,
  p_game_mode text,
  p_allow_forbidden_positions boolean,
  p_allow_forbidden_reasons boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_room public.omok_rooms%rowtype;
  settings_changed boolean;
begin
  if current_user_id is null then
    raise exception '인증된 사용자만 방 설정을 변경할 수 있습니다.';
  end if;

  if p_game_mode is null or p_game_mode not in ('standard', 'free') then
    raise exception '지원하지 않는 오목 규칙입니다.';
  end if;

  if p_allow_forbidden_positions is null or p_allow_forbidden_reasons is null then
    raise exception '금수 안내 허용 값이 올바르지 않습니다.';
  end if;

  select * into target_room
  from public.omok_rooms
  where id = p_room_id
  for update;

  if not found then
    raise exception '방을 찾을 수 없습니다.';
  end if;

  if target_room.host_user_id <> current_user_id then
    raise exception '방장만 방 설정을 변경할 수 있습니다.';
  end if;

  if target_room.status <> 'waiting' then
    raise exception '대기 중인 방에서만 설정을 변경할 수 있습니다.';
  end if;

  settings_changed := (
    target_room.game_mode <> p_game_mode
    or target_room.allow_forbidden_positions <> p_allow_forbidden_positions
    or target_room.allow_forbidden_reasons <> p_allow_forbidden_reasons
  );

  if not settings_changed then
    return;
  end if;

  update public.omok_rooms
  set game_mode = p_game_mode,
      allow_forbidden_positions = p_allow_forbidden_positions,
      allow_forbidden_reasons = p_allow_forbidden_reasons,
      last_activity_at = now()
  where id = p_room_id;

  update public.omok_room_players
  set ready = false
  where room_id = p_room_id
    and ready = true;

  update public.profiles
  set last_active_at = now()
  where user_id = current_user_id;
end;
$$;

create or replace function public.omok_update_player_guide_preferences(
  p_room_id uuid,
  p_show_forbidden_positions boolean,
  p_explain_forbidden_reasons boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_room public.omok_rooms%rowtype;
  current_player public.omok_room_players%rowtype;
  preferences_changed boolean;
begin
  if current_user_id is null then
    raise exception '인증된 사용자만 개인 설정을 변경할 수 있습니다.';
  end if;

  if p_show_forbidden_positions is null or p_explain_forbidden_reasons is null then
    raise exception '금수 안내 설정 값이 올바르지 않습니다.';
  end if;

  select * into target_room
  from public.omok_rooms
  where id = p_room_id
  for update;

  if not found then
    raise exception '방을 찾을 수 없습니다.';
  end if;

  if target_room.status <> 'waiting' then
    raise exception '대기 중인 방에서만 설정을 변경할 수 있습니다.';
  end if;

  select * into current_player
  from public.omok_room_players
  where room_id = p_room_id and user_id = current_user_id
  for update;

  if not found then
    raise exception '방 참가자만 개인 설정을 변경할 수 있습니다.';
  end if;

  preferences_changed := (
    current_player.show_forbidden_positions <> p_show_forbidden_positions
    or current_player.explain_forbidden_reasons <> p_explain_forbidden_reasons
  );

  if not preferences_changed then
    return;
  end if;

  update public.omok_room_players
  set show_forbidden_positions = p_show_forbidden_positions,
      explain_forbidden_reasons = p_explain_forbidden_reasons
  where room_id = p_room_id and user_id = current_user_id;

  update public.omok_rooms
  set last_activity_at = now()
  where id = p_room_id;

  update public.profiles
  set last_active_at = now()
  where user_id = current_user_id;
end;
$$;

-- Guide-preference columns move behind the RPC above; direct table updates
-- from clients are no longer allowed (ready stays directly updatable).
revoke update (show_forbidden_positions, explain_forbidden_reasons)
  on table public.omok_room_players from authenticated;

revoke all on function public.omok_create_room(text, boolean, boolean, boolean, boolean) from public, anon, authenticated;
revoke all on function public.omok_update_room_settings(uuid, text, boolean, boolean) from public, anon, authenticated;
revoke all on function public.omok_update_player_guide_preferences(uuid, boolean, boolean) from public, anon, authenticated;

grant execute on function public.omok_create_room(text, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.omok_update_room_settings(uuid, text, boolean, boolean) to authenticated;
grant execute on function public.omok_update_player_guide_preferences(uuid, boolean, boolean) to authenticated;
