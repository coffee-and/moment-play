create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.ranked_game_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null check (game_key in ('2048', 'memory', 'sudoku')),
  mode text null,
  seed bigint null check (seed is null or seed between 1 and 2147483646),
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'),
  status text not null default 'open' check (status in ('open', 'completed')),
  started_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp() + interval '24 hours'),
  completed_at timestamptz null,
  client_submission_id uuid null,
  constraint ranked_game_attempt_shape_check check (
    (game_key in ('2048', 'memory') and mode is null and seed is not null)
    or (game_key = 'sudoku' and mode in ('easy', 'medium', 'advanced') and seed is null)
  )
);

alter table private.ranked_game_attempts enable row level security;
revoke all on table private.ranked_game_attempts from public, anon, authenticated;

create unique index ranked_game_attempts_one_open_per_game_idx
on private.ranked_game_attempts(user_id, game_key)
where status = 'open';

create table private.ranked_sudoku_puzzles (
  puzzle_id text primary key,
  mode text not null check (mode in ('easy', 'medium', 'advanced')),
  solution text not null check (solution ~ '^[1-9]{81}$')
);

alter table private.ranked_sudoku_puzzles enable row level security;
revoke all on table private.ranked_sudoku_puzzles from public, anon, authenticated;

insert into private.ranked_sudoku_puzzles (puzzle_id, mode, solution)
values
  ('ocean-01', 'easy', '534678912672195348198342567859761423426853791713924856961537284287419635345286179'),
  ('ocean-02', 'medium', '534678912672195348198342567859761423426853791713924856961537284287419635345286179'),
  ('ocean-03', 'advanced', '534678912672195348198342567859761423426853791713924856961537284287419635345286179');

alter table public.game_results
add column attempt_id uuid null references private.ranked_game_attempts(id) on delete restrict,
add column verified_at timestamptz null,
add constraint game_results_attempt_verification_check
check (attempt_id is null or verified_at is not null);

create unique index game_results_attempt_id_unique_idx
on public.game_results(attempt_id)
where attempt_id is not null;

-- Omok rows could never be inserted through the former client policy. Preserve
-- those server-owned rows while excluding every historical client-trusted row.
update public.game_results
set verified_at = created_at
where game_key = 'omok';

revoke insert on table public.game_results from authenticated;
revoke insert (user_id, game_key, mode, score_value, duration_ms, match_result, client_submission_id)
on table public.game_results from authenticated;
drop policy if exists game_results_insert_permanent_own on public.game_results;

drop index if exists public.game_results_score_leaderboard_idx;
drop index if exists public.game_results_duration_leaderboard_idx;

create index game_results_score_leaderboard_idx
on public.game_results(game_key, mode, score_value desc, created_at asc)
where verified_at is not null and game_key in ('2048', 'memory');

create index game_results_duration_leaderboard_idx
on public.game_results(game_key, mode, duration_ms asc, created_at asc)
where verified_at is not null and game_key = 'sudoku';

create or replace function private.ranked_next_random(p_state bigint)
returns bigint
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select mod(p_state * 48271, 2147483647);
$$;

create or replace function private.ranked_2048_add_tile(
  p_board integer[],
  p_state bigint
)
returns table (board integer[], next_state bigint)
language plpgsql
immutable
strict
set search_path = pg_catalog, private
as $$
declare
  empty_indexes integer[] := array[]::integer[];
  current_state bigint := p_state;
  selected_offset integer;
  target_index integer;
  cell_index integer;
begin
  if cardinality(p_board) <> 16 then
    raise exception 'Invalid 2048 board';
  end if;

  for cell_index in 1..16 loop
    if p_board[cell_index] = 0 then
      empty_indexes := array_append(empty_indexes, cell_index);
    end if;
  end loop;

  if cardinality(empty_indexes) = 0 then
    return query select p_board, current_state;
    return;
  end if;

  current_state := private.ranked_next_random(current_state);
  selected_offset := floor(
    (current_state::numeric / 2147483647::numeric) * cardinality(empty_indexes)
  )::integer + 1;
  target_index := empty_indexes[selected_offset];

  current_state := private.ranked_next_random(current_state);
  p_board[target_index] := case
    when current_state::numeric / 2147483647::numeric < 0.9 then 2
    else 4
  end;

  return query select p_board, current_state;
