begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(97);

-- Schema ---------------------------------------------------------------------

select has_table('public', 'game_results', 'game_results table exists');

select columns_are(
  'public',
  'game_results',
  array[
    'id', 'user_id', 'game_key', 'mode', 'score_value', 'duration_ms',
    'match_result', 'client_submission_id', 'created_at', 'attempt_id', 'verified_at'
  ],
  'game_results has exactly the required columns'
);

select col_type_is('public', 'game_results', 'id', 'uuid', 'id is uuid');
select col_type_is('public', 'game_results', 'user_id', 'uuid', 'user_id is uuid');
select col_type_is('public', 'game_results', 'game_key', 'text', 'game_key is text');
select col_type_is('public', 'game_results', 'mode', 'text', 'mode is text');
select col_type_is('public', 'game_results', 'score_value', 'bigint', 'score_value is bigint');
select col_type_is('public', 'game_results', 'duration_ms', 'bigint', 'duration_ms is bigint');
select col_type_is('public', 'game_results', 'match_result', 'text', 'match_result is text');
select col_type_is('public', 'game_results', 'client_submission_id', 'uuid', 'client_submission_id is uuid');
select col_type_is('public', 'game_results', 'created_at', 'timestamp with time zone', 'created_at is timestamptz');

select has_pk('public', 'game_results', 'game_results has a primary key');

select has_table('private', 'ranked_sudoku_puzzles', 'ranked Sudoku puzzle table exists');

select columns_are(
  'private',
  'ranked_sudoku_puzzles',
  array['puzzle_id', 'mode', 'solution', 'puzzle', 'minimum_duration_ms'],
  'ranked Sudoku puzzles keep the board, solution, and timing policy server-side'
);

select ok(
  (select relrowsecurity
   from pg_catalog.pg_class
   where oid = 'private.ranked_sudoku_puzzles'::regclass),
  'RLS is enabled on ranked Sudoku puzzles'
);

select is(
  (select count(*)
   from information_schema.role_table_grants
   where table_schema = 'private'
     and table_name = 'ranked_sudoku_puzzles'
     and grantee in ('anon', 'authenticated')),
  0::bigint,
  'browser roles have no direct access to ranked Sudoku puzzles or solutions'
);

select results_eq(
  $$select mode, count(*)
    from private.ranked_sudoku_puzzles
    group by mode
    order by mode$$,
  $$values
      ('advanced'::text, 3::bigint),
      ('easy'::text, 3::bigint),
      ('medium'::text, 3::bigint)$$,
  'the server has multiple reviewed boards for every Sudoku difficulty'
);

select has_function(
  'private', 'ranked_2048_is_terminal', array['integer[]'],
  'ranked 2048 has one server-owned terminal-state predicate'
);

select is(
  private.ranked_2048_is_terminal(
    array[2048, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ),
  true,
  'a board with the target tile is terminal'
);

select is(
  private.ranked_2048_is_terminal(
    array[2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]
  ),
  true,
  'a full board without adjacent matches is terminal'
);

select is(
  private.ranked_2048_is_terminal(
    array[2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ),
  false,
  'a board with an available cell is not terminal'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'private.ranked_2048_is_terminal(integer[])',
    'EXECUTE'
  ),
  'browser roles cannot call the private 2048 terminal predicate'
);

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
  'ranked 2048 accepts a replay ending exactly when no move remains'
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
  'ranked 2048 rejects moves appended after a no-move game over'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.game_results'::regclass
      and contype = 'f'
      and confrelid = 'auth.users'::regclass
      and pg_get_constraintdef(oid) like 'FOREIGN KEY (user_id)%ON DELETE CASCADE'
  ),
  'user_id has the required auth.users foreign key with cascade delete'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.game_results'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%game_key%2048%memory%sudoku%omok%'
  ),
  'game_key has the supported-games check constraint'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.game_results'::regclass
      and contype = 'c'
      and conname = 'game_results_shape_check'
  ),
  'game result shapes have a check constraint'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.game_results'::regclass
      and contype = 'u'
      and conname = 'game_results_client_submission_unique'
      and pg_get_constraintdef(oid) = 'UNIQUE (user_id, client_submission_id)'
  ),
  'user and client submission id have the required unique constraint'
);

