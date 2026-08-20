-- Star Flight uses the generic leaderboard ordering contract, but its proof
-- lifecycle differs by mode. The bounded course can be replayed once at the
-- finish line. Endless flights are replayed in bounded chunks so payload and
-- database execution costs do not grow without limit.

insert into private.ranking_boards (
  game_key,
  board_key,
  rules_version,
  challenge_policy
)
values
  ('flappy', 'course', '1', 'all-time'),
  ('flappy', 'endless', '1', 'all-time');

alter table private.ranked_game_attempts
drop constraint ranked_game_attempts_status_check;

alter table private.ranked_game_attempts
add constraint ranked_game_attempts_status_check
check (status in ('open', 'completed', 'abandoned'));

alter table private.ranked_game_attempts
drop constraint ranked_game_attempts_lifecycle_check;

alter table private.ranked_game_attempts
add constraint ranked_game_attempts_lifecycle_check
check (
  (status = 'open' and completed_at is null and client_submission_id is null)
  or (status = 'completed' and completed_at is not null and client_submission_id is not null)
  or (status = 'abandoned' and completed_at is not null and client_submission_id is null)
);

create table private.ranked_flappy_checkpoints (
  attempt_id uuid primary key
    references private.ranked_game_attempts(id) on delete cascade,
  sequence integer not null default 0,
  tick bigint not null default 0,
  status text not null default 'flying',
  state jsonb not null,
  last_flap_ticks jsonb null,
  updated_at timestamptz not null,
  constraint ranked_flappy_checkpoints_sequence_check
    check (sequence >= 0),
  constraint ranked_flappy_checkpoints_tick_check
    check (tick >= 0),
  constraint ranked_flappy_checkpoints_status_check
    check (status in ('flying', 'over')),
  constraint ranked_flappy_checkpoints_state_check
    check (jsonb_typeof(state) = 'object'),
  constraint ranked_flappy_checkpoints_last_flap_ticks_check
    check (last_flap_ticks is null or jsonb_typeof(last_flap_ticks) = 'array')
);

alter table private.ranked_flappy_checkpoints enable row level security;
revoke all on table private.ranked_flappy_checkpoints
from public, anon, authenticated;

create or replace function private.create_ranked_flappy_state(
  p_seed bigint,
  p_mode text
)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = pg_catalog, private
as $$
declare
  first_random_state bigint;
  second_random_state bigint;
begin
  if p_seed is null or p_seed < 1 or p_seed >= 2147483647 then
    raise exception 'Star Flight seed is invalid';
  end if;
  if p_mode not in ('course', 'endless') then
    raise exception 'Star Flight mode is invalid';
  end if;

  first_random_state := mod(p_seed * 48271, 2147483647);
  second_random_state := mod(first_random_state * 48271, 2147483647);

  return jsonb_build_object(
    'mode', p_mode,
    'status', 'flying',
    'tick', 0,
    'session', jsonb_build_object(
      'round', case when p_mode = 'course' then 1 else 5 end,
      'roundElapsedMs', 0,
      'totalElapsedMs', 0
    ),
    'world', jsonb_build_object(
      'birdY', 50.0,
      'velocity', -18.0,
      'score', 0,
      'combo', 0,
      'maxCombo', 0,
      'mistakes', 0,
      'gatesPassed', 0,
      'lives', 2,
      'shieldGauge', 0,
      'shieldReady', false,
      'recoverySeconds', 0.0,
      'nextPipeId', 2,
      'randomState', second_random_state,
      'pipes', jsonb_build_array(
        jsonb_build_object(
          'id', 0,
          'x', 82.0,
          'gapY', 31.0 + (first_random_state::double precision / 2147483647.0) * 38.0,
          'passed', false
        ),
        jsonb_build_object(
          'id', 1,
          'x', 130.0,
          'gapY', 31.0 + (second_random_state::double precision / 2147483647.0) * 38.0,
          'passed', false
        )
      )
    )
  );
end;
$$;

