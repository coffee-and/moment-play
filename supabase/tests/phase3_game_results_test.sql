begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(69);

-- Schema ---------------------------------------------------------------------

select has_table('public', 'game_results', 'game_results table exists');

select columns_are(
  'public',
  'game_results',
  array[
    'id', 'user_id', 'game_key', 'mode', 'score_value', 'duration_ms',
    'match_result', 'client_submission_id', 'created_at'
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
  (select indexdef like '%(game_key, mode, score_value DESC, created_at)%WHERE (game_key = ANY%'
   from pg_catalog.pg_indexes
   where schemaname = 'public' and indexname = 'game_results_score_leaderboard_idx'),
  'score index has the required descending-score ordering and predicate'
);

select ok(
  (select indexdef like '%(game_key, mode, duration_ms, created_at)%WHERE (game_key = ''sudoku''%'
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
  exists (
    select 1 from pg_catalog.pg_policy
    where polrelid = 'public.game_results'::regclass
      and polname = 'game_results_insert_permanent_own'
  ),
  'game_results_insert_permanent_own policy exists'
);

select is(
  (select polcmd::text from pg_catalog.pg_policy
   where polrelid = 'public.game_results'::regclass
     and polname = 'game_results_insert_permanent_own'),
  'a'::text,
  'ranking policy applies only to INSERT'
);

select is(
  (select polroles from pg_catalog.pg_policy
   where polrelid = 'public.game_results'::regclass
     and polname = 'game_results_insert_permanent_own'),
  array['authenticated'::regrole::oid],
  'ranking policy applies only to authenticated'
);

select matches(
  (select pg_get_expr(polwithcheck, polrelid) from pg_catalog.pg_policy
   where polrelid = 'public.game_results'::regclass
     and polname = 'game_results_insert_permanent_own'),
  'user_id = auth[.]uid[(][)]',
  'ranking policy requires user_id = auth.uid()'
);

select matches(
  (select pg_get_expr(polwithcheck, polrelid) from pg_catalog.pg_policy
   where polrelid = 'public.game_results'::regclass
     and polname = 'game_results_insert_permanent_own'),
  'is_anonymous.*false',
  'ranking policy rejects anonymous JWT users'
);

select matches(
  (select pg_get_expr(polwithcheck, polrelid) from pg_catalog.pg_policy
   where polrelid = 'public.game_results'::regclass
     and polname = 'game_results_insert_permanent_own'),
  'game_key.*<>.*omok',
  'ranking policy rejects client Omok results'
);

select is(
  (select count(*) from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'game_results' and grantee = 'anon'),
  0::bigint,
  'anon has no table read or write privileges'
);

select is(
  (select array_agg(column_name::text order by column_name)
   from information_schema.column_privileges
   where table_schema = 'public' and table_name = 'game_results'
     and grantee = 'authenticated' and privilege_type = 'INSERT'),
  array['client_submission_id', 'duration_ms', 'game_key', 'match_result', 'mode', 'score_value', 'user_id'],
  'authenticated has only the intended column-level INSERT privileges'
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
   'phase3-permanent-b@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   null, '', now(), '{"provider":"anonymous","providers":["anonymous"]}', '{}', now(), now(), true);

update public.profiles
set nickname = case user_id
  when '10000000-0000-4000-8000-000000000001' then 'TapAlpha'
  when '10000000-0000-4000-8000-000000000002' then 'TapBeta'
  else 'TapAnon'
end
where user_id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003'
);

insert into public.game_results
  (user_id, game_key, mode, score_value, duration_ms, match_result, client_submission_id, created_at)
values
  ('10000000-0000-4000-8000-000000000001', '2048', null, 9000000000000000, null, null, '20000000-0000-4000-8000-000000000001', '2026-01-01T00:00:01Z'),
  ('10000000-0000-4000-8000-000000000001', '2048', null, 8999999999999998, null, null, '20000000-0000-4000-8000-000000000002', '2026-01-01T00:00:02Z'),
  ('10000000-0000-4000-8000-000000000002', '2048', null, 8999999999999999, null, null, '20000000-0000-4000-8000-000000000003', '2026-01-01T00:00:03Z'),
  ('10000000-0000-4000-8000-000000000001', 'memory', null, 99999, null, null, '20000000-0000-4000-8000-000000000004', '2026-01-01T00:00:04Z'),
  ('10000000-0000-4000-8000-000000000002', 'memory', null, 100000, null, null, '20000000-0000-4000-8000-000000000005', '2026-01-01T00:00:05Z'),
  ('10000000-0000-4000-8000-000000000001', 'sudoku', 'easy', null, 1001, null, '20000000-0000-4000-8000-000000000006', '2026-01-01T00:00:06Z'),
  ('10000000-0000-4000-8000-000000000002', 'sudoku', 'easy', null, 1000, null, '20000000-0000-4000-8000-000000000007', '2026-01-01T00:00:07Z');

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
  '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":true}',
  true
);
set local role authenticated;

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, score_value, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000003', '2048', 1, '30000000-0000-4000-8000-000000000002')$$,
  '42501', 'new row violates row-level security policy for table "game_results"',
  'anonymous authenticated users cannot insert ranked results'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select lives_ok(
  $$insert into public.game_results
      (user_id, game_key, score_value, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', '2048', 111, '30000000-0000-4000-8000-000000000003')$$,
  'permanent users can insert their own ranked results'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, score_value, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000002', '2048', 1, '30000000-0000-4000-8000-000000000004')$$,
  '42501', 'new row violates row-level security policy for table "game_results"',
  'forged ownership is rejected'
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
  '23514', null,
  'unsupported game key is rejected by a check constraint'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, mode, duration_ms, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', 'sudoku', 'expert', 1000, '30000000-0000-4000-8000-000000000006')$$,
  '23514', null,
  'unsupported Sudoku mode is rejected by a check constraint'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, score_value, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', '2048', -1, '30000000-0000-4000-8000-000000000007')$$,
  '23514', null,
  'negative score is rejected'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, mode, duration_ms, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', 'sudoku', 'easy', 999, '30000000-0000-4000-8000-000000000008')$$,
  '23514', null,
  'invalid duration is rejected'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, score_value, match_result, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', 'memory', 10, 'win', '30000000-0000-4000-8000-000000000009')$$,
  '23514', null,
  'invalid match-result combination is rejected'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, mode, match_result, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', 'omok', 'standard', 'win', '30000000-0000-4000-8000-000000000010')$$,
  '42501', 'new row violates row-level security policy for table "game_results"',
  'client Omok insert is rejected by RLS'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, score_value, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000001', '2048', 112, '30000000-0000-4000-8000-000000000003')$$,
  '23505', null,
  'duplicate user and client submission id is rejected'
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
  '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":true}',
  true
);
set local role authenticated;

select lives_ok(
  $$select * from public.get_game_leaderboard('2048', null, 50)$$,
  'anonymous authenticated users can read the leaderboard'
);

select throws_ok(
  $$insert into public.game_results
      (user_id, game_key, score_value, client_submission_id)
    values
      ('10000000-0000-4000-8000-000000000003', 'memory', 1, '30000000-0000-4000-8000-000000000011')$$,
  '42501', 'new row violates row-level security policy for table "game_results"',
  'anonymous authenticated users still cannot insert'
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