select has_index(
  'public', 'game_results', 'game_results_score_leaderboard_idx',
  'score leaderboard index exists'
);

select has_index(
  'public', 'game_results', 'game_results_duration_leaderboard_idx',
  'duration leaderboard index exists'
);

select ok(
  (select indexdef like '%(game_key, mode, score_value DESC, created_at)%verified_at IS NOT NULL%'
   from pg_catalog.pg_indexes
   where schemaname = 'public' and indexname = 'game_results_score_leaderboard_idx'),
  'score index has the required descending-score ordering and predicate'
);

select ok(
  (select indexdef like '%(game_key, mode, duration_ms, created_at)%verified_at IS NOT NULL%'
   from pg_catalog.pg_indexes
   where schemaname = 'public' and indexname = 'game_results_duration_leaderboard_idx'),
  'duration index has the required ascending-duration ordering and predicate'
);

select has_function(
  'public', 'get_game_leaderboard', array['text', 'text', 'integer'],
  'get_game_leaderboard(text,text,integer) exists'
);

select is(
  pg_catalog.pg_get_function_result('public.get_game_leaderboard(text,text,integer)'::regprocedure),
  'TABLE(rank bigint, nickname text, game_key text, mode text, score_value bigint, duration_ms bigint, match_result text, created_at timestamp with time zone, is_current_user boolean)',
  'leaderboard RPC return shape matches the migration'
);

select is(
  (
    select array_agg(name order by ordinal)
    from pg_catalog.pg_proc p
    cross join lateral unnest(p.proargnames, p.proargmodes) with ordinality as args(name, mode, ordinal)
    where p.oid = 'public.get_game_leaderboard(text,text,integer)'::regprocedure
      and args.mode in ('o', 't')
  ),
  array['rank', 'nickname', 'game_key', 'mode', 'score_value', 'duration_ms', 'match_result', 'created_at', 'is_current_user'],
  'leaderboard RPC exposes only approved public field names'
);

-- Security configuration ------------------------------------------------------

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.game_results'::regclass),
  'RLS is enabled on game_results'
);

select ok(
  not exists (
    select 1 from pg_catalog.pg_policy
    where polrelid = 'public.game_results'::regclass
      and polname = 'game_results_insert_permanent_own'
  ),
  'the former direct-insert policy has been removed'
);

select has_function(
  'public', 'begin_ranked_game', array['text', 'text', 'jsonb'],
  'begin_ranked_game(text,text,jsonb) exists'
);

select has_function(
  'public', 'complete_ranked_game', array['uuid', 'uuid', 'jsonb'],
  'complete_ranked_game(uuid,uuid,jsonb) exists'
);

select ok(
  (select prosecdef from pg_catalog.pg_proc
   where oid = 'public.begin_ranked_game(text,text,jsonb)'::regprocedure),
  'attempt creation RPC is SECURITY DEFINER'
);

select ok(
  (select prosecdef from pg_catalog.pg_proc
   where oid = 'public.complete_ranked_game(uuid,uuid,jsonb)'::regprocedure),
  'attempt completion RPC is SECURITY DEFINER'
);

select is(
  (select count(*) from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'game_results' and grantee = 'anon'),
  0::bigint,
  'anon has no table read or write privileges'
);

select is(
  (select count(*)
   from information_schema.column_privileges
   where table_schema = 'public' and table_name = 'game_results'
     and grantee = 'authenticated' and privilege_type = 'INSERT'),
  0::bigint,
  'authenticated has no direct INSERT privileges'
);

select is(
  (select count(*) from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'game_results'
     and grantee = 'authenticated' and privilege_type in ('SELECT', 'UPDATE', 'DELETE')),
  0::bigint,
  'authenticated has no SELECT, UPDATE, or DELETE table privileges'
);

select is(
  (select count(*) from information_schema.column_privileges
   where table_schema = 'public' and table_name = 'game_results'
     and grantee = 'authenticated' and privilege_type in ('SELECT', 'UPDATE', 'DELETE')),
  0::bigint,
  'authenticated has no SELECT, UPDATE, or DELETE column privileges'
);