create or replace function private.replay_ranked_flappy(
  p_seed bigint,
  p_mode text,
  p_start_state jsonb,
  p_from_tick bigint,
  p_to_tick bigint,
  p_flap_ticks jsonb
)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = pg_catalog, private
as $$
declare
  simulation jsonb;
  flap_value jsonb;
  flap_ticks bigint[] := array[]::bigint[];
  previous_flap_tick bigint := -1;
  flap_tick bigint;
  flap_index integer := 1;
  tick bigint;
  mode text;
  simulation_status text;
  round_number integer;
  round_elapsed_ms bigint;
  total_elapsed_ms bigint;
  bird_y double precision;
  velocity double precision;
  score bigint;
  combo integer;
  max_combo integer;
  mistakes integer;
  gates_passed integer;
  lives integer;
  shield_gauge integer;
  shield_ready boolean;
  recovery_seconds double precision;
  next_pipe_id integer;
  random_state bigint;
  pipe_value jsonb;
  pipe_ids integer[] := array[]::integer[];
  pipe_xs double precision[] := array[]::double precision[];
  pipe_gap_ys double precision[] := array[]::double precision[];
  pipe_passed boolean[] := array[]::boolean[];
  next_pipe_ids integer[];
  next_pipe_xs double precision[];
  next_pipe_gap_ys double precision[];
  next_pipe_passed boolean[];
  pipe_count integer;
  pipe_index integer;
  pipe_speed double precision;
  next_x double precision;
  last_pipe_x double precision;
  next_round_elapsed_ms bigint;
  collision boolean;
  scored integer;
  pipe_rows jsonb;
