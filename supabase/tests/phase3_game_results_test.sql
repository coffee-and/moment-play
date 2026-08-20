begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select no_plan();

-- Storage and access contract ------------------------------------------------

select has_table('private', 'ranking_boards', 'ranking board registry exists');
select has_table('private', 'ranked_game_attempts', 'ranked attempts remain private');
select has_table('public', 'game_results', 'verified game results exist');

select col_type_is('public', 'game_results', 'board_key', 'text', 'results identify a board');
select col_type_is('public', 'game_results', 'challenge_key', 'text', 'results identify a challenge');
select col_type_is('public', 'game_results', 'rules_version', 'text', 'results pin their rules version');
select col_type_is('public', 'game_results', 'rank_primary', 'bigint', 'results use a generic primary rank');
select col_type_is('public', 'game_results', 'metrics', 'jsonb', 'game metrics are stored as structured data');

select has_pk('private', 'ranking_boards', 'ranking boards have a composite primary key');
select has_pk('private', 'ranked_game_attempts', 'ranked attempts have a primary key');
select has_pk('public', 'game_results', 'game results have a primary key');

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'private.ranking_boards'::regclass)
    and (select relrowsecurity from pg_catalog.pg_class where oid = 'private.ranked_game_attempts'::regclass)
    and (select relrowsecurity from pg_catalog.pg_class where oid = 'public.game_results'::regclass),
  'all ranking storage has RLS enabled'
);

select is(
  (select count(*)
   from information_schema.role_table_grants
   where table_schema in ('private', 'public')
     and table_name in ('ranking_boards', 'ranked_game_attempts', 'game_results')
     and grantee in ('anon', 'authenticated')),
  0::bigint,
  'browser roles cannot access ranking tables directly'
);

select results_eq(
  $$select game_key, board_key, rules_version, challenge_policy
    from private.ranking_boards
    where is_active
    order by game_key, board_key$$,
  $$values
      ('2048'::text, 'classic'::text, '1'::text, 'all-time'::text),
      ('memory'::text, 'standard'::text, '1'::text, 'all-time'::text),
      ('sudoku'::text, 'advanced'::text, '1'::text, 'all-time'::text),
      ('sudoku'::text, 'easy'::text, '1'::text, 'all-time'::text),
      ('sudoku'::text, 'medium'::text, '1'::text, 'all-time'::text)$$,
  'the registry contains only ranking boards with implemented verifiers'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_indexes
    where schemaname = 'public'
      and tablename = 'game_results'
      and indexname = 'game_results_leaderboard_idx'
      and indexdef like '%game_key, board_key, challenge_key, rules_version%'
  ),
  'leaderboard lookup has one contract-aligned index'
);

-- RPC boundary ---------------------------------------------------------------

select has_function(
  'public', 'begin_ranked_game', array['text', 'text', 'text', 'jsonb'],
  'generic ranked attempt RPC exists'
);
select has_function(
  'public', 'complete_ranked_game', array['uuid', 'uuid', 'jsonb'],
  'verified completion RPC exists'
);
select has_function(
  'public', 'get_game_leaderboard', array['text', 'text', 'text', 'text', 'integer'],
  'generic leaderboard RPC exists'
);

select ok(
  (select prosecdef from pg_catalog.pg_proc
   where oid = 'public.begin_ranked_game(text,text,text,jsonb)'::regprocedure)
    and
  (select prosecdef from pg_catalog.pg_proc
   where oid = 'public.complete_ranked_game(uuid,uuid,jsonb)'::regprocedure)
    and
  (select prosecdef from pg_catalog.pg_proc
   where oid = 'public.get_game_leaderboard(text,text,text,text,integer)'::regprocedure),
  'ranking RPCs enforce their server-owned boundary'
);

select ok(
  has_function_privilege('authenticated', 'public.begin_ranked_game(text,text,text,jsonb)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.complete_ranked_game(uuid,uuid,jsonb)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.get_game_leaderboard(text,text,text,text,integer)', 'EXECUTE')
    and has_function_privilege('anon', 'public.get_game_leaderboard(text,text,text,text,integer)', 'EXECUTE'),
  'browser roles receive only the required RPC privileges'
);

select ok(
  not has_function_privilege('anon', 'public.begin_ranked_game(text,text,text,jsonb)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.complete_ranked_game(uuid,uuid,jsonb)', 'EXECUTE'),
  'guests cannot create or submit ranked attempts'
);