-- RPC security ----------------------------------------------------------------

select ok(
  (select prosecdef from pg_catalog.pg_proc
   where oid = 'public.get_game_leaderboard(text,text,integer)'::regprocedure),
  'leaderboard RPC is SECURITY DEFINER'
);

select is(
  (select provolatile::text from pg_catalog.pg_proc
   where oid = 'public.get_game_leaderboard(text,text,integer)'::regprocedure),
  's'::text,
  'leaderboard RPC is STABLE'
);

select is(
  (select proconfig from pg_catalog.pg_proc
   where oid = 'public.get_game_leaderboard(text,text,integer)'::regprocedure),
  array['search_path=pg_catalog, public'],
  'leaderboard RPC search_path is pg_catalog, public'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_proc p
    cross join lateral pg_catalog.aclexplode(
      coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))
    ) as privilege
    where p.oid = 'public.get_game_leaderboard(text,text,integer)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  'PUBLIC cannot execute the leaderboard RPC'
);

select ok(
  has_function_privilege('anon', 'public.get_game_leaderboard(text,text,integer)', 'EXECUTE'),
  'anon can execute the leaderboard RPC'
);

select ok(
  has_function_privilege('authenticated', 'public.get_game_leaderboard(text,text,integer)', 'EXECUTE'),
  'authenticated can execute the leaderboard RPC'
);

select ok(
  not exists (
    select 1
    from unnest((select proargnames from pg_catalog.pg_proc
                 where oid = 'public.get_game_leaderboard(text,text,integer)'::regprocedure)) as field_name
    where field_name ~* '(email|user_id|jwt|raw_|private|password|token)'
  ),
  'leaderboard does not expose email, user_id, JWT, or private profile fields'
);

-- Transaction-only test users and leaderboard fixtures -----------------------

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous
)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'phase3-permanent-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'phase3-permanent-b@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false);

update public.profiles
set nickname = case user_id
  when '10000000-0000-4000-8000-000000000001' then 'TapAlpha'
  when '10000000-0000-4000-8000-000000000002' then 'TapBeta'
end
where user_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);

insert into public.game_results
  (user_id, game_key, mode, score_value, duration_ms, match_result, client_submission_id, created_at, verified_at)
values
  ('10000000-0000-4000-8000-000000000001', '2048', null, 9000000000000000, null, null, '20000000-0000-4000-8000-000000000001', '2026-01-01T00:00:01Z', '2026-01-01T00:00:01Z'),
  ('10000000-0000-4000-8000-000000000001', '2048', null, 8999999999999998, null, null, '20000000-0000-4000-8000-000000000002', '2026-01-01T00:00:02Z', '2026-01-01T00:00:02Z'),
  ('10000000-0000-4000-8000-000000000002', '2048', null, 8999999999999999, null, null, '20000000-0000-4000-8000-000000000003', '2026-01-01T00:00:03Z', '2026-01-01T00:00:03Z'),
  ('10000000-0000-4000-8000-000000000001', 'memory', null, 99999, null, null, '20000000-0000-4000-8000-000000000004', '2026-01-01T00:00:04Z', '2026-01-01T00:00:04Z'),
  ('10000000-0000-4000-8000-000000000002', 'memory', null, 100000, null, null, '20000000-0000-4000-8000-000000000005', '2026-01-01T00:00:05Z', '2026-01-01T00:00:05Z'),
  ('10000000-0000-4000-8000-000000000001', 'sudoku', 'easy', null, 1001, null, '20000000-0000-4000-8000-000000000006', '2026-01-01T00:00:06Z', '2026-01-01T00:00:06Z'),
  ('10000000-0000-4000-8000-000000000002', 'sudoku', 'easy', null, 1000, null, '20000000-0000-4000-8000-000000000007', '2026-01-01T00:00:07Z', '2026-01-01T00:00:07Z');

-- Behavioral RLS and constraints ---------------------------------------------

select set_config('request.jwt.claims', '{}', true);
set local role anon;