begin
  if p_mode not in ('course', 'endless') then
    raise exception 'Star Flight mode is invalid';
  end if;
  if p_from_tick is null or p_to_tick is null
    or p_from_tick < 0 or p_to_tick <= p_from_tick then
    raise exception 'Star Flight replay range is invalid';
  end if;
  if p_flap_ticks is null or jsonb_typeof(p_flap_ticks) <> 'array' then
    raise exception 'Star Flight flap ticks must be an array';
  end if;
  if jsonb_array_length(p_flap_ticks) > 4096 then
    raise exception 'Star Flight proof contains too many flap inputs';
  end if;

  for flap_value in select value from jsonb_array_elements(p_flap_ticks)
  loop
    if jsonb_typeof(flap_value) <> 'number'
      or flap_value #>> '{}' !~ '^(0|[1-9][0-9]*)$' then
      raise exception 'Star Flight flap ticks must be non-negative integers';
    end if;
    flap_tick := (flap_value #>> '{}')::bigint;
    if flap_tick < p_from_tick or flap_tick >= p_to_tick
      or flap_tick <= previous_flap_tick then
      raise exception 'Star Flight flap ticks are outside the replay range or unordered';
    end if;
    flap_ticks := array_append(flap_ticks, flap_tick);
    previous_flap_tick := flap_tick;
  end loop;

  simulation := coalesce(
    p_start_state,
    private.create_ranked_flappy_state(p_seed, p_mode)
  );
  mode := simulation ->> 'mode';
  simulation_status := simulation ->> 'status';
  tick := (simulation ->> 'tick')::bigint;
  if mode <> p_mode or tick <> p_from_tick or simulation_status <> 'flying' then
    raise exception 'Star Flight checkpoint state does not match the replay request';
  end if;

  round_number := (simulation #>> '{session,round}')::integer;
  round_elapsed_ms := (simulation #>> '{session,roundElapsedMs}')::bigint;
  total_elapsed_ms := (simulation #>> '{session,totalElapsedMs}')::bigint;
  bird_y := (simulation #>> '{world,birdY}')::double precision;
  velocity := (simulation #>> '{world,velocity}')::double precision;
  score := (simulation #>> '{world,score}')::bigint;
  combo := (simulation #>> '{world,combo}')::integer;
  max_combo := (simulation #>> '{world,maxCombo}')::integer;
  mistakes := (simulation #>> '{world,mistakes}')::integer;
  gates_passed := (simulation #>> '{world,gatesPassed}')::integer;
  lives := (simulation #>> '{world,lives}')::integer;
  shield_gauge := (simulation #>> '{world,shieldGauge}')::integer;
  shield_ready := (simulation #>> '{world,shieldReady}')::boolean;
  recovery_seconds := (simulation #>> '{world,recoverySeconds}')::double precision;
  next_pipe_id := (simulation #>> '{world,nextPipeId}')::integer;
  random_state := (simulation #>> '{world,randomState}')::bigint;

  for pipe_value in
    select value from jsonb_array_elements(simulation #> '{world,pipes}')
  loop
    pipe_ids := array_append(pipe_ids, (pipe_value ->> 'id')::integer);
    pipe_xs := array_append(pipe_xs, (pipe_value ->> 'x')::double precision);
    pipe_gap_ys := array_append(pipe_gap_ys, (pipe_value ->> 'gapY')::double precision);
    pipe_passed := array_append(pipe_passed, (pipe_value ->> 'passed')::boolean);
  end loop;

  while tick < p_to_tick loop
    if simulation_status <> 'flying' then
      raise exception 'Star Flight proof continues after the terminal state';
    end if;

    if flap_index <= coalesce(array_length(flap_ticks, 1), 0)
      and flap_ticks[flap_index] = tick then
      velocity := -18.0;
      flap_index := flap_index + 1;
    end if;

    velocity := velocity + 48.0 * 0.02;
    bird_y := bird_y + velocity * 0.02;
    pipe_speed := least(
      23.2,
      20.0
        + (least(5, greatest(1, round_number)) - 1) * 0.6
        + case when mode = 'endless'
            then floor(total_elapsed_ms::double precision / 45000.0) * 0.2
            else 0.0
          end
    );

    scored := 0;
    next_pipe_ids := array[]::integer[];
    next_pipe_xs := array[]::double precision[];
    next_pipe_gap_ys := array[]::double precision[];
    next_pipe_passed := array[]::boolean[];
    pipe_count := coalesce(array_length(pipe_xs, 1), 0);

    if pipe_count > 0 then
      for pipe_index in 1..pipe_count loop
        next_x := pipe_xs[pipe_index] - pipe_speed * 0.02;
        if not pipe_passed[pipe_index] and next_x + 10.0 < 22.0 then
          scored := scored + 1;
          pipe_passed[pipe_index] := true;
        end if;
        if next_x + 10.0 > -4.0 then
          next_pipe_ids := array_append(next_pipe_ids, pipe_ids[pipe_index]);
          next_pipe_xs := array_append(next_pipe_xs, next_x);
          next_pipe_gap_ys := array_append(next_pipe_gap_ys, pipe_gap_ys[pipe_index]);
          next_pipe_passed := array_append(next_pipe_passed, pipe_passed[pipe_index]);
        end if;
      end loop;
    end if;

    pipe_ids := next_pipe_ids;
    pipe_xs := next_pipe_xs;
    pipe_gap_ys := next_pipe_gap_ys;
    pipe_passed := next_pipe_passed;
    pipe_count := coalesce(array_length(pipe_xs, 1), 0);
    last_pipe_x := case when pipe_count > 0 then pipe_xs[pipe_count] else 82.0 end;
    if last_pipe_x < 82.0 then
      random_state := mod(random_state * 48271, 2147483647);
      pipe_ids := array_append(pipe_ids, next_pipe_id);
      pipe_xs := array_append(pipe_xs, last_pipe_x + 48.0);
      pipe_gap_ys := array_append(
        pipe_gap_ys,
        31.0 + (random_state::double precision / 2147483647.0) * 38.0
      );
      pipe_passed := array_append(pipe_passed, false);
      next_pipe_id := next_pipe_id + 1;
    end if;

    if scored > 0 then
      for pipe_index in 1..scored loop
        combo := combo + 1;
        score := score + least(30, combo * 10);
      end loop;
      max_combo := greatest(max_combo, combo);
      gates_passed := gates_passed + scored;
      if not shield_ready then
        shield_gauge := least(100, shield_gauge + scored * 4);
        shield_ready := shield_gauge >= 100;
      end if;
    end if;

    recovery_seconds := greatest(0.0, recovery_seconds - 0.02);
    next_round_elapsed_ms := round_elapsed_ms + 20;
    total_elapsed_ms := total_elapsed_ms + 20;

    if mode = 'course' and next_round_elapsed_ms >= 90000 then
      if round_number >= 5 then
        round_elapsed_ms := 90000;
        total_elapsed_ms := 450000;
        simulation_status := 'course-complete';
      else
        round_number := round_number + 1;
        round_elapsed_ms := next_round_elapsed_ms - 90000;
      end if;
    else
      round_elapsed_ms := next_round_elapsed_ms;
    end if;

    if simulation_status = 'flying' and recovery_seconds <= 0.0 then
      collision := bird_y - 2.7 <= 0.0 or bird_y + 2.7 >= 100.0;
      pipe_count := coalesce(array_length(pipe_xs, 1), 0);
      if not collision and pipe_count > 0 then
        for pipe_index in 1..pipe_count loop
          if 22.0 + 2.7 >= pipe_xs[pipe_index]
            and 22.0 - 2.7 <= pipe_xs[pipe_index] + 10.0
            and (
              bird_y - 2.7 <= pipe_gap_ys[pipe_index] - 14.5
              or bird_y + 2.7 >= pipe_gap_ys[pipe_index] + 14.5
            ) then
            collision := true;
            exit;
          end if;
        end loop;
      end if;

      if collision then
        mistakes := mistakes + 1;
        combo := 0;
        if shield_ready then
          bird_y := 50.0;
          velocity := 0.0;
          shield_gauge := 0;
          shield_ready := false;
          recovery_seconds := 1.2;
        elsif lives > 1 then
          bird_y := 50.0;
          velocity := 0.0;
          lives := lives - 1;
          shield_gauge := 0;
          shield_ready := false;
          recovery_seconds := 1.2;
        else
          lives := 0;
          shield_gauge := 0;
          shield_ready := false;
          simulation_status := 'over';
        end if;
      end if;
    end if;

    tick := tick + 1;
  end loop;

  pipe_rows := '[]'::jsonb;
  pipe_count := coalesce(array_length(pipe_xs, 1), 0);
  if pipe_count > 0 then
    for pipe_index in 1..pipe_count loop
      pipe_rows := pipe_rows || jsonb_build_array(jsonb_build_object(
        'id', pipe_ids[pipe_index],
        'x', pipe_xs[pipe_index],
        'gapY', pipe_gap_ys[pipe_index],
        'passed', pipe_passed[pipe_index]
      ));
    end loop;
  end if;

  return jsonb_build_object(
    'mode', mode,
    'status', simulation_status,
    'tick', tick,
    'session', jsonb_build_object(
      'round', round_number,
      'roundElapsedMs', round_elapsed_ms,
      'totalElapsedMs', total_elapsed_ms
    ),
    'world', jsonb_build_object(
      'birdY', bird_y,
      'velocity', velocity,
      'score', score,
      'combo', combo,
      'maxCombo', max_combo,
      'mistakes', mistakes,
      'gatesPassed', gates_passed,
      'lives', lives,
      'shieldGauge', shield_gauge,
      'shieldReady', shield_ready,
      'recoverySeconds', recovery_seconds,
      'nextPipeId', next_pipe_id,
      'randomState', random_state,
      'pipes', pipe_rows
    )
  );
end;
$$;

create or replace function private.verify_ranked_flappy_course(
  p_seed bigint,
  p_started_at timestamptz,
  p_proof jsonb
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = pg_catalog, private
as $$
declare
  simulation jsonb;
  server_elapsed_ms bigint;
begin
  if jsonb_typeof(p_proof) <> 'object'
    or p_proof - array['proofVersion', 'maxTicks', 'flapTicks'] <> '{}'::jsonb
    or coalesce(p_proof ->> 'proofVersion', '') <> '1'
    or coalesce(p_proof ->> 'maxTicks', '') <> '22500'
    or coalesce(jsonb_typeof(p_proof -> 'flapTicks'), '') <> 'array' then
    raise exception 'Star Flight course proof is invalid';
  end if;

  server_elapsed_ms := floor(
    extract(epoch from (clock_timestamp() - p_started_at)) * 1000
  )::bigint;
  if server_elapsed_ms < 448000 then
    raise exception 'Star Flight course completed faster than server time';
  end if;
  if server_elapsed_ms > 465000 then
    raise exception 'Star Flight course was not continuously active';
  end if;

  simulation := private.replay_ranked_flappy(
    p_seed,
    'course',
    null,
    0,
    22500,
    p_proof -> 'flapTicks'
  );
  if simulation ->> 'status' <> 'course-complete' then
    raise exception 'Star Flight course was not completed';
  end if;

  return jsonb_build_object(
    'courseScore', (simulation #>> '{world,score}')::bigint,
    'courseMaxCombo', (simulation #>> '{world,maxCombo}')::bigint,
    'courseMistakes', (simulation #>> '{world,mistakes}')::bigint
  );
end;
$$;

create or replace function private.verify_ranked_flappy_endless(
  p_attempt_id uuid,
  p_proof jsonb
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = pg_catalog, private
as $$
declare
  checkpoint private.ranked_flappy_checkpoints%rowtype;
begin
  if jsonb_typeof(p_proof) <> 'object'
    or p_proof - array['proofVersion', 'checkpointSequence'] <> '{}'::jsonb
    or coalesce(p_proof ->> 'proofVersion', '') <> '1'
    or coalesce(p_proof ->> 'checkpointSequence', '') !~ '^(0|[1-9][0-9]*)$' then
    raise exception 'Star Flight endless proof is invalid';
  end if;

  select stored_checkpoint.*
  into checkpoint
  from private.ranked_flappy_checkpoints as stored_checkpoint
  where stored_checkpoint.attempt_id = p_attempt_id;

  if not found
    or checkpoint.sequence <> (p_proof ->> 'checkpointSequence')::integer
    or checkpoint.status <> 'over'
    or checkpoint.state ->> 'status' <> 'over' then
    raise exception 'Star Flight endless run has no matching terminal checkpoint';
  end if;

  return jsonb_build_object(
    'survivalMs', checkpoint.tick * 20,
    'endlessScore', (checkpoint.state #>> '{world,score}')::bigint,
    'endlessGates', (checkpoint.state #>> '{world,gatesPassed}')::bigint
  );
end;
$$;

create or replace function public.begin_ranked_game(
  p_game_key text,
  p_board_key text,
  p_rules_version text,
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
  selected_board private.ranking_boards%rowtype;
  attempt_id uuid;
  attempt_seed bigint;
  attempt_started_at timestamptz := clock_timestamp();
  attempt_challenge_key text;
  attempt_context jsonb := '{}'::jsonb;
  attempt_payload jsonb := '{}'::jsonb;
  sudoku_puzzle_id text;
  sudoku_puzzle text;
  random_bytes bytea;
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) then
    raise exception 'A permanent account is required' using errcode = '42501';
  end if;
  if p_context is null or jsonb_typeof(p_context) <> 'object' then
    raise exception 'Ranked attempt context must be an object';
  end if;

  select board.*
  into selected_board
  from private.ranking_boards as board
  where board.game_key = p_game_key
    and board.board_key = p_board_key
    and board.rules_version = p_rules_version
    and board.is_active;

  if not found then
    raise exception 'Unsupported ranking board';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':' || p_game_key || ':' || p_board_key,
      0
    )
  );
  attempt_started_at := clock_timestamp();

  attempt_challenge_key := case selected_board.challenge_policy
    when 'all-time' then 'all-time'
    when 'daily' then to_char(attempt_started_at at time zone 'UTC', 'YYYY-MM-DD')
    else null
  end;
  if attempt_challenge_key is null then
    raise exception 'Unsupported ranking challenge policy';
  end if;

  if p_game_key = 'sudoku' then
    if p_context <> '{}'::jsonb then
      raise exception 'Sudoku attempt context is server-owned';
    end if;
    select ranked_puzzle.puzzle_id, ranked_puzzle.puzzle
    into sudoku_puzzle_id, sudoku_puzzle
    from private.ranked_sudoku_puzzles as ranked_puzzle
    where ranked_puzzle.mode = p_board_key
    order by random()
    limit 1;
    if sudoku_puzzle_id is null then
      raise exception 'No ranked Sudoku puzzle is available';
    end if;
    attempt_context := jsonb_build_object('proofVersion', 2, 'puzzleId', sudoku_puzzle_id);
    attempt_payload := jsonb_build_object(
      'proofVersion', 2,
      'puzzleId', sudoku_puzzle_id,
      'puzzle', sudoku_puzzle
    );
  elsif p_game_key in ('2048', 'memory', 'flappy') then
    if p_context <> '{}'::jsonb then
      raise exception 'This ranking board does not accept client context';
    end if;
    random_bytes := extensions.gen_random_bytes(4);
    attempt_seed := 1 + (
      (
        get_byte(random_bytes, 0)::bigint * 16777216
        + get_byte(random_bytes, 1)::bigint * 65536
        + get_byte(random_bytes, 2)::bigint * 256
        + get_byte(random_bytes, 3)::bigint
      ) % 2147483646
    );
    if p_game_key = 'flappy' then
      attempt_context := jsonb_build_object(
        'mode', p_board_key,
        'proofVersion', 1,
        'tickMs', 20
      );
      attempt_payload := attempt_context || case when p_board_key = 'endless'
        then jsonb_build_object('checkpointTickLimit', 1500)
        else '{}'::jsonb
      end;
    end if;
  else
    raise exception 'Ranking board verifier is not implemented';
  end if;

  update private.ranked_game_attempts as previous_attempt
  set status = 'abandoned',
      completed_at = attempt_started_at
  where previous_attempt.user_id = current_user_id
    and previous_attempt.game_key = p_game_key
    and previous_attempt.board_key = p_board_key
    and previous_attempt.status = 'open';

  insert into private.ranked_game_attempts (
    user_id,
    game_key,
    board_key,
    challenge_key,
    rules_version,
    seed,
    context,
    started_at,
    expires_at
  )
  values (
    current_user_id,
    p_game_key,
    p_board_key,
    attempt_challenge_key,
    p_rules_version,
    attempt_seed,
    attempt_context,
    attempt_started_at,
    attempt_started_at + interval '24 hours'
  )
  returning id into attempt_id;

  if p_game_key = 'flappy' and p_board_key = 'endless' then
    insert into private.ranked_flappy_checkpoints (
      attempt_id,
      sequence,
      tick,
      status,
      state,
      last_flap_ticks,
      updated_at
    )
    values (
      attempt_id,
      0,
      0,
      'flying',
      private.create_ranked_flappy_state(attempt_seed, 'endless'),
      null,
      attempt_started_at
    )
    on conflict (attempt_id) do update
    set sequence = 0,
        tick = 0,
        status = 'flying',
        state = excluded.state,
        last_flap_ticks = null,
        updated_at = excluded.updated_at;
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'attemptId', attempt_id,
    'boardKey', p_board_key,
    'challengeKey', attempt_challenge_key,
    'gameKey', p_game_key,
    'payload', attempt_payload,
    'rulesVersion', p_rules_version,
    'seed', attempt_seed,
    'startedAt', attempt_started_at
  ));
end;
$$;

create or replace function public.checkpoint_ranked_flappy(
  p_attempt_id uuid,
  p_sequence integer,
  p_to_tick bigint,
  p_flap_ticks jsonb
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
  checkpoint private.ranked_flappy_checkpoints%rowtype;
  next_state jsonb;
  next_status text;
  simulated_elapsed_ms bigint;
  server_elapsed_ms bigint;
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) then
    raise exception 'A permanent account is required' using errcode = '42501';
  end if;
  if p_attempt_id is null or p_sequence is null or p_to_tick is null
    or p_flap_ticks is null or jsonb_typeof(p_flap_ticks) <> 'array' then
    raise exception 'A valid Star Flight checkpoint is required';
  end if;
  if jsonb_array_length(p_flap_ticks) > 512 then
    raise exception 'Star Flight checkpoint contains too many flap inputs';
  end if;

  select ranked_attempt.*
  into attempt
  from private.ranked_game_attempts as ranked_attempt
  where ranked_attempt.id = p_attempt_id
    and ranked_attempt.user_id = current_user_id
  for update;

  if not found then
    raise exception 'Ranked game attempt was not found' using errcode = '42501';
  end if;
  if attempt.game_key <> 'flappy' or attempt.board_key <> 'endless'
    or attempt.rules_version <> '1' then
    raise exception 'Star Flight checkpoint does not belong to an endless board';
  end if;
  if attempt.status <> 'open' or attempt.expires_at < clock_timestamp() then
    raise exception 'Ranked game attempt is no longer active';
  end if;

  select stored_checkpoint.*
  into checkpoint
  from private.ranked_flappy_checkpoints as stored_checkpoint
  where stored_checkpoint.attempt_id = attempt.id
  for update;

  if not found then
    raise exception 'Star Flight checkpoint is not active';
  end if;
  if p_sequence = checkpoint.sequence then
    if p_to_tick <> checkpoint.tick
      or checkpoint.last_flap_ticks is null
      or p_flap_ticks <> checkpoint.last_flap_ticks then
      raise exception 'Star Flight checkpoint retry does not match the accepted chunk';
    end if;
    return jsonb_build_object(
      'checkpointSequence', checkpoint.sequence,
      'duplicate', true,
      'status', checkpoint.status,
      'tick', checkpoint.tick,
      'metrics', jsonb_build_object(
        'survivalMs', checkpoint.tick * 20,
        'endlessScore', (checkpoint.state #>> '{world,score}')::bigint,
        'endlessGates', (checkpoint.state #>> '{world,gatesPassed}')::bigint
      )
    );
  end if;
  if checkpoint.status <> 'flying' then
    raise exception 'Star Flight checkpoint is not active';
  end if;
  if p_sequence <> checkpoint.sequence + 1 then
    raise exception 'Star Flight checkpoint sequence is invalid';
  end if;
  if p_to_tick <= checkpoint.tick or p_to_tick - checkpoint.tick > 1500 then
    raise exception 'Star Flight checkpoint range is invalid';
  end if;

  simulated_elapsed_ms := p_to_tick * 20;
  server_elapsed_ms := floor(
    extract(epoch from (clock_timestamp() - attempt.started_at)) * 1000
  )::bigint;
  if server_elapsed_ms + 2000 < simulated_elapsed_ms then
    raise exception 'Star Flight checkpoint advances faster than server time';
  end if;
  if server_elapsed_ms > simulated_elapsed_ms + 15000 then
    raise exception 'Star Flight endless run was not continuously active';
  end if;

  next_state := private.replay_ranked_flappy(
    attempt.seed,
    'endless',
    checkpoint.state,
    checkpoint.tick,
    p_to_tick,
    p_flap_ticks
  );
  next_status := next_state ->> 'status';
  if next_status = 'flying' and p_to_tick - checkpoint.tick < 250 then
    raise exception 'Star Flight non-terminal checkpoints must cover at least five seconds';
  end if;
  if next_status not in ('flying', 'over') then
    raise exception 'Star Flight checkpoint produced an invalid state';
  end if;

  update private.ranked_flappy_checkpoints as stored_checkpoint
  set sequence = p_sequence,
      tick = p_to_tick,
      status = next_status,
      state = next_state,
      last_flap_ticks = p_flap_ticks,
      updated_at = clock_timestamp()
  where stored_checkpoint.attempt_id = attempt.id;

  return jsonb_build_object(
    'checkpointSequence', p_sequence,
    'duplicate', false,
    'status', next_status,
    'tick', p_to_tick,
    'metrics', jsonb_build_object(
      'survivalMs', p_to_tick * 20,
      'endlessScore', (next_state #>> '{world,score}')::bigint,
      'endlessGates', (next_state #>> '{world,gatesPassed}')::bigint
    )
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
  verified_metrics jsonb;
  verified_rank_primary bigint;
  verified_rank_secondary bigint := 0;
  verified_rank_tertiary bigint := 0;
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

  select ranked_attempt.*
  into attempt
  from private.ranked_game_attempts as ranked_attempt
  where ranked_attempt.id = p_attempt_id
    and ranked_attempt.user_id = current_user_id
  for update;
  if not found then
    raise exception 'Ranked game attempt was not found' using errcode = '42501';
  end if;

  select result.*
  into existing_result
  from public.game_results as result
  where result.attempt_id = attempt.id;
  if found then
    return jsonb_build_object(
      'boardKey', existing_result.board_key,
      'challengeKey', existing_result.challenge_key,
      'duplicate', true,
      'gameKey', existing_result.game_key,
      'metrics', existing_result.metrics,
      'rulesVersion', existing_result.rules_version
    );
  end if;

  if attempt.status <> 'open' or attempt.expires_at < clock_timestamp() then
    raise exception 'Ranked game attempt is no longer active';
  end if;

  case attempt.game_key
    when '2048' then
      if attempt.board_key <> 'classic' then
        raise exception 'Unsupported 2048 ranking board';
      end if;
      verified_score := private.verify_ranked_2048(attempt.seed, p_proof);
      verified_rank_primary := verified_score;
      verified_metrics := jsonb_build_object('score', verified_score);
    when 'memory' then
      if attempt.board_key <> 'standard' then
        raise exception 'Unsupported Memory ranking board';
      end if;
      verified_score := private.verify_ranked_memory(attempt.seed, attempt.started_at, p_proof);
      verified_rank_primary := verified_score;
      verified_metrics := jsonb_build_object('score', verified_score);
    when 'sudoku' then
      verified_duration := private.verify_ranked_sudoku(
        attempt.board_key,
        attempt.context,
        attempt.started_at,
        p_proof
      );
      verified_rank_primary := -verified_duration;
      verified_metrics := jsonb_build_object('durationMs', verified_duration);
    when 'flappy' then
      if attempt.board_key = 'course' then
        verified_metrics := private.verify_ranked_flappy_course(
          attempt.seed,
          attempt.started_at,
          p_proof
        );
        verified_rank_primary := (verified_metrics ->> 'courseScore')::bigint;
        verified_rank_secondary := (verified_metrics ->> 'courseMaxCombo')::bigint;
        verified_rank_tertiary := -((verified_metrics ->> 'courseMistakes')::bigint);
      elsif attempt.board_key = 'endless' then
        verified_metrics := private.verify_ranked_flappy_endless(attempt.id, p_proof);
        verified_rank_primary := (verified_metrics ->> 'survivalMs')::bigint;
        verified_rank_secondary := (verified_metrics ->> 'endlessScore')::bigint;
        verified_rank_tertiary := (verified_metrics ->> 'endlessGates')::bigint;
      else
        raise exception 'Unsupported Star Flight ranking board';
      end if;
    else
      raise exception 'Ranking board verifier is not implemented';
  end case;

  insert into public.game_results (
    user_id,
    game_key,
    board_key,
    challenge_key,
    rules_version,
    rank_primary,
    rank_secondary,
    rank_tertiary,
    metrics,
    client_submission_id,
    attempt_id,
    verified_at
  )
  values (
    current_user_id,
    attempt.game_key,
    attempt.board_key,
    attempt.challenge_key,
    attempt.rules_version,
    verified_rank_primary,
    verified_rank_secondary,
    verified_rank_tertiary,
    verified_metrics,
    p_client_submission_id,
    attempt.id,
    clock_timestamp()
  );

  update private.ranked_game_attempts as ranked_attempt
  set status = 'completed',
      completed_at = clock_timestamp(),
      client_submission_id = p_client_submission_id
  where ranked_attempt.id = attempt.id;

  return jsonb_build_object(
    'boardKey', attempt.board_key,
    'challengeKey', attempt.challenge_key,
    'duplicate', false,
    'gameKey', attempt.game_key,
    'metrics', verified_metrics,
    'rulesVersion', attempt.rules_version
  );
end;
$$;

revoke all on function private.create_ranked_flappy_state(bigint, text)
from public, anon, authenticated;
revoke all on function private.replay_ranked_flappy(bigint, text, jsonb, bigint, bigint, jsonb)
from public, anon, authenticated;
revoke all on function private.verify_ranked_flappy_course(bigint, timestamptz, jsonb)
from public, anon, authenticated;
revoke all on function private.verify_ranked_flappy_endless(uuid, jsonb)
from public, anon, authenticated;

revoke all on function public.checkpoint_ranked_flappy(uuid, integer, bigint, jsonb)
from public, anon, authenticated;
grant execute on function public.checkpoint_ranked_flappy(uuid, integer, bigint, jsonb)
to authenticated;

revoke all on function public.begin_ranked_game(text, text, text, jsonb)
from public, anon, authenticated;
grant execute on function public.begin_ranked_game(text, text, text, jsonb)
to authenticated;

revoke all on function public.complete_ranked_game(uuid, uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.complete_ranked_game(uuid, uuid, jsonb)
to authenticated;
