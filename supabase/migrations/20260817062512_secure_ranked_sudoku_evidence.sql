alter table private.ranked_sudoku_puzzles
add column puzzle text,
add column minimum_duration_ms integer;

update private.ranked_sudoku_puzzles
set puzzle = case puzzle_id
      when 'ocean-01' then '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
      when 'ocean-02' then '004000900000105000198000067800761003020000090700924006960000284000409000005000100'
      when 'ocean-03' then '000600000672000348000342000850000023006000700710000056000537000287000635000200000'
    end,
    minimum_duration_ms = case mode
      when 'easy' then 10000
      when 'medium' then 15000
      when 'advanced' then 20000
    end;

alter table private.ranked_sudoku_puzzles
alter column puzzle set not null,
alter column minimum_duration_ms set not null,
add constraint ranked_sudoku_puzzles_puzzle_shape_check
  check (puzzle ~ '^[0-9]{81}$' and position('0' in puzzle) > 0),
add constraint ranked_sudoku_puzzles_minimum_duration_check
  check (minimum_duration_ms between 10000 and 600000);

-- Keep ranked boards server-selected. Digit permutations preserve the shape
-- and difficulty of the reviewed source puzzles without duplicating answers
-- in the browser bundle.
insert into private.ranked_sudoku_puzzles (
  puzzle_id,
  mode,
  solution,
  puzzle,
  minimum_duration_ms
)
select
  puzzle_id || '-shift',
  mode,
  translate(solution, '123456789', '234567891'),
  translate(puzzle, '123456789', '234567891'),
  minimum_duration_ms
from private.ranked_sudoku_puzzles
where puzzle_id in ('ocean-01', 'ocean-02', 'ocean-03')
union all
select
  puzzle_id || '-reverse',
  mode,
  translate(solution, '123456789', '987654321'),
  translate(puzzle, '123456789', '987654321'),
  minimum_duration_ms
from private.ranked_sudoku_puzzles
where puzzle_id in ('ocean-01', 'ocean-02', 'ocean-03');

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
  expected_puzzle_id text := p_context ->> 'puzzleId';
  submitted_puzzle_id text := p_proof ->> 'puzzleId';
  puzzle_text text;
  solution_text text;
  minimum_duration_ms integer;
  events jsonb := p_proof -> 'events';
  event_count integer;
  blank_count integer;
  event_data jsonb;
  event_index_number numeric;
  event_value_number numeric;
  event_elapsed_number numeric;
  event_index integer;
  event_value integer;
  event_elapsed_ms bigint;
  previous_elapsed_ms bigint := 0;
  final_board integer[] := array[]::integer[];
  submitted_solution text;
  elapsed_ms bigint;
  cell_index integer;