select throws_ok(
  'select * from public.game_results',
  '42501', 'permission denied for table game_results',
  'anon SELECT is denied'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, score_value, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', '2048', 1, '30000000-0000-4000-8000-000000000001')$$,
  '42501', 'permission denied for table game_results',
  'anon INSERT is denied'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, score_value, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', '2048', 111, '30000000-0000-4000-8000-000000000003')$$,
  '42501', 'permission denied for table game_results',
  'permanent users cannot directly insert ranked results'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, score_value, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000002', '2048', 1, '30000000-0000-4000-8000-000000000004')$$,
  '42501', 'permission denied for table game_results',
  'direct inserts cannot forge ownership'
);

select throws_ok(
  'select * from public.game_results',
  '42501', 'permission denied for table game_results',
  'authenticated direct SELECT is denied'
);

select throws_ok(
  $$update public.game_results set score_value = 999
    where user_id = '10000000-0000-4000-8000-000000000001'$$,
  '42501', 'permission denied for table game_results',
  'authenticated UPDATE is denied'
);

select throws_ok(
  $$delete from public.game_results
    where user_id = '10000000-0000-4000-8000-000000000001'$$,
  '42501', 'permission denied for table game_results',
  'authenticated DELETE is denied'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, score_value, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', 'pong', 1, '30000000-0000-4000-8000-000000000005')$$,
  '42501', 'permission denied for table game_results',
  'unsupported client results cannot bypass the RPC'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, mode, duration_ms, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', 'sudoku', 'expert', 1000, '30000000-0000-4000-8000-000000000006')$$,
  '42501', 'permission denied for table game_results',
  'unsupported Sudoku modes cannot bypass the RPC'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, score_value, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', '2048', -1, '30000000-0000-4000-8000-000000000007')$$,
  '42501', 'permission denied for table game_results',
  'client-supplied negative scores are not accepted'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, mode, duration_ms, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', 'sudoku', 'easy', 999, '30000000-0000-4000-8000-000000000008')$$,
  '42501', 'permission denied for table game_results',
  'client-supplied durations are not accepted'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, score_value, match_result, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', 'memory', 10, 'win', '30000000-0000-4000-8000-000000000009')$$,
  '42501', 'permission denied for table game_results',
  'client-supplied result shapes are not accepted'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, mode, match_result, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', 'omok', 'standard', 'win', '30000000-0000-4000-8000-000000000010')$$,
  '42501', 'permission denied for table game_results',
  'client Omok inserts remain denied'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, score_value, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', '2048', 112, '30000000-0000-4000-8000-000000000003')$$,
  '42501', 'permission denied for table game_results',
  'duplicate direct inserts are denied before constraints'
);

-- Ranked 2048 terminal lifecycle --------------------------------------------

select ok(
  set_config(
    'phase3.game_2048_begin_response',
    public.begin_ranked_game('2048', null, '{}'::jsonb)::text,
    true
  ) is not null,
  'the server issues a seeded ranked 2048 attempt'
);

reset role;

select is(
  (
    select array_agg(key order by key)
    from jsonb_object_keys(
      current_setting('phase3.game_2048_begin_response')::jsonb
    ) as key
  ),
  array['attemptId', 'seed', 'startedAt'],
  'the ranked 2048 attempt exposes only its public replay contract'
);

select set_config(
  'phase3.game_2048_attempt_id',
  current_setting('phase3.game_2048_begin_response')::jsonb ->> 'attemptId',
  true
);

-- A fixed seed and reviewed terminal path keep the verifier regression
-- deterministic without exposing any production-only shortcut.
update private.ranked_game_attempts
set seed = 1
where id = current_setting('phase3.game_2048_attempt_id')::uuid;