end;
$$;

create or replace function private.verify_ranked_2048(
  p_seed bigint,
  p_proof jsonb
)
returns bigint
language plpgsql
immutable
strict
set search_path = pg_catalog, private
as $$
declare
  board integer[] := array_fill(0, array[16]);
  next_board integer[];
  compacted integer[];
  merged integer[];
  state bigint := p_seed;
  moves jsonb := p_proof -> 'moves';
  direction text;
  line_index integer;
  cell_offset integer;
  source_index integer;
  target_index integer;
  value_index integer;
  current_value integer;
  next_value integer;
  score bigint := 0;
  has_available_move boolean;
  row_index integer;
  column_index integer;
begin
  if jsonb_typeof(moves) <> 'array' then
    raise exception '2048 proof must contain a moves array';
  end if;
  if jsonb_array_length(moves) > 20000 then
    raise exception '2048 proof is too large';
  end if;

  select tile.board, tile.next_state
  into board, state
  from private.ranked_2048_add_tile(board, state) as tile;
  select tile.board, tile.next_state
  into board, state
  from private.ranked_2048_add_tile(board, state) as tile;

  for direction in select jsonb_array_elements_text(moves) loop
    if direction not in ('up', 'right', 'down', 'left') then
      raise exception 'Invalid 2048 move';
    end if;

    next_board := array_fill(0, array[16]);

    for line_index in 0..3 loop
      compacted := array[]::integer[];

      for cell_offset in 0..3 loop
        source_index := case
          when direction = 'left' then line_index * 4 + cell_offset + 1
          when direction = 'right' then line_index * 4 + (3 - cell_offset) + 1
          when direction = 'up' then cell_offset * 4 + line_index + 1
          else (3 - cell_offset) * 4 + line_index + 1
        end;
        if board[source_index] <> 0 then
          compacted := array_append(compacted, board[source_index]);
        end if;
      end loop;

      merged := array[]::integer[];
      value_index := 1;
      while value_index <= cardinality(compacted) loop
        current_value := compacted[value_index];
        next_value := case
          when value_index < cardinality(compacted) then compacted[value_index + 1]
          else null
        end;

        if current_value = next_value then
          merged := array_append(merged, current_value * 2);
          score := score + current_value * 2;
          value_index := value_index + 2;
        else
          merged := array_append(merged, current_value);
          value_index := value_index + 1;
        end if;
      end loop;

      while cardinality(merged) < 4 loop
        merged := array_append(merged, 0);
      end loop;

      for cell_offset in 0..3 loop
        target_index := case
          when direction = 'left' then line_index * 4 + cell_offset + 1
          when direction = 'right' then line_index * 4 + (3 - cell_offset) + 1
          when direction = 'up' then cell_offset * 4 + line_index + 1
          else (3 - cell_offset) * 4 + line_index + 1
        end;
        next_board[target_index] := merged[cell_offset + 1];
      end loop;
    end loop;

    if next_board is distinct from board then
      board := next_board;
      select tile.board, tile.next_state
      into board, state
      from private.ranked_2048_add_tile(board, state) as tile;
    end if;
  end loop;

  has_available_move := 0 = any(board);
  if not has_available_move then
    for row_index in 0..3 loop
      for column_index in 0..3 loop
        target_index := row_index * 4 + column_index + 1;
        if (column_index < 3 and board[target_index] = board[target_index + 1])
          or (row_index < 3 and board[target_index] = board[target_index + 4]) then
          has_available_move := true;
          exit;
        end if;
      end loop;
      exit when has_available_move;
    end loop;
  end if;

  if not (2048 <= any(board)) and has_available_move then
    raise exception '2048 attempt has not reached a rankable terminal state';
  end if;

  return score;
end;
$$;

create or replace function private.verify_ranked_memory(
  p_seed bigint,
  p_started_at timestamptz,
  p_proof jsonb
)
returns bigint
language plpgsql
volatile
strict
set search_path = pg_catalog, private
as $$
declare
  events jsonb := p_proof -> 'rounds';
  event jsonb;
  choices jsonb;
  symbols text[] := array['heart', 'sun', 'ribbon', 'diamond', 'sparkles', 'drop', 'leaf', 'blossom'];
  expected text[];
  state bigint := p_seed;
  current_round integer := 1;
  symbol_count integer;
  choice_count integer;
  choice_index integer;
  generated_index integer;
  combo integer := 0;
  lives integer := 2;
  replay_gauge integer := 0;
  score bigint := 0;
  timed_out boolean;
  attempt_succeeded boolean;
  did_fail_choice boolean;
  terminal boolean := false;
  minimum_duration_ms bigint := 4000;
  elapsed_ms bigint;
