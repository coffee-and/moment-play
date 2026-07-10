-- Omok online friend rooms for moment-play.

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 12),
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.omok_rooms (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 40),
  game_mode text not null default 'standard' check (game_mode in ('standard', 'free')),
  status text not null default 'waiting' check (status in ('waiting', 'playing')),
  current_round integer not null default 1 check (current_round >= 1),
  round_requested_by uuid null references auth.users(id) on delete set null,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.omok_room_players (
  room_id uuid not null references public.omok_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 12),
  role text not null check (role in ('host', 'guest')),
  ready boolean not null default false,
  show_forbidden_positions boolean not null default true,
  explain_forbidden_reasons boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.omok_room_moves (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  round_number integer not null check (round_number >= 1),
  move_number integer not null check (move_number >= 0),
  player_user_id uuid not null,
  row_index integer not null check (row_index >= 0 and row_index < 15),
  col_index integer not null check (col_index >= 0 and col_index < 15),
  stone text not null check (stone in ('black', 'white')),
  created_at timestamptz not null default now(),
  foreign key (room_id, player_user_id)
    references public.omok_room_players(room_id, user_id)
    on delete cascade,
  foreign key (room_id)
    references public.omok_rooms(id)
    on delete cascade,
  unique (room_id, round_number, move_number),
  unique (room_id, round_number, row_index, col_index)
);

create unique index omok_room_players_one_host_idx
on public.omok_room_players(room_id)
where role = 'host';

create unique index omok_room_players_one_guest_idx
on public.omok_room_players(room_id)
where role = 'guest';

create index omok_rooms_host_user_id_idx
on public.omok_rooms(host_user_id);

create index omok_rooms_status_created_at_idx
on public.omok_rooms(status, created_at desc);

create index omok_room_players_user_id_idx
on public.omok_room_players(user_id);

create index omok_room_moves_room_round_move_idx
on public.omok_room_moves(room_id, round_number, move_number);

create or replace function public.omok_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.omok_set_updated_at();

create trigger omok_rooms_set_updated_at
before update on public.omok_rooms
for each row
execute function public.omok_set_updated_at();

create or replace function public.profiles_touch_last_active()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.last_active_at = now();
  return new;
end;
$$;

create trigger profiles_touch_last_active_trigger
before update on public.profiles
for each row
execute function public.profiles_touch_last_active();

create or replace function public.omok_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, nickname)
  values (new.id, 'Guest-' || left(new.id::text, 6))
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger omok_auth_user_created
after insert on auth.users
for each row
execute function public.omok_handle_new_auth_user();

create or replace function public.omok_is_room_member(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.omok_room_players as player
    where player.room_id = target_room_id
      and player.user_id = auth.uid()
  );
$$;

create or replace function public.omok_room_players_touch_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.omok_rooms
  set last_activity_at = now()
  where id = new.room_id;

  update public.profiles
  set last_active_at = now()
  where user_id = new.user_id;

  return new;
end;
$$;

create trigger omok_room_players_touch_activity_trigger
after update on public.omok_room_players
for each row
execute function public.omok_room_players_touch_activity();

alter table public.profiles enable row level security;
alter table public.omok_rooms enable row level security;
alter table public.omok_room_players enable row level security;
alter table public.omok_room_moves enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.omok_rooms from anon, authenticated;
revoke all on table public.omok_room_players from anon, authenticated;
revoke all on table public.omok_room_moves from anon, authenticated;

grant select, insert on table public.profiles to authenticated;
grant update (nickname, updated_at) on table public.profiles to authenticated;

grant select on table public.omok_rooms to authenticated;

grant select on table public.omok_room_players to authenticated;
grant update (ready, show_forbidden_positions, explain_forbidden_reasons) on table public.omok_room_players to authenticated;
grant delete on table public.omok_room_players to authenticated;

grant select on table public.omok_room_moves to authenticated;

grant execute on function public.omok_is_room_member(uuid) to authenticated;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (user_id = auth.uid());

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy omok_rooms_select_members
on public.omok_rooms
for select
to authenticated
using (public.omok_is_room_member(id));