select set_config(
  'phase3.game_2048_terminal_path',
  'LLRULULRLUUULDULLDLLRLDLDRDUDRRDULLDRLLDLURUDUULUDULRDURDLRDDDULLDDRUDURDLDULDULRULLRUUULLULLRDLDDRD'
  || 'DLLDDRDDURDRULDDULLDRURLUDUURDDURLRRLRDLRULURULULULUUUURLUUDULLLLLRUUULDULLLLLRDUULDDULDURDLDRURDLDR'
  || 'DLLRULDRLUDUULRLRLDURUURLRDRURRULRLRULUUDLLRDULDULLLLUURUUURUURLLDRURLRDURLULDDULULRLLDLDDRRDLRRDLDD'
  || 'RDLLUDLDLDRDDDRDRULUDLRDLLRLDLRRURULRDDULDDLDRDRUURLLDLLLDRRDRUDRUDUULUULLLRLRULURUDLRDDDDLUUDLULURU'
  || 'LRDURLUURRLLULUDLLUURULRDULLULRUULURLDULULLDUULDLURDRRUDLLURLDURRUDLRLUUDURDLUDRULDDLLDRDRULLLLUDULL'
  || 'UDLLDLDRULDLDRRULLURDRLULULRURRLDULDLRLUURLDULLLLUURDURUULLUURDLDDLRLUDDLDLLRUDLDDLLDRLURRDUUUDURURU'
  || 'RRRURUUDDUDRDRLRLRURLRUDRLLRLDLULRULLDULLDDLULLRLURULULLRRLLUURULLULRLULDLURLRLLLURURURDDUDULLLRLDDU'
  || 'LULLDDLRDLULULDLDULDDDDURRULRRDLRUDUUDDDDLRRLDLULRDUUDRLRURUDRDULUULUDLURUDLULUUUDRURLDLLRDDURDLLURU'
  || 'ULUDLULULURURLDRLLDLDULUURUURURLULRRUULURULULRULRURULDULLLUULLRDURDLLRURRDDDRRUDURDRRDUDRRDUURDUDRDD'
  || 'RURLLDLLLLLLDULDDULLURLRULLURURULDLDRLRULLRLDUUDDR',
  true
);

select set_config(
  'phase3.game_2048_terminal_proof',
  (
    select jsonb_build_object(
      'moves',
      jsonb_agg(
        case substring(current_setting('phase3.game_2048_terminal_path') from position for 1)
          when 'L' then 'left'
          when 'R' then 'right'
          when 'U' then 'up'
          else 'down'
        end
        order by position
      )
    )::text
    from generate_series(
      1,
      length(current_setting('phase3.game_2048_terminal_path'))
    ) as path(position)
  ),
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.complete_ranked_game(
      current_setting('phase3.game_2048_attempt_id')::uuid,
      '30000000-0000-4000-8000-000000000012',
      current_setting('phase3.game_2048_terminal_proof')::jsonb
        || '{"score":999999}'::jsonb
    )$$,
  'P0001', '2048 proof contains unsupported fields',
  'ranked 2048 rejects client-supplied fields outside the move contract'
);

select throws_ok(
  $$select public.complete_ranked_game(
      current_setting('phase3.game_2048_attempt_id')::uuid,
      '30000000-0000-4000-8000-000000000012',
      '{"moves":[]}'::jsonb
    )$$,
  'P0001', '2048 attempt has not reached a rankable terminal state',
  'ranked 2048 rejects a proof that stops before a terminal state'
);

select throws_ok(
  $$select public.complete_ranked_game(
      current_setting('phase3.game_2048_attempt_id')::uuid,
      '30000000-0000-4000-8000-000000000012',
      jsonb_set(
        current_setting('phase3.game_2048_terminal_proof')::jsonb,
        '{moves}',
        current_setting('phase3.game_2048_terminal_proof')::jsonb -> 'moves'
          || '["left","left"]'::jsonb
      )
    )$$,
  'P0001', '2048 proof continues after the first terminal state',
  'ranked 2048 rejects valid score-producing moves appended after 2048'
);

select lives_ok(
  $$select public.complete_ranked_game(
      current_setting('phase3.game_2048_attempt_id')::uuid,
      '30000000-0000-4000-8000-000000000012',
      current_setting('phase3.game_2048_terminal_proof')::jsonb
    )$$,
  'ranked 2048 accepts the same replay when it ends exactly at 2048'
);

reset role;

