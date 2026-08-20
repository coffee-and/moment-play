-- Ranked results are still pre-release data. Rebuild the ranking storage around
-- one game-independent ordering contract instead of retaining per-game value
-- columns that would require a schema change for every new leaderboard.

drop function if exists public.get_game_leaderboard(text, text, integer);
drop function if exists public.begin_ranked_game(text, text, jsonb);
drop function if exists public.complete_ranked_game(uuid, uuid, jsonb);

drop table if exists public.game_results;
drop table if exists private.ranked_game_attempts;
drop table if exists private.ranking_boards;

create table private.ranking_boards (
  game_key text not null,
  board_key text not null,
  rules_version text not null,
  challenge_policy text not null,
  is_active boolean not null default true,
  primary key (game_key, board_key, rules_version),
  constraint ranking_boards_game_key_check
    check (game_key ~ '^[a-z0-9][a-z0-9-]{0,31}$'),
  constraint ranking_boards_board_key_check
    check (board_key ~ '^[a-z0-9][a-z0-9-]{0,31}$'),
  constraint ranking_boards_rules_version_check
    check (rules_version ~ '^[a-z0-9][a-z0-9._-]{0,31}$'),
  constraint ranking_boards_challenge_policy_check
    check (challenge_policy in ('all-time', 'daily'))
);

insert into private.ranking_boards (
  game_key,
  board_key,
  rules_version,
  challenge_policy
)
values
  ('2048', 'classic', '1', 'all-time'),
  ('memory', 'standard', '1', 'all-time'),
  ('sudoku', 'easy', '1', 'all-time'),
  ('sudoku', 'medium', '1', 'all-time'),
  ('sudoku', 'advanced', '1', 'all-time');

create table private.ranked_game_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null,
  board_key text not null,
  challenge_key text not null,
  rules_version text not null,
  seed bigint null,
  context jsonb not null default '{}'::jsonb,
  started_at timestamptz not null,
  expires_at timestamptz not null,
  completed_at timestamptz null,
  client_submission_id uuid null,
  status text not null default 'open',
  constraint ranked_game_attempts_board_fk
    foreign key (game_key, board_key, rules_version)
    references private.ranking_boards(game_key, board_key, rules_version),
  constraint ranked_game_attempts_challenge_key_check
    check (challenge_key ~ '^[a-z0-9][a-z0-9:_-]{0,63}$'),
  constraint ranked_game_attempts_context_check
    check (jsonb_typeof(context) = 'object'),
  constraint ranked_game_attempts_status_check
    check (status in ('open', 'completed')),
  constraint ranked_game_attempts_lifecycle_check
    check (
      (status = 'open' and completed_at is null and client_submission_id is null)
      or (status = 'completed' and completed_at is not null and client_submission_id is not null)
    )
);

create unique index ranked_game_attempts_one_open_per_board_idx
on private.ranked_game_attempts(user_id, game_key, board_key)
where status = 'open';

create table public.game_results (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null,
  board_key text not null,
  challenge_key text not null,
  rules_version text not null,
  rank_primary bigint not null,
  rank_secondary bigint not null default 0,
  rank_tertiary bigint not null default 0,
  metrics jsonb not null,
  client_submission_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  attempt_id uuid not null references private.ranked_game_attempts(id) on delete restrict,
  verified_at timestamptz not null,
  constraint game_results_board_fk
    foreign key (game_key, board_key, rules_version)
    references private.ranking_boards(game_key, board_key, rules_version),
  constraint game_results_challenge_key_check
    check (challenge_key ~ '^[a-z0-9][a-z0-9:_-]{0,63}$'),
  constraint game_results_metrics_check
    check (jsonb_typeof(metrics) = 'object'),
  constraint game_results_client_submission_unique
    unique (user_id, client_submission_id),
  constraint game_results_attempt_unique
    unique (attempt_id)
);

create index game_results_leaderboard_idx
on public.game_results(
  game_key,
  board_key,
  challenge_key,
  rules_version,
  rank_primary desc,
  rank_secondary desc,
  rank_tertiary desc,
  created_at asc
);

alter table private.ranking_boards enable row level security;
alter table private.ranked_game_attempts enable row level security;
alter table public.game_results enable row level security;

revoke all on table private.ranking_boards from public, anon, authenticated;
revoke all on table private.ranked_game_attempts from public, anon, authenticated;
revoke all on table public.game_results from public, anon, authenticated;

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

    attempt_context := jsonb_build_object(
      'proofVersion', 2,
      'puzzleId', sudoku_puzzle_id
    );
    attempt_payload := jsonb_build_object(
      'proofVersion', 2,
      'puzzleId', sudoku_puzzle_id,
      'puzzle', sudoku_puzzle
    );
  elsif p_game_key in ('2048', 'memory') then
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
  else
    raise exception 'Ranking board verifier is not implemented';
  end if;

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
  on conflict (user_id, game_key, board_key) where status = 'open'
  do update
  set challenge_key = excluded.challenge_key,
      rules_version = excluded.rules_version,
      seed = excluded.seed,
      context = excluded.context,
      started_at = excluded.started_at,
      expires_at = excluded.expires_at,
      completed_at = null,
      client_submission_id = null
  returning id into attempt_id;

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

create or replace function public.get_game_leaderboard(
  p_game_key text,
  p_board_key text,
  p_challenge_key text,
  p_rules_version text,
  p_limit integer default 50
)
returns table (
  rank bigint,
  nickname text,
  game_key text,
  board_key text,
  challenge_key text,
  rules_version text,
  metrics jsonb,
  created_at timestamptz,
  is_current_user boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  selected_board private.ranking_boards%rowtype;
begin
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
  if p_challenge_key is null
    or p_challenge_key !~ '^[a-z0-9][a-z0-9:_-]{0,63}$' then
    raise exception 'Invalid ranking challenge';
  end if;
  if (selected_board.challenge_policy = 'all-time' and p_challenge_key <> 'all-time')
    or (
      selected_board.challenge_policy = 'daily'
      and p_challenge_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    ) then
    raise exception 'Ranking challenge does not match the board policy';
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
          result.rank_primary desc,
          result.rank_secondary desc,
          result.rank_tertiary desc,
          result.created_at asc
      ) as user_result_order
    from public.game_results as result
    where result.game_key = p_game_key
      and result.board_key = p_board_key
      and result.challenge_key = p_challenge_key
      and result.rules_version = p_rules_version
  ),
  ranked_results as (
    select
      result.*,
      dense_rank() over (
        order by
          result.rank_primary desc,
          result.rank_secondary desc,
          result.rank_tertiary desc
      ) as result_rank
    from ordered_results as result
    where result.user_result_order = 1
  )
  select
    result.result_rank,
    coalesce(profile.nickname, 'Player'),
    result.game_key,
    result.board_key,
    result.challenge_key,
    result.rules_version,
    result.metrics,
    result.created_at,
    result.user_id = auth.uid()
  from ranked_results as result
  left join public.profiles as profile on profile.user_id = result.user_id
  order by result.result_rank, result.created_at
  limit p_limit;
end;
$$;

revoke all on function public.begin_ranked_game(text, text, text, jsonb)
from public, anon, authenticated;
grant execute on function public.begin_ranked_game(text, text, text, jsonb)
to authenticated;

revoke all on function public.complete_ranked_game(uuid, uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.complete_ranked_game(uuid, uuid, jsonb)
to authenticated;

revoke all on function public.get_game_leaderboard(text, text, text, text, integer)
from public, anon, authenticated;
grant execute on function public.get_game_leaderboard(text, text, text, text, integer)
to anon, authenticated;