-- Existing replay verifier regression ---------------------------------------

select is(
  private.verify_ranked_2048(
    1,
    jsonb_build_object(
      'moves',
      (
        select jsonb_agg(
          (array['left', 'down', 'right', 'down'])[1 + mod(position - 1, 4)]
          order by position
        )
        from generate_series(1, 431) as move(position)
      )
    )
  ),
  4884::bigint,
  '2048 accepts a replay ending at its first terminal state'
);

select throws_ok(
  $$select private.verify_ranked_2048(
      1,
      jsonb_build_object(
        'moves',
        (
          select jsonb_agg(
            (array['left', 'down', 'right', 'down'])[1 + mod(position - 1, 4)]
            order by position
          ) || '["left"]'::jsonb
          from generate_series(1, 431) as move(position)
        )
      )
    )$$,
  'P0001', '2048 proof continues after the first terminal state',
  '2048 rejects moves appended after game over'
);

-- Account and attempt lifecycle ---------------------------------------------

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'rank-a@example.invalid', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), false
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'rank-b@example.invalid', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), false
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.begin_ranked_game('2048', 'classic', '1', '{}'::jsonb)$$,
  '42501', 'A permanent account is required',
  'anonymous accounts cannot start ranked play'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.begin_ranked_game('2048', 'classic', '999', '{}'::jsonb)$$,
  'P0001', 'Unsupported ranking board',
  'callers cannot choose an unregistered rules version'
);

select lives_ok(
  $$select set_config(
      'phase3.sudoku_begin_response',
      public.begin_ranked_game('sudoku', 'easy', '1', '{}'::jsonb)::text,
      true
    )$$,
  'a permanent account can start a registered ranked board'
);

reset role;

select is(
  (
    select array_agg(key order by key)
    from jsonb_object_keys(current_setting('phase3.sudoku_begin_response')::jsonb) as key
  ),
  array['attemptId', 'boardKey', 'challengeKey', 'gameKey', 'payload', 'rulesVersion', 'startedAt'],
  'attempt response exposes the generic envelope only'
);

select ok(
  current_setting('phase3.sudoku_begin_response')::jsonb ->> 'gameKey' = 'sudoku'
    and current_setting('phase3.sudoku_begin_response')::jsonb ->> 'boardKey' = 'easy'
    and current_setting('phase3.sudoku_begin_response')::jsonb ->> 'challengeKey' = 'all-time'
    and current_setting('phase3.sudoku_begin_response')::jsonb #>> '{payload,proofVersion}' = '2'
    and current_setting('phase3.sudoku_begin_response')::jsonb #>> '{payload,puzzle}' ~ '^[0-9]{81}$'
    and not (current_setting('phase3.sudoku_begin_response')::jsonb -> 'payload' ? 'solution'),
  'Sudoku receives a server-selected board without its solution'
);

select set_config(
  'phase3.sudoku_attempt_id',
  current_setting('phase3.sudoku_begin_response')::jsonb ->> 'attemptId',
  true
);

select set_config(
  'phase3.sudoku_proof',
  (
    select jsonb_build_object(
      'puzzleId', attempt.context ->> 'puzzleId',
      'events', (
        select jsonb_agg(
          jsonb_build_object(
            'index', editable.cell_index - 1,
            'value', substring(ranked_puzzle.solution from editable.cell_index for 1)::integer,
            'elapsedMs', ranked_puzzle.minimum_duration_ms + editable.ordinal * 100
          )
          order by editable.cell_index
        )
        from (
          select
            cell_index,
            row_number() over (order by cell_index)::integer as ordinal
          from generate_series(1, 81) as cells(cell_index)
          where substring(ranked_puzzle.puzzle from cell_index for 1) = '0'
        ) as editable
      )
    )::text
    from private.ranked_game_attempts as attempt
    join private.ranked_sudoku_puzzles as ranked_puzzle
      on ranked_puzzle.puzzle_id = attempt.context ->> 'puzzleId'
    where attempt.id = current_setting('phase3.sudoku_attempt_id')::uuid
  ),
  true
);

update private.ranked_game_attempts
set started_at = clock_timestamp() - interval '30 seconds'
where id = current_setting('phase3.sudoku_attempt_id')::uuid;

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.begin_ranked_game(
      'sudoku', 'easy', '1', '{"puzzleId":"ocean-01"}'::jsonb
    )$$,
  'P0001', 'Sudoku attempt context is server-owned',
  'callers cannot choose a ranked Sudoku board'
);

