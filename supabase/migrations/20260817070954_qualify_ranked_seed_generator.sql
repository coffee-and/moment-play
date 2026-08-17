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
    random_bytes := extensions.gen_random_bytes(4);
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

revoke all on function public.begin_ranked_game(text, text, jsonb)
from public, anon;
grant execute on function public.begin_ranked_game(text, text, jsonb)
to authenticated;