create policy omok_room_players_select_members
on public.omok_room_players
for select
to authenticated
using (public.omok_is_room_member(room_id));

create policy omok_room_players_update_self
on public.omok_room_players
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy omok_room_players_delete_self
on public.omok_room_players
for delete
to authenticated
using (user_id = auth.uid());

create policy omok_room_moves_select_members
on public.omok_room_moves
for select
to authenticated
using (public.omok_is_room_member(room_id));

create or replace function public.omok_count_line(
  target_room_id uuid,
  target_round_number integer,
  target_row_index integer,
  target_col_index integer,
  target_stone text,
  delta_row integer,
  delta_col integer
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  line_count integer := 1;
  step_count integer := 1;
begin
  loop
    exit when not exists (
      select 1
      from public.omok_room_moves
      where room_id = target_room_id
        and round_number = target_round_number
        and row_index = target_row_index + (step_count * delta_row)
        and col_index = target_col_index + (step_count * delta_col)
        and stone = target_stone
    );

    line_count := line_count + 1;
    step_count := step_count + 1;
  end loop;

  step_count := 1;

  loop
    exit when not exists (
      select 1
      from public.omok_room_moves
      where room_id = target_room_id
        and round_number = target_round_number
        and row_index = target_row_index - (step_count * delta_row)
        and col_index = target_col_index - (step_count * delta_col)
        and stone = target_stone
    );

    line_count := line_count + 1;
    step_count := step_count + 1;
  end loop;

  return line_count;
end;
$$;

create or replace function public.omok_round_has_winner(
  target_room_id uuid,
  target_round_number integer,
  target_game_mode text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  move_record record;
  direction_record record;
  line_count integer;
begin
  for move_record in
    select row_index, col_index, stone
    from public.omok_room_moves
    where room_id = target_room_id
      and round_number = target_round_number
  loop
    for direction_record in
      select *
      from (values (1, 0), (0, 1), (1, 1), (1, -1)) as direction(delta_row, delta_col)
    loop
      line_count := public.omok_count_line(
        target_room_id,
        target_round_number,
        move_record.row_index,
        move_record.col_index,
        move_record.stone,
        direction_record.delta_row,
        direction_record.delta_col
      );

      if target_game_mode = 'standard' and move_record.stone = 'black' and line_count = 5 then
        return true;
      end if;

      if (target_game_mode = 'free' or move_record.stone = 'white') and line_count >= 5 then
        return true;
      end if;
    end loop;
  end loop;

  return false;
end;
$$;

create or replace function public.omok_round_is_finished(
  target_room_id uuid,
  target_round_number integer,
  target_game_mode text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.omok_round_has_winner(target_room_id, target_round_number, target_game_mode)
    or (
      select count(*) >= 225
      from public.omok_room_moves
      where room_id = target_room_id
        and round_number = target_round_number
    );
$$;

create or replace function public.omok_get_profile_nickname(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_nickname text;
begin
  insert into public.profiles (user_id, nickname)
  values (target_user_id, 'Guest-' || left(target_user_id::text, 6))
  on conflict (user_id) do nothing;

  update public.profiles
  set last_active_at = now()
  where user_id = target_user_id;

  select nickname into profile_nickname
  from public.profiles
  where user_id = target_user_id;

  return profile_nickname;
end;
$$;

create or replace function public.omok_create_room(
  p_game_mode text,
  p_show_forbidden_positions boolean,
  p_explain_forbidden_reasons boolean
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

  insert into public.omok_rooms (host_user_id, title, game_mode)
  values (current_user_id, profile_nickname || '님의 방', p_game_mode)
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

create or replace function public.omok_join_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_room public.omok_rooms%rowtype;
  profile_nickname text;
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

  if exists (
    select 1 from public.omok_room_players
    where room_id = p_room_id and user_id = current_user_id
  ) then
    return;
  end if;

  if target_room.status <> 'waiting' then
    raise exception '이미 시작된 방입니다.';
  end if;

  if exists (
    select 1 from public.omok_room_players
    where room_id = p_room_id and role = 'guest'
  ) then
    raise exception '이미 참가자가 있는 방입니다.';
  end if;

  profile_nickname := public.omok_get_profile_nickname(current_user_id);

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

create or replace function public.omok_start_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_room public.omok_rooms%rowtype;
  player_count integer;
  ready_count integer;
begin
  select * into target_room
  from public.omok_rooms
  where id = p_room_id
  for update;

  if not found then
    raise exception '방을 찾을 수 없습니다.';
  end if;

  if target_room.host_user_id <> current_user_id then
    raise exception '방장만 시작할 수 있습니다.';
  end if;

  if target_room.status <> 'waiting' then
    raise exception '이미 시작된 방입니다.';
  end if;

  select count(*), count(*) filter (where ready)
  into player_count, ready_count
  from public.omok_room_players
  where room_id = p_room_id;

  if player_count <> 2 or ready_count <> 2 then
    raise exception '두 플레이어가 모두 준비해야 시작할 수 있습니다.';
  end if;

  update public.omok_rooms
  set status = 'playing',
      current_round = 1,
      round_requested_by = null,
      last_activity_at = now()
  where id = p_room_id;

  update public.profiles
  set last_active_at = now()
  where user_id = current_user_id;
end;
$$;

create or replace function public.omok_submit_move(
  p_room_id uuid,
  p_round_number integer,
  p_move_number integer,
  p_row_index integer,
  p_col_index integer,
  p_stone text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_room public.omok_rooms%rowtype;
  player_role text;
  expected_stone text;
  current_move_count integer;
  player_count integer;
begin
  if p_row_index < 0 or p_row_index >= 15 or p_col_index < 0 or p_col_index >= 15 then
    raise exception '보드 위치가 올바르지 않습니다.';
  end if;

  select * into target_room
  from public.omok_rooms
  where id = p_room_id
  for update;

  if not found then
    raise exception '방을 찾을 수 없습니다.';
  end if;

  if target_room.status <> 'playing' then
    raise exception '아직 시작되지 않은 방입니다.';
  end if;

  if p_round_number <> target_room.current_round then
    raise exception '현재 라운드와 맞지 않습니다.';
  end if;

  select role into player_role
  from public.omok_room_players
  where room_id = p_room_id and user_id = current_user_id;

  if player_role is null then
    raise exception '방 참가자만 착수할 수 있습니다.';
  end if;

  expected_stone := case when player_role = 'host' then 'black' else 'white' end;
  if p_stone <> expected_stone then
    raise exception '내 돌 차례가 아닙니다.';
  end if;

  if p_stone <> case when mod(p_move_number, 2) = 0 then 'black' else 'white' end then
    raise exception '착수 순서가 올바르지 않습니다.';
  end if;

  select count(*) into player_count
  from public.omok_room_players
  where room_id = p_room_id;

  if player_count <> 2 then
    raise exception '상대가 있는 방에서만 착수할 수 있습니다.';
  end if;

  select count(*) into current_move_count
  from public.omok_room_moves
  where room_id = p_room_id and round_number = p_round_number;

  if public.omok_round_is_finished(p_room_id, p_round_number, target_room.game_mode) then
    raise exception '이미 종료된 라운드입니다.';
  end if;

  if current_move_count <> p_move_number then
    raise exception '최신 착수를 반영한 뒤 다시 시도해 주세요.';
  end if;

  insert into public.omok_room_moves (
    room_id,
    round_number,
    move_number,
    player_user_id,
    row_index,
    col_index,
    stone
  )
  values (
    p_room_id,
    p_round_number,
    p_move_number,
    current_user_id,
    p_row_index,
    p_col_index,
    p_stone
  );

  update public.omok_rooms
  set last_activity_at = now()
  where id = p_room_id;

  update public.profiles
  set last_active_at = now()
  where user_id = current_user_id;
end;
$$;

create or replace function public.omok_request_rematch(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_room public.omok_rooms%rowtype;
  player_count integer;
begin
  select * into target_room
  from public.omok_rooms
  where id = p_room_id
  for update;

  if not found or not public.omok_is_room_member(p_room_id) then
    raise exception '방 참가자만 재대결을 요청할 수 있습니다.';
  end if;

  if target_room.status <> 'playing' then
    raise exception '진행 중인 방에서만 재대결을 요청할 수 있습니다.';
  end if;

  if not public.omok_round_is_finished(p_room_id, target_room.current_round, target_room.game_mode) then
    raise exception '대국 종료 후 재대결을 요청할 수 있습니다.';
  end if;

  select count(*) into player_count
  from public.omok_room_players
  where room_id = p_room_id;

  if player_count <> 2 then
    raise exception '상대가 나간 방에서는 새 방을 만들어 주세요.';
  end if;

  if target_room.round_requested_by is not null
    and target_room.round_requested_by <> current_user_id then
    raise exception '상대의 재대결 요청을 먼저 수락하거나 기다려 주세요.';
  end if;

  update public.omok_rooms
  set round_requested_by = current_user_id,
      last_activity_at = now()
  where id = p_room_id;

  update public.profiles
  set last_active_at = now()
  where user_id = current_user_id;
end;
$$;

create or replace function public.omok_cancel_rematch(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.omok_rooms
  set round_requested_by = null,
      last_activity_at = now()
  where id = p_room_id
    and round_requested_by = auth.uid();

  update public.profiles
  set last_active_at = now()
  where user_id = auth.uid();
end;
$$;

create or replace function public.omok_accept_rematch(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_room public.omok_rooms%rowtype;
  player_count integer;
begin
  select * into target_room
  from public.omok_rooms
  where id = p_room_id
  for update;

  if not found or not public.omok_is_room_member(p_room_id) then
    raise exception '방 참가자만 재대결을 수락할 수 있습니다.';
  end if;

  if target_room.round_requested_by is null then
    raise exception '수락할 재대결 요청이 없습니다.';
  end if;

  if target_room.round_requested_by = current_user_id then
    raise exception '상대가 수락할 때까지 기다려 주세요.';
  end if;

  if not public.omok_round_is_finished(p_room_id, target_room.current_round, target_room.game_mode) then
    raise exception '대국 종료 후 재대결을 수락할 수 있습니다.';
  end if;

  select count(*) into player_count
  from public.omok_room_players
  where room_id = p_room_id;

  if player_count <> 2 then
    raise exception '상대가 나간 방에서는 새 방을 만들어 주세요.';
  end if;

  update public.omok_rooms
  set current_round = current_round + 1,
      round_requested_by = null,
      last_activity_at = now()
  where id = p_room_id
    and current_round = target_room.current_round
    and round_requested_by = target_room.round_requested_by;

  update public.profiles
  set last_active_at = now()
  where user_id = current_user_id;
end;
$$;

create or replace function public.omok_leave_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.omok_room_players
  where room_id = p_room_id and user_id = auth.uid();

  update public.omok_rooms
  set last_activity_at = now()
  where id = p_room_id;

  update public.profiles
  set last_active_at = now()
  where user_id = auth.uid();
end;
$$;

revoke all on function public.omok_get_profile_nickname(uuid) from public, anon, authenticated;
revoke all on function public.omok_count_line(uuid, integer, integer, integer, text, integer, integer) from public, anon, authenticated;
revoke all on function public.omok_round_has_winner(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.omok_round_is_finished(uuid, integer, text) from public, anon, authenticated;

grant execute on function public.omok_create_room(text, boolean, boolean) to authenticated;
grant execute on function public.omok_join_room(uuid) to authenticated;
grant execute on function public.omok_start_room(uuid) to authenticated;
grant execute on function public.omok_submit_move(uuid, integer, integer, integer, integer, text) to authenticated;
grant execute on function public.omok_request_rematch(uuid) to authenticated;
grant execute on function public.omok_cancel_rematch(uuid) to authenticated;
grant execute on function public.omok_accept_rematch(uuid) to authenticated;
grant execute on function public.omok_leave_room(uuid) to authenticated;
