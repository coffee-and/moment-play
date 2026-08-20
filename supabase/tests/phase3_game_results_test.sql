begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select no_plan();

-- Storage and access contract ------------------------------------------------

select has_table('private', 'ranking_boards', 'ranking board registry exists');
select has_table('private', 'ranked_game_attempts', 'ranked attempts remain private');
select has_table('private', 'ranked_flappy_checkpoints', 'endless flight checkpoints remain private');
select has_table('public', 'game_results', 'verified game results exist');

select col_type_is('public', 'game_results', 'board_key', 'text', 'results identify a board');
select col_type_is('public', 'game_results', 'challenge_key', 'text', 'results identify a challenge');
select col_type_is('public', 'game_results', 'rules_version', 'text', 'results pin their rules version');
select col_type_is('public', 'game_results', 'rank_primary', 'bigint', 'results use a generic primary rank');
select col_type_is('public', 'game_results', 'metrics', 'jsonb', 'game metrics are stored as structured data');

select has_pk('private', 'ranking_boards', 'ranking boards have a composite primary key');
select has_pk('private', 'ranked_game_attempts', 'ranked attempts have a primary key');
select has_pk('public', 'game_results', 'game results have a primary key');
select has_index(
  'private', 'ranked_game_attempts', 'ranked_game_attempts_expired_open_idx',
  'expired open attempts can be cleaned without scanning completed history'
);

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'private.ranking_boards'::regclass)
    and (select relrowsecurity from pg_catalog.pg_class where oid = 'private.ranked_game_attempts'::regclass)
    and (select relrowsecurity from pg_catalog.pg_class where oid = 'private.ranked_flappy_checkpoints'::regclass)
    and (select relrowsecurity from pg_catalog.pg_class where oid = 'public.game_results'::regclass),
  'all ranking storage has RLS enabled'
);

select is(
  (select count(*)
   from information_schema.role_table_grants
   where table_schema in ('private', 'public')
     and table_name in ('ranking_boards', 'ranked_game_attempts', 'ranked_flappy_checkpoints', 'game_results')
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
      ('flappy'::text, 'course'::text, '1'::text, 'all-time'::text),
      ('flappy'::text, 'endless'::text, '1'::text, 'all-time'::text),
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
  'public', 'checkpoint_ranked_flappy', array['uuid', 'integer', 'bigint', 'jsonb'],
  'bounded endless flight checkpoint RPC exists'
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
   where oid = 'public.checkpoint_ranked_flappy(uuid,integer,bigint,jsonb)'::regprocedure)
    and
  (select prosecdef from pg_catalog.pg_proc
   where oid = 'public.get_game_leaderboard(text,text,text,text,integer)'::regprocedure),
  'ranking RPCs enforce their server-owned boundary'
);

select ok(
  has_function_privilege('authenticated', 'public.begin_ranked_game(text,text,text,jsonb)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.complete_ranked_game(uuid,uuid,jsonb)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.checkpoint_ranked_flappy(uuid,integer,bigint,jsonb)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.get_game_leaderboard(text,text,text,text,integer)', 'EXECUTE')
    and has_function_privilege('anon', 'public.get_game_leaderboard(text,text,text,text,integer)', 'EXECUTE'),
  'browser roles receive only the required RPC privileges'
);