begin
  if jsonb_typeof(events) <> 'array' then
    raise exception 'Memory proof must contain a rounds array';
  end if;
  if jsonb_array_length(events) = 0 or jsonb_array_length(events) > 64 then
    raise exception 'Memory proof has an invalid number of rounds';
  end if;

  for event in select value from jsonb_array_elements(events) loop
    if terminal then
      raise exception 'Memory proof continues after the terminal state';
    end if;
    if jsonb_typeof(event) <> 'object' or jsonb_typeof(event -> 'choices') <> 'array' then
      raise exception 'Invalid memory round proof';
    end if;

    choices := event -> 'choices';
    choice_count := jsonb_array_length(choices);
    symbol_count := least(3 + ((current_round - 1) / 3), 10);
    if choice_count > symbol_count then
      raise exception 'Memory proof contains too many choices';
    end if;

    expected := array[]::text[];
    for generated_index in 1..symbol_count loop
      state := private.ranked_next_random(state);
      expected := array_append(
        expected,
        symbols[floor((state::numeric / 2147483647::numeric) * 8)::integer + 1]
      );
    end loop;

    timed_out := coalesce((event ->> 'timedOut')::boolean, false);
    attempt_succeeded := not timed_out and choice_count = symbol_count;
    did_fail_choice := false;

    for choice_index in 1..choice_count loop
      if choices ->> (choice_index - 1) <> expected[choice_index] then
        if choice_index <> choice_count or timed_out then
          raise exception 'Memory proof contains actions after a failed choice';
        end if;
        attempt_succeeded := false;
        did_fail_choice := true;
        exit;
      end if;
    end loop;

    if not timed_out
      and not did_fail_choice
      and not attempt_succeeded
      and choice_count < symbol_count then
      raise exception 'Memory proof ends before the round resolves';
    end if;

    minimum_duration_ms := minimum_duration_ms
      + (array[6000, 5000, 4000])[((current_round - 1) % 3) + 1]
      + 1200;

    if timed_out then
      minimum_duration_ms := minimum_duration_ms + symbol_count * 2000;
    end if;

    if attempt_succeeded then
      combo := combo + 1;
      score := score + symbol_count * 100 * least(combo, 3);
      replay_gauge := least(100, replay_gauge + 25);
      if current_round = 10 then
        terminal := true;
      else
        current_round := current_round + 1;
        minimum_duration_ms := minimum_duration_ms + 1400;
      end if;
    else
      combo := 0;
      if replay_gauge >= 100 then
        replay_gauge := 0;
        minimum_duration_ms := minimum_duration_ms + 700;
      elsif lives > 1 then
        lives := lives - 1;
      else
        lives := 0;
        terminal := true;
      end if;
    end if;
  end loop;

  if not terminal then
    raise exception 'Memory attempt has not reached a terminal state';
  end if;

  elapsed_ms := floor(extract(epoch from (clock_timestamp() - p_started_at)) * 1000);
  if elapsed_ms + 250 < minimum_duration_ms then
    raise exception 'Memory attempt completed faster than the game permits';
  end if;

  return score;
end;
$$;

create or replace function private.verify_ranked_sudoku(
  p_mode text,
  p_context jsonb,
  p_started_at timestamptz,
  p_proof jsonb
)
returns bigint
language plpgsql
volatile
strict
set search_path = pg_catalog, private
as $$
declare
  expected_solution text;
  submitted_solution text;
  expected_puzzle_id text := p_context ->> 'puzzleId';
  submitted_puzzle_id text := p_proof ->> 'puzzleId';
  board jsonb := p_proof -> 'board';
  elapsed_ms bigint;