select is(
  (
    select score_value
    from public.game_results
    where attempt_id = current_setting('phase3.game_2048_attempt_id')::uuid
  ),
  20256::bigint,
  'ranked 2048 stores the score at the first terminal state'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select is(
  public.complete_ranked_game(
    current_setting('phase3.game_2048_attempt_id')::uuid,
    '30000000-0000-4000-8000-000000000012',
    current_setting('phase3.game_2048_terminal_proof')::jsonb
  ) ->> 'duplicate',
  'true',
  'repeating the accepted terminal replay remains idempotent'
);

-- Ranked Sudoku evidence lifecycle -------------------------------------------

select lives_ok(
  $$select set_config(
      'phase3.sudoku_begin_response',
      public.begin_ranked_game('sudoku', 'easy', '{}'::jsonb)::text,
      true
    )$$,
  'the server issues a ranked Sudoku attempt and chooses its board'
);

reset role;

select is(
  (
    select array_agg(key order by key)
    from jsonb_object_keys(
      current_setting('phase3.sudoku_begin_response')::jsonb
    ) as key
  ),
  array['attemptId', 'proofVersion', 'puzzle', 'puzzleId', 'startedAt'],
  'the Sudoku attempt exposes the playable board but never its solution'
);

select ok(
  current_setting('phase3.sudoku_begin_response')::jsonb ->> 'puzzle' ~ '^[0-9]{81}$'
    and current_setting('phase3.sudoku_begin_response')::jsonb ->> 'proofVersion' = '2',
  'the issued Sudoku board and proof version have the approved shape'
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

select set_config(
  'phase3.sudoku_given_event',
  (
    select jsonb_build_object(
      'index', given_cell.cell_index - 1,
      'value', substring(ranked_puzzle.solution from given_cell.cell_index for 1)::integer,
      'elapsedMs', 0
    )::text
    from private.ranked_game_attempts as attempt
    join private.ranked_sudoku_puzzles as ranked_puzzle
      on ranked_puzzle.puzzle_id = attempt.context ->> 'puzzleId'
    cross join lateral (
      select cell_index
      from generate_series(1, 81) as cells(cell_index)
      where substring(ranked_puzzle.puzzle from cell_index for 1) <> '0'
      order by cell_index
      limit 1
    ) as given_cell
    where attempt.id = current_setting('phase3.sudoku_attempt_id')::uuid
  ),
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.begin_ranked_game(
      'sudoku',
      'easy',
      '{"puzzleId":"ocean-01"}'::jsonb
    )$$,
  'P0001', 'Sudoku attempt context is server-owned',
  'callers cannot choose the ranked Sudoku board'
);

select throws_ok(
  $$select public.complete_ranked_game(
      current_setting('phase3.sudoku_attempt_id')::uuid,
      '30000000-0000-4000-8000-000000000011',
      jsonb_build_object(
        'puzzleId', current_setting('phase3.sudoku_proof')::jsonb ->> 'puzzleId',
        'board', '[]'::jsonb
      )
    )$$,
  'P0001', 'Sudoku proof contains unsupported fields',
  'the former board-only instant submission contract is rejected'
);

select throws_ok(
  $$select public.complete_ranked_game(
      current_setting('phase3.sudoku_attempt_id')::uuid,
      '30000000-0000-4000-8000-000000000011',
      current_setting('phase3.sudoku_proof')::jsonb
    )$$,
  'P0001', 'Sudoku attempt completed faster than the ranking permits',
  'a forged complete event stream cannot create an instant Sudoku record'
);

reset role;

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
  $$select public.complete_ranked_game(
      current_setting('phase3.sudoku_attempt_id')::uuid,
      '30000000-0000-4000-8000-000000000011',
      jsonb_set(
        current_setting('phase3.sudoku_proof')::jsonb,
        '{events}',
        jsonb_build_array(
          current_setting('phase3.sudoku_given_event')::jsonb
        ) || (current_setting('phase3.sudoku_proof')::jsonb -> 'events')
      )
    )$$,
  'P0001', 'Sudoku proof edits a given cell',
  'Sudoku evidence cannot edit a server-issued clue'
);

select throws_ok(
  $$select public.complete_ranked_game(
      current_setting('phase3.sudoku_attempt_id')::uuid,
      '30000000-0000-4000-8000-000000000011',
      jsonb_set(
        current_setting('phase3.sudoku_proof')::jsonb,
        '{events,1,elapsedMs}',
        '0'::jsonb
      )
    )$$,
  'P0001', 'Sudoku proof event times are not monotonic',
  'Sudoku evidence requires monotonic action timing'
);

select lives_ok(
  $$select public.complete_ranked_game(
      current_setting('phase3.sudoku_attempt_id')::uuid,
      '30000000-0000-4000-8000-000000000011',
      current_setting('phase3.sudoku_proof')::jsonb
    )$$,
  'a valid server-issued Sudoku event replay is accepted'
);

reset role;

select ok(
  (select duration_ms >= 29000
   from public.game_results
   where attempt_id = current_setting('phase3.sudoku_attempt_id')::uuid),
  'Sudoku duration comes from the server attempt clock rather than client events'
);

select ok(
  exists (
    select 1
    from public.game_results
    where attempt_id = current_setting('phase3.sudoku_attempt_id')::uuid
      and game_key = 'sudoku'
      and mode = 'easy'
      and verified_at is not null
  ),
  'the verified Sudoku result is linked to its one-time attempt'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select is(
  public.complete_ranked_game(
    current_setting('phase3.sudoku_attempt_id')::uuid,
    '30000000-0000-4000-8000-000000000011',
    current_setting('phase3.sudoku_proof')::jsonb
  ) ->> 'duplicate',
  'true',
  'repeating an accepted Sudoku submission remains idempotent'
);

-- Leaderboard behavior --------------------------------------------------------

reset role;
select set_config('request.jwt.claims', '{}', true);
set local role anon;

select lives_ok(
  $$select * from public.get_game_leaderboard('2048', null, 50)$$,
  'anon can read the public leaderboard'
);

select is(
  (select count(*) from public.get_game_leaderboard('2048', null, 1)),
  1::bigint,
  'leaderboard limit is enforced'
);

select results_eq(
  $$select score_value from public.get_game_leaderboard('2048', null, 100)
    where nickname in ('TapAlpha', 'TapBeta') order by rank$$,
  $$values (9000000000000000::bigint), (8999999999999999::bigint)$$,
  '2048 leaderboard sorts by descending score and keeps each user best'
);

select results_eq(
  $$select score_value from public.get_game_leaderboard('memory', null, 100)
    where nickname in ('TapAlpha', 'TapBeta') order by rank$$,
  $$values (100000::bigint), (99999::bigint)$$,
  'Memory leaderboard sorts by descending score'
);

select results_eq(
  $$select duration_ms from public.get_game_leaderboard('sudoku', 'easy', 100)
    where nickname in ('TapAlpha', 'TapBeta') order by rank$$,
  $$values (1000::bigint), (1001::bigint)$$,
  'Sudoku leaderboard sorts by ascending duration'
);

select throws_ok(
  $$select * from public.get_game_leaderboard('pong', null, 50)$$,
  'P0001', 'Unsupported game key',
  'leaderboard rejects unsupported games'
);

select throws_ok(
  $$select * from public.get_game_leaderboard('sudoku', 'expert', 50)$$,
  'P0001', 'Sudoku difficulty is required',
  'leaderboard rejects unsupported Sudoku modes'
);

select throws_ok(
  $$select * from public.get_game_leaderboard('2048', null, 0)$$,
  'P0001', 'Leaderboard limit must be between 1 and 100',
  'leaderboard rejects invalid limits'
);

select is(
  (select count(*) from public.get_game_leaderboard('2048', 'ignored-mode', 50)),
  0::bigint,
  'a non-Sudoku mode returns the documented empty result'
);

select is(
  (
    select array_agg(key order by key)
    from jsonb_object_keys(
      (select to_jsonb(result_row)
       from public.get_game_leaderboard('2048', null, 1) as result_row)
    ) as key
  ),
  array['created_at', 'duration_ms', 'game_key', 'is_current_user', 'match_result', 'mode', 'nickname', 'rank', 'score_value'],
  'leaderboard rows contain only approved public fields'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select results_eq(
  $$select nickname, is_current_user
    from public.get_game_leaderboard('2048', null, 100)
    where nickname in ('TapAlpha', 'TapBeta')
    order by rank$$,
  $$values ('TapAlpha'::text, true), ('TapBeta'::text, false)$$,
  'is_current_user reflects the simulated authenticated user'
);

reset role;
select * from finish();
rollback;