select ok(
  not has_function_privilege('anon', 'public.begin_ranked_game(text,text,text,jsonb)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.complete_ranked_game(uuid,uuid,jsonb)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.checkpoint_ranked_flappy(uuid,integer,bigint,jsonb)', 'EXECUTE'),
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

-- Star Flight replay parity -------------------------------------------------

select is(
  private.replay_ranked_flappy(12345, 'endless', null, 0, 151, '[]'::jsonb) ->> 'status',
  'over',
  'Star Flight replay reaches the same no-input terminal state as the client simulation'
);

select is(
  (private.replay_ranked_flappy(12345, 'endless', null, 0, 151, '[]'::jsonb)
    #>> '{world,mistakes}')::integer,
  2,
  'Star Flight replay consumes the final life before ending'
);

select throws_ok(
  $$select private.replay_ranked_flappy(
      12345,
      'endless',
      null,
      0,
      152,
      '[]'::jsonb
    )$$,
  'P0001', 'Star Flight proof continues after the terminal state',
  'Star Flight rejects replay ranges extending beyond game over'
);

select throws_ok(
  $$select private.replay_ranked_flappy(
      12345,
      'endless',
      null,
      0,
      151,
      '[10, 10]'::jsonb
    )$$,
  'P0001', 'Star Flight flap ticks are outside the replay range or unordered',
  'Star Flight rejects duplicate flap ticks'
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

select set_config(
  'phase3.replaced_attempt_id',
  public.begin_ranked_game('2048', 'classic', '1', '{}'::jsonb) ->> 'attemptId',
  true
);

select set_config(
  'phase3.replacement_attempt_id',
  public.begin_ranked_game('2048', 'classic', '1', '{}'::jsonb) ->> 'attemptId',
  true
);

select isnt(
  current_setting('phase3.replaced_attempt_id'),
  current_setting('phase3.replacement_attempt_id'),
  'restarting a ranking board receives a fresh attempt identity'
);

reset role;

select ok(
  not exists (
    select 1
    from private.ranked_game_attempts as attempt
    where attempt.id = current_setting('phase3.replaced_attempt_id')::uuid
  ),
  'a replaced open attempt is removed instead of accumulating dead state'
);

set local role authenticated;

select throws_ok(
  $$select public.complete_ranked_game(
      current_setting('phase3.replaced_attempt_id')::uuid,
      '30000000-0000-4000-8000-000000000014',
      '{"moves":[]}'::jsonb
    )$$,
  '42501', 'Ranked game attempt was not found',
  'late evidence cannot complete a replaced attempt'
);

select set_config(
  'phase3.expired_attempt_id',
  public.begin_ranked_game('memory', 'standard', '1', '{}'::jsonb) ->> 'attemptId',
  true
);

reset role;

update private.ranked_game_attempts
set expires_at = clock_timestamp() - interval '1 second'
where id = current_setting('phase3.expired_attempt_id')::uuid;

select lives_ok(
  $$select public.moment_play_cleanup_expired_data()$$,
  'the daily cleanup accepts expired ranked attempts'
);

select ok(
  not exists (
    select 1
    from private.ranked_game_attempts
    where id = current_setting('phase3.expired_attempt_id')::uuid
  ),
  'expired open attempts are removed from ranking storage'
);

set local role authenticated;

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

-- Star Flight attempt and checkpoint lifecycle -----------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.begin_ranked_game(
      'flappy', 'endless', '1', '{"mode":"course"}'::jsonb
    )$$,
  'P0001', 'This ranking board does not accept client context',
  'callers cannot choose Star Flight attempt context'
);

select lives_ok(
  $$select set_config(
      'phase3.flappy_endless_begin_response',
      public.begin_ranked_game('flappy', 'endless', '1', '{}'::jsonb)::text,
      true
    )$$,
  'a permanent account can start an endless Star Flight attempt'
);

select ok(
  current_setting('phase3.flappy_endless_begin_response')::jsonb ->> 'gameKey' = 'flappy'
    and current_setting('phase3.flappy_endless_begin_response')::jsonb ->> 'boardKey' = 'endless'
    and current_setting('phase3.flappy_endless_begin_response')::jsonb #>> '{payload,mode}' = 'endless'
    and current_setting('phase3.flappy_endless_begin_response')::jsonb #>> '{payload,proofVersion}' = '1'
    and current_setting('phase3.flappy_endless_begin_response')::jsonb #>> '{payload,tickMs}' = '20'
    and current_setting('phase3.flappy_endless_begin_response')::jsonb #>> '{payload,checkpointTickLimit}' = '1500',
  'endless attempts expose only their fixed simulation and checkpoint contract'
);

select set_config(
  'phase3.flappy_endless_attempt_id',
  current_setting('phase3.flappy_endless_begin_response')::jsonb ->> 'attemptId',
  true
);

select throws_ok(
  $$select public.complete_ranked_game(
      current_setting('phase3.flappy_endless_attempt_id')::uuid,
      '30000000-0000-4000-8000-000000000010',
      '{"proofVersion":1,"checkpointSequence":0}'::jsonb
    )$$,
  'P0001', 'Star Flight endless run has no matching terminal checkpoint',
  'endless attempts cannot complete before a terminal checkpoint'
);

select throws_ok(
  $$select public.checkpoint_ranked_flappy(
      current_setting('phase3.flappy_endless_attempt_id')::uuid,
      2,
      151,
      '[]'::jsonb
    )$$,
  'P0001', 'Star Flight checkpoint sequence is invalid',
  'endless checkpoints must arrive in sequence'
);

select throws_ok(
  $$select public.checkpoint_ranked_flappy(
      current_setting('phase3.flappy_endless_attempt_id')::uuid,
      1,
      1501,
      '[]'::jsonb
    )$$,
  'P0001', 'Star Flight checkpoint range is invalid',
  'endless checkpoints cannot exceed the bounded replay window'
);

reset role;

update private.ranked_game_attempts
set seed = 12345,
    started_at = clock_timestamp() - interval '30 seconds'
where id = current_setting('phase3.flappy_endless_attempt_id')::uuid;

update private.ranked_flappy_checkpoints
set state = private.create_ranked_flappy_state(12345, 'endless')
where attempt_id = current_setting('phase3.flappy_endless_attempt_id')::uuid;

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.checkpoint_ranked_flappy(
      current_setting('phase3.flappy_endless_attempt_id')::uuid,
      1,
      151,
      '[]'::jsonb
    )$$,
  '42501', 'Ranked game attempt was not found',
  'another player cannot append to an endless checkpoint'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.checkpoint_ranked_flappy(
      current_setting('phase3.flappy_endless_attempt_id')::uuid,
      1,
      151,
      '[]'::jsonb
    )$$,
  'P0001', 'Star Flight endless run was not continuously active',
  'server time rejects a paused endless run'
);

reset role;
update private.ranked_game_attempts
set started_at = clock_timestamp() - interval '3.02 seconds'
where id = current_setting('phase3.flappy_endless_attempt_id')::uuid;
set local role authenticated;

select lives_ok(
  $$select set_config(
      'phase3.flappy_checkpoint_response',
      public.checkpoint_ranked_flappy(
        current_setting('phase3.flappy_endless_attempt_id')::uuid,
        1,
        151,
        '[]'::jsonb
      )::text,
      true
    )$$,
  'a bounded endless replay can reach a verified terminal checkpoint'
);

select ok(
  current_setting('phase3.flappy_checkpoint_response')::jsonb ->> 'status' = 'over'
    and current_setting('phase3.flappy_checkpoint_response')::jsonb ->> 'duplicate' = 'false'
    and current_setting('phase3.flappy_checkpoint_response')::jsonb #>> '{metrics,survivalMs}' = '3020'
    and current_setting('phase3.flappy_checkpoint_response')::jsonb #>> '{metrics,endlessScore}' = '0'
    and current_setting('phase3.flappy_checkpoint_response')::jsonb #>> '{metrics,endlessGates}' = '0',
  'the checkpoint response contains only server-derived endless metrics'
);

select is(
  public.checkpoint_ranked_flappy(
    current_setting('phase3.flappy_endless_attempt_id')::uuid,
    1,
    151,
    '[]'::jsonb
  ) ->> 'duplicate',
  'true',
  'an identical checkpoint retry is idempotent after a lost response'
);

select throws_ok(
  $$select public.checkpoint_ranked_flappy(
      current_setting('phase3.flappy_endless_attempt_id')::uuid,
      1,
      151,
      '[1]'::jsonb
    )$$,
  'P0001', 'Star Flight checkpoint retry does not match the accepted chunk',
  'a checkpoint sequence cannot be reused with different input'
);

select throws_ok(
  $$select public.checkpoint_ranked_flappy(
      current_setting('phase3.flappy_endless_attempt_id')::uuid,
      2,
      152,
      '[]'::jsonb
    )$$,
  'P0001', 'Star Flight checkpoint is not active',
  'terminal endless checkpoints cannot be extended'
);

select lives_ok(
  $$select public.complete_ranked_game(
      current_setting('phase3.flappy_endless_attempt_id')::uuid,
      '30000000-0000-4000-8000-000000000011',
      '{"proofVersion":1,"checkpointSequence":1}'::jsonb
    )$$,
  'a matching terminal checkpoint creates an endless ranking result'
);

reset role;

select ok(
  exists (
    select 1
    from public.game_results
    where attempt_id = current_setting('phase3.flappy_endless_attempt_id')::uuid
      and game_key = 'flappy'
      and board_key = 'endless'
      and metrics = '{"survivalMs":3020,"endlessScore":0,"endlessGates":0}'::jsonb
      and rank_primary = 3020
      and rank_secondary = 0
      and rank_tertiary = 0
  ),
  'endless rankings order survival time before score and passed gates'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select lives_ok(
  $$select set_config(
      'phase3.flappy_course_begin_response',
      public.begin_ranked_game('flappy', 'course', '1', '{}'::jsonb)::text,
      true
    )$$,
  'a permanent account can start a course Star Flight attempt'
);

select set_config(
  'phase3.flappy_course_attempt_id',
  current_setting('phase3.flappy_course_begin_response')::jsonb ->> 'attemptId',
  true
);

select set_config(
  'phase3.flappy_course_proof',
  jsonb_build_object(
    'proofVersion', 1,
    'maxTicks', 22500,
    'flapTicks', to_jsonb(string_to_array(
      $ticks$15,30,59,95,132,168,233,268,302,338,374,411,465,502,538,553,568,583,598,613,628,659,717,753,782,797,812,827,858,894,935,971,1007,1057,1093,1130,1174,1210,1247,1262,1277,1309,1346,1382,1397,1412,1427,1442,1457,1488,1559,1595,1622,1637,1652,1667,1682,1697,1725,1773,1810,1846,1862,1889,1926,1962,1993,2030,2066,2122,2158,2195,2222,2237,2252,2287,2324,2399,2436,2462,2496,2532,2569,2584,2614,2650,2687,2702,2717,2732,2761,2797,2830,2867,2903,2940,2990,3027,3062,3077,3092,3107,3134,3171,3226,3262,3299,3364,3401,3449,3485,3522,3542,3557,3572,3609,3645,3696,3731,3768,3783,3811,3847,3884,3930,3967,4003,4022,4037,4052,4067,4082,4097,4126,4180,4215,4252,4310,4346,4382,4397,4412,4427,4442,4457,4490,4505,4520,4535,4550,4565,4602,4655,4691,4728,4798,4834,4852,4867,4882,4897,4912,4927,4942,4957,4998,5034,5070,5122,5158,5194,5246,5281,5318,5333,5348,5383,5420,5479,5515,5551,5566,5598,5634,5667,5682,5711,5748,5784,5812,5849,5885,5936,5973,6009,6039,6076,6112,6158,6194,6231,6250,6265,6280,6295,6310,6325,6350,6411,6448,6505,6542,6578,6627,6663,6700,6716,6731,6746,6761,6776,6810,6874,6908,6945,6960,6975,6990,7005,7020,7035,7050,7065,7080,7095,7110,7141,7177,7254,7289,7304,7319,7356,7392,7415,7430,7445,7460,7490,7527,7591,7628,7654,7691,7727,7784,7819,7855,7881,7896,7911,7926,7941,7956,7960,7975,7990,8040,8076,8112,8167,8202,8230,8245,8260,8290,8327,8390,8427,8463,8478,8493,8508,8523,8538,8553,8568,8640,8675,8707,8744,8780,8813,8828,8843,8858,8873,8888,8903,8918,8966,9002,9038,9094,9129,9178,9214,9251,9271,9286,9301,9316,9331,9346,9361,9376,9448,9483,9498,9513,9528,9543,9558,9573,9588,9640,9677,9713,9779,9814,9837,9852,9867,9882,9897,9912,9914,9929,9944,10004,10040,10093,10129,10165,10180,10195,10210,10225,10240,10255,10290,10305,10320,10356,10393,10466,10502,10517,10532,10547,10562,10577,10592,10607,10622,10695,10730,10745,10760,10775,10790,10805,10820,10835,10850,10865,10900,10937,10990,11026,11063,11121,11157,11194,11209,11224,11239,11254,11269,11284,11299,11339,11375,11412,11457,11493,11529,11588,11624,11683,11718,11754,11769,11784,11799,11814,11829,11844,11859,11874,11927,11962,12025,12060,12097,12112,12127,12163,12200,12215,12230,12245,12260,12275,12290,12315,12393,12428,12443,12458,12473,12488,12503,12518,12548,12603,12640,12680,12716,12752,12780,12795,12832,12868,12905,12942,12978,13007,13022,13037,13052,13087,13129,13165,13201,13274,13310,13346,13361,13376,13411,13447,13462,13477,13492,13507,13537,13571,13602,13638,13675,13741,13777,13792,13807,13822,13857,13893,13926,13963,13999,14031,14068,14104,14158,14194,14230,14245,14260,14275,14290,14321,14342,14357,14393,14430,14473,14509,14546,14605,14640,14672,14687,14702,14717,14732,14757,14835,14870,14892,14907,14922,14937,14952,14967,14982,14997,15056,15092,15112,15127,15142,15157,15172,15187,15202,15257,15293,15330,15345,15360,15393,15429,15492,15526,15590,15625,15661,15699,15736,15772,15787,15802,15833,15870,15885,15900,15915,15930,15945,15960,15975,16051,16085,16103,16118,16133,16155,16192,16213,16228,16243,16258,16273,16288,16319,16360,16396,16468,16503,16539,16554,16569,16605,16641,16656,16671,16686,16701,16716,16745,16777,16814,16850,16927,16964,16984,16999,17014,17029,17044,17059,17074,17089,17156,17191,17206,17221,17236,17251,17266,17281,17296,17311,17385,17419,17434,17449,17464,17479,17494,17509,17524,17581,17616,17681,17716,17752,17767,17782,17797,17826,17863,17878,17893,17908,17923,17938,17971,18009,18046,18103,18140,18176,18191,18206,18221,18255,18291,18363,18398,18434,18471,18507,18545,18582,18618,18633,18648,18663,18699,18741,18777,18813,18853,18889,18926,18941,18956,18971,18986,19001,19016,19041,19097,19134,19156,19193,19229,19286,19321,19358,19373,19388,19403,19435,19472,19528,19563,19582,19614,19650,19687,19724,19760,19797,19812,19827,19842,19857,19872,19902,19982,20011,20026,20058,20094,20118,20148,20185,20221,20252,20288,20325,20340,20355,20370,20385,20400,20415,20463,20499,20535,20580,20617,20653,20712,20747,20792,20828,20865,20880,20913,20949,20975,20990,21005,21020,21035,21050,21078,21135,21171,21190,21216,21253,21289,21353,21389,21404,21419,21434,21449,21464,21501,21575,21612,21627,21642,21657,21672,21687,21691,21706,21721,21736,21751,21783,21820,21865,21901,21938,21996,22033,22086,22123,22154,22169,22184,22199,22214,22229,22244,22259,22318,22355,22413,22449,22475,22490$ticks$,
      ','
    )::bigint[])
  )::text,
  true
);

reset role;

update private.ranked_game_attempts
set seed = 12345,
    started_at = clock_timestamp() - interval '450 seconds'
where id = current_setting('phase3.flappy_course_attempt_id')::uuid;

set local role authenticated;

select lives_ok(
  $$select set_config(
      'phase3.flappy_course_complete_response',
      public.complete_ranked_game(
        current_setting('phase3.flappy_course_attempt_id')::uuid,
        '30000000-0000-4000-8000-000000000012',
        current_setting('phase3.flappy_course_proof')::jsonb
      )::text,
      true
    )$$,
  'a client-generated fixed-tick course proof creates a verified result'
);

select ok(
  current_setting('phase3.flappy_course_complete_response')::jsonb #>> '{metrics,courseScore}' = '5790'
    and current_setting('phase3.flappy_course_complete_response')::jsonb #>> '{metrics,courseMaxCombo}' = '66'
    and current_setting('phase3.flappy_course_complete_response')::jsonb #>> '{metrics,courseMistakes}' = '4',
  'course metrics match the deterministic client replay fixture'
);

reset role;

select ok(
  exists (
    select 1
    from public.game_results
    where attempt_id = current_setting('phase3.flappy_course_attempt_id')::uuid
      and game_key = 'flappy'
      and board_key = 'course'
      and rank_primary = 5790
      and rank_secondary = 66
      and rank_tertiary = -4
  ),
  'course rankings order score and combo before fewer mistakes'
);

set local role authenticated;

select set_config(
  'phase3.flappy_fast_course_attempt_id',
  public.begin_ranked_game('flappy', 'course', '1', '{}'::jsonb) ->> 'attemptId',
  true
);

select throws_ok(
  $$select public.complete_ranked_game(
      current_setting('phase3.flappy_fast_course_attempt_id')::uuid,
      '30000000-0000-4000-8000-000000000013',
      current_setting('phase3.flappy_course_proof')::jsonb
    )$$,
  'P0001', 'Star Flight course completed faster than server time',
  'course results cannot claim more fixed ticks than server elapsed time'
);

reset role;

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