begin
  if expected_puzzle_id is null or submitted_puzzle_id is distinct from expected_puzzle_id then
    raise exception 'Sudoku puzzle does not match the issued attempt';
  end if;
  if jsonb_typeof(board) <> 'array' or jsonb_array_length(board) <> 81 then
    raise exception 'Sudoku proof must contain a complete board';
  end if;

  select puzzle.solution
  into expected_solution
  from private.ranked_sudoku_puzzles as puzzle
  where puzzle.puzzle_id = expected_puzzle_id
    and puzzle.mode = p_mode;

  if expected_solution is null then
    raise exception 'Unknown Sudoku puzzle';
  end if;

  select string_agg(value, '' order by ordinal)
  into submitted_solution
  from jsonb_array_elements_text(board) with ordinality as cell(value, ordinal);

  if submitted_solution is distinct from expected_solution then
    raise exception 'Sudoku board is not the issued puzzle solution';
  end if;

  elapsed_ms := greatest(
    1000,
    floor(extract(epoch from (clock_timestamp() - p_started_at)) * 1000)
  );
  if elapsed_ms > 86400000 then
    raise exception 'Sudoku attempt exceeded the ranking time limit';
  end if;

  return elapsed_ms;
end;
$$;

create or replace function public.begin_ranked_game(
  p_game_key text,
  p_mode text default null,
  p_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, private
as $$
declare
  current_user_id uuid := auth.uid();
  attempt_id uuid;
  attempt_seed bigint;
  attempt_started_at timestamptz := clock_timestamp();
  random_bytes bytea;
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) then
    raise exception 'A permanent account is required' using errcode = '42501';
  end if;
  if p_game_key is null or p_game_key not in ('2048', 'memory', 'sudoku') then
    raise exception 'Unsupported ranked game';
  end if;
  if p_game_key = 'sudoku' then
    if p_mode is null or p_mode not in ('easy', 'medium', 'advanced') then
      raise exception 'Sudoku difficulty is required';
    end if;
    if not exists (
      select 1
      from private.ranked_sudoku_puzzles as puzzle
      where puzzle.puzzle_id = p_context ->> 'puzzleId'
        and puzzle.mode = p_mode
    ) then
      raise exception 'Unknown Sudoku puzzle';
    end if;
  elsif p_mode is not null or p_context <> '{}'::jsonb then
    raise exception 'This game does not accept mode or context';
  end if;

  if p_game_key in ('2048', 'memory') then
    random_bytes := gen_random_bytes(4);
    attempt_seed := 1 + (
      (
        get_byte(random_bytes, 0)::bigint * 16777216
        + get_byte(random_bytes, 1)::bigint * 65536
        + get_byte(random_bytes, 2)::bigint * 256
        + get_byte(random_bytes, 3)::bigint
      ) % 2147483646
    );
  end if;

  insert into private.ranked_game_attempts (
    user_id, game_key, mode, seed, context, started_at, expires_at
  )
  values (
    current_user_id,
    p_game_key,
    p_mode,
    attempt_seed,
    coalesce(p_context, '{}'::jsonb),
    attempt_started_at,
    attempt_started_at + interval '24 hours'
  )
  on conflict (user_id, game_key) where status = 'open'
  do update
  set mode = excluded.mode,
      seed = excluded.seed,
      context = excluded.context,
      started_at = excluded.started_at,
      expires_at = excluded.expires_at,
      completed_at = null,
      client_submission_id = null
  returning id into attempt_id;

  return jsonb_build_object(
    'attemptId', attempt_id,
    'seed', attempt_seed,
    'startedAt', attempt_started_at
  );
end;
$$;