begin
  if p_context ->> 'proofVersion' is distinct from '2' then
    raise exception 'Unsupported Sudoku proof version';
  end if;
  if expected_puzzle_id is null or submitted_puzzle_id is distinct from expected_puzzle_id then
    raise exception 'Sudoku puzzle does not match the issued attempt';
  end if;
  if p_proof - array['puzzleId', 'events'] <> '{}'::jsonb then
    raise exception 'Sudoku proof contains unsupported fields';
  end if;
  if jsonb_typeof(events) <> 'array' then
    raise exception 'Sudoku proof must contain an events array';
  end if;

  select ranked_puzzle.puzzle, ranked_puzzle.solution, ranked_puzzle.minimum_duration_ms
  into puzzle_text, solution_text, minimum_duration_ms
  from private.ranked_sudoku_puzzles as ranked_puzzle
  where ranked_puzzle.puzzle_id = expected_puzzle_id
    and ranked_puzzle.mode = p_mode;

  if puzzle_text is null then
    raise exception 'Unknown Sudoku puzzle';
  end if;

  event_count := jsonb_array_length(events);
  blank_count := length(puzzle_text) - length(replace(puzzle_text, '0', ''));
  if event_count < blank_count or event_count > 500 then
    raise exception 'Sudoku proof has an invalid number of events';
  end if;

  for cell_index in 1..81 loop
    final_board := array_append(
      final_board,
      substring(puzzle_text from cell_index for 1)::integer
    );
  end loop;

  for event_data in select value from jsonb_array_elements(events) loop
    if jsonb_typeof(event_data) <> 'object'
      or not (event_data ?& array['index', 'value', 'elapsedMs'])
      or event_data - array['index', 'value', 'elapsedMs'] <> '{}'::jsonb
      or jsonb_typeof(event_data -> 'index') <> 'number'
      or jsonb_typeof(event_data -> 'value') <> 'number'
      or jsonb_typeof(event_data -> 'elapsedMs') <> 'number' then
      raise exception 'Sudoku proof contains a malformed event';
    end if;

    event_index_number := (event_data ->> 'index')::numeric;
    event_value_number := (event_data ->> 'value')::numeric;
    event_elapsed_number := (event_data ->> 'elapsedMs')::numeric;
    if event_index_number <> trunc(event_index_number)
      or event_index_number < 0
      or event_index_number > 80
      or event_value_number <> trunc(event_value_number)
      or event_value_number < 0
      or event_value_number > 9
      or event_elapsed_number <> trunc(event_elapsed_number)
      or event_elapsed_number < 0
      or event_elapsed_number > 86400000 then
      raise exception 'Sudoku proof contains an invalid event value';
    end if;

    event_index := event_index_number::integer + 1;
    event_value := event_value_number::integer;
    event_elapsed_ms := event_elapsed_number::bigint;
    if substring(puzzle_text from event_index for 1) <> '0' then
      raise exception 'Sudoku proof edits a given cell';
    end if;
    if event_elapsed_ms < previous_elapsed_ms then
      raise exception 'Sudoku proof event times are not monotonic';
    end if;
    final_board[event_index] := event_value;
    previous_elapsed_ms := event_elapsed_ms;
  end loop;

  select string_agg(value::text, '' order by ordinal)
  into submitted_solution
  from unnest(final_board) with ordinality as cell(value, ordinal);

  if submitted_solution is distinct from solution_text then
    raise exception 'Sudoku events do not resolve the issued puzzle';
  end if;

  elapsed_ms := floor(extract(epoch from (clock_timestamp() - p_started_at)) * 1000);
  if elapsed_ms < minimum_duration_ms or previous_elapsed_ms < minimum_duration_ms then
    raise exception 'Sudoku attempt completed faster than the ranking permits';
  end if;
  if previous_elapsed_ms > elapsed_ms + 1500 then
    raise exception 'Sudoku proof event time exceeds the server attempt time';
  end if;
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
  attempt_context jsonb := '{}'::jsonb;
  sudoku_puzzle_id text;
  sudoku_puzzle text;
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
    if coalesce(p_context, '{}'::jsonb) <> '{}'::jsonb then
      raise exception 'Sudoku attempt context is server-owned';
    end if;

    select ranked_puzzle.puzzle_id, ranked_puzzle.puzzle
    into sudoku_puzzle_id, sudoku_puzzle
    from private.ranked_sudoku_puzzles as ranked_puzzle
    where ranked_puzzle.mode = p_mode
    order by random()
    limit 1;

    if sudoku_puzzle_id is null then
      raise exception 'No ranked Sudoku puzzle is available';
    end if;
    attempt_context := jsonb_build_object(
      'puzzleId', sudoku_puzzle_id,
      'proofVersion', 2
    );
  elsif p_mode is not null or coalesce(p_context, '{}'::jsonb) <> '{}'::jsonb then
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
    attempt_context,
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

  return jsonb_strip_nulls(jsonb_build_object(
    'attemptId', attempt_id,
    'seed', attempt_seed,
    'startedAt', attempt_started_at,
    'puzzleId', sudoku_puzzle_id,
    'puzzle', sudoku_puzzle,
    'proofVersion', case when sudoku_puzzle_id is not null then 2 end
  ));
end;
$$;

revoke all on function private.verify_ranked_sudoku(text, jsonb, timestamptz, jsonb)
from public, anon, authenticated;
revoke all on function public.begin_ranked_game(text, text, jsonb)
from public, anon;
grant execute on function public.begin_ranked_game(text, text, jsonb)
to authenticated;