select lives_ok(
  $$select set_config(
      'phase3.sudoku_complete_response',
      public.complete_ranked_game(
        current_setting('phase3.sudoku_attempt_id')::uuid,
        '30000000-0000-4000-8000-000000000001',
        current_setting('phase3.sudoku_proof')::jsonb
      )::text,
      true
    )$$,
  'valid Sudoku replay evidence creates a verified result'
);

select is(
  public.complete_ranked_game(
    current_setting('phase3.sudoku_attempt_id')::uuid,
    '30000000-0000-4000-8000-000000000001',
    current_setting('phase3.sudoku_proof')::jsonb
  ) ->> 'duplicate',
  'true',
  'repeating an accepted submission is idempotent'
);

reset role;

select ok(
  exists (
    select 1
    from public.game_results
    where attempt_id = current_setting('phase3.sudoku_attempt_id')::uuid
      and game_key = 'sudoku'
      and board_key = 'easy'
      and challenge_key = 'all-time'
      and rules_version = '1'
      and (metrics ->> 'durationMs')::bigint >= 29000
      and rank_primary = -((metrics ->> 'durationMs')::bigint)
  ),
  'verified Sudoku time is server-derived and normalized for descending rank order'
);

-- Leaderboard semantics ------------------------------------------------------

insert into private.ranked_game_attempts (
  id, user_id, game_key, board_key, challenge_key, rules_version,
  seed, context, started_at, expires_at, completed_at, client_submission_id, status
)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
   '2048', 'classic', 'all-time', '1', 1, '{}', now() - interval '2 minutes', now() + interval '1 day',
   now(), '30000000-0000-4000-8000-000000000002', 'completed'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
   '2048', 'classic', 'all-time', '1', 2, '{}', now() - interval '2 minutes', now() + interval '1 day',
   now(), '30000000-0000-4000-8000-000000000003', 'completed'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002',
   '2048', 'classic', 'all-time', '1', 3, '{}', now() - interval '2 minutes', now() + interval '1 day',
   now(), '30000000-0000-4000-8000-000000000004', 'completed');

insert into public.game_results (
  user_id, game_key, board_key, challenge_key, rules_version,
  rank_primary, metrics, client_submission_id, attempt_id, verified_at, created_at
)
values
  ('10000000-0000-4000-8000-000000000001', '2048', 'classic', 'all-time', '1',
   100, '{"score":100}', '30000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000001', now(), now() - interval '2 minutes'),
  ('10000000-0000-4000-8000-000000000001', '2048', 'classic', 'all-time', '1',
   300, '{"score":300}', '30000000-0000-4000-8000-000000000003',
   '20000000-0000-4000-8000-000000000002', now(), now() - interval '1 minute'),
  ('10000000-0000-4000-8000-000000000002', '2048', 'classic', 'all-time', '1',
   200, '{"score":200}', '30000000-0000-4000-8000-000000000004',
   '20000000-0000-4000-8000-000000000003', now(), now());

select results_eq(
  $$select rank, (metrics ->> 'score')::bigint
    from public.get_game_leaderboard('2048', 'classic', 'all-time', '1', 50)
    order by rank$$,
  $$values (1::bigint, 300::bigint), (2::bigint, 200::bigint)$$,
  'leaderboard keeps each player best result and orders normalized rank values'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);

select results_eq(
  $$select is_current_user
    from public.get_game_leaderboard('2048', 'classic', 'all-time', '1', 1)$$,
  $$values (true)$$,
  'leaderboard identifies the signed-in player without exposing user ids'
);

select throws_ok(
  $$select * from public.get_game_leaderboard('2048', 'classic', 'daily:forged', '1', 50)$$,
  'P0001', 'Ranking challenge does not match the board policy',
  'leaderboard rejects challenge keys outside the board policy'
);

select throws_ok(
  $$select * from public.get_game_leaderboard('2048', 'classic', 'all-time', '1', 0)$$,
  'P0001', 'Leaderboard limit must be between 1 and 100',
  'leaderboard bounds caller-controlled result limits'
);

set local role anon;
select throws_ok(
  $$select * from public.game_results$$,
  '42501', 'permission denied for table game_results',
  'public leaderboard access does not expose the underlying result table'
);
reset role;

select * from finish();
rollback;