create or replace function public.complete_ranked_game(
  p_attempt_id uuid,
  p_client_submission_id uuid,
  p_proof jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, private
as $$
declare
  current_user_id uuid := auth.uid();
  attempt private.ranked_game_attempts%rowtype;
  existing_result public.game_results%rowtype;
  verified_score bigint;
  verified_duration bigint;
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) then
    raise exception 'A permanent account is required' using errcode = '42501';
  end if;
  if p_attempt_id is null
    or p_client_submission_id is null
    or p_proof is null
    or jsonb_typeof(p_proof) <> 'object' then
    raise exception 'A valid attempt, submission id, and proof are required';
  end if;

  select *
  into attempt
  from private.ranked_game_attempts
  where id = p_attempt_id
    and user_id = current_user_id
  for update;

  if not found then
    raise exception 'Ranked game attempt was not found' using errcode = '42501';
  end if;

  select *
  into existing_result
  from public.game_results
  where attempt_id = attempt.id;

  if found then
    return jsonb_build_object(
      'duplicate', true,
      'scoreValue', existing_result.score_value,
      'durationMs', existing_result.duration_ms
    );
  end if;

  if attempt.status <> 'open' or attempt.expires_at < clock_timestamp() then
    raise exception 'Ranked game attempt is no longer active';
  end if;

  case attempt.game_key
    when '2048' then
      verified_score := private.verify_ranked_2048(attempt.seed, p_proof);
    when 'memory' then
      verified_score := private.verify_ranked_memory(attempt.seed, attempt.started_at, p_proof);
    when 'sudoku' then
      verified_duration := private.verify_ranked_sudoku(
        attempt.mode,
        attempt.context,
        attempt.started_at,
        p_proof
      );
    else
      raise exception 'Unsupported ranked game';
  end case;

  insert into public.game_results (
    user_id,
    game_key,
    mode,
    score_value,
    duration_ms,
    match_result,
    client_submission_id,
    attempt_id,
    verified_at
  )
  values (
    current_user_id,
    attempt.game_key,
    attempt.mode,
    verified_score,
    verified_duration,
    null,
    p_client_submission_id,
    attempt.id,
    clock_timestamp()
  );

  update private.ranked_game_attempts
  set status = 'completed',
      completed_at = clock_timestamp(),
      client_submission_id = p_client_submission_id
  where id = attempt.id;

  return jsonb_build_object(
    'duplicate', false,
    'scoreValue', verified_score,
    'durationMs', verified_duration
  );
end;
$$;

create or replace function public.get_game_leaderboard(
  p_game_key text,
  p_mode text default null,
  p_limit integer default 50
)
returns table (
  rank bigint,
  nickname text,
  game_key text,
  mode text,
  score_value bigint,
  duration_ms bigint,
  match_result text,
  created_at timestamptz,
  is_current_user boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_game_key is null or p_game_key not in ('2048', 'memory', 'sudoku', 'omok') then
    raise exception 'Unsupported game key';
  end if;
  if p_game_key = 'sudoku' and p_mode not in ('easy', 'medium', 'advanced') then
    raise exception 'Sudoku difficulty is required';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'Leaderboard limit must be between 1 and 100';
  end if;

  return query
  with ordered_results as (
    select
      result.*,
      row_number() over (
        partition by result.user_id
        order by
          case when result.game_key in ('2048', 'memory') then result.score_value end desc nulls last,
          case when result.game_key = 'sudoku' then result.duration_ms end asc nulls last,
          result.created_at asc
      ) as user_result_order
    from public.game_results as result
    where result.verified_at is not null
      and result.game_key = p_game_key
      and (p_mode is null or result.mode = p_mode)
  ),
  ranked_results as (
    select
      result.*,
      dense_rank() over (
        order by
          case when result.game_key in ('2048', 'memory') then result.score_value end desc nulls last,
          case when result.game_key = 'sudoku' then result.duration_ms end asc nulls last
      ) as result_rank
    from ordered_results as result
    where result.user_result_order = 1
  )
  select
    result.result_rank,
    coalesce(profile.nickname, 'Player'),
    result.game_key,
    result.mode,
    result.score_value,
    result.duration_ms,
    result.match_result,
    result.created_at,
    result.user_id = auth.uid()
  from ranked_results as result
  left join public.profiles as profile on profile.user_id = result.user_id
  order by result.result_rank, result.created_at
  limit p_limit;
end;
$$;

revoke all on function private.ranked_next_random(bigint) from public, anon, authenticated;
revoke all on function private.ranked_2048_add_tile(integer[], bigint) from public, anon, authenticated;
revoke all on function private.verify_ranked_2048(bigint, jsonb) from public, anon, authenticated;
revoke all on function private.verify_ranked_memory(bigint, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function private.verify_ranked_sudoku(text, jsonb, timestamptz, jsonb) from public, anon, authenticated;

revoke all on function public.begin_ranked_game(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.begin_ranked_game(text, text, jsonb) to authenticated;

revoke all on function public.complete_ranked_game(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.complete_ranked_game(uuid, uuid, jsonb) to authenticated;

revoke all on function public.get_game_leaderboard(text, text, integer) from public, anon, authenticated;
grant execute on function public.get_game_leaderboard(text, text, integer) to anon, authenticated;
