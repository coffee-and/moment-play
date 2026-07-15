begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select no_plan();

-- Schema ---------------------------------------------------------------------

select has_column('public', 'profiles', 'friend_code', 'profiles has a friend_code column');
select col_type_is('public', 'profiles', 'friend_code', 'text', 'friend_code is text');
select col_not_null('public', 'profiles', 'friend_code', 'friend_code is required');

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_friend_code_key'
      and contype = 'u'
  ),
  'friend_code has a unique constraint'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_friend_code_format'
      and contype = 'c'
  ),
  'friend_code has a format constraint'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.profiles'::regclass
      and tgname = 'moment_play_assign_friend_code'
      and not tgisinternal
  ),
  'new profiles receive friend codes through a trigger'
);

select has_table('public', 'friendships', 'friendships table exists');
select columns_are(
  'public',
  'friendships',
  array['id', 'requester_id', 'addressee_id', 'status', 'created_at', 'responded_at'],
  'friendships has exactly the required columns'
);
select has_pk('public', 'friendships', 'friendships has a primary key');

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.friendships'::regclass
      and conname = 'friendships_distinct_users'
      and contype = 'c'
  ),
  'friendships rejects self relationships'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.friendships'::regclass
      and conname = 'friendships_response_shape'
      and contype = 'c'
  ),
  'friendship status and response timestamp stay consistent'
);

select has_index(
  'public', 'friendships', 'friendships_unique_pair_idx',
  'a user pair can have only one relationship regardless of direction'
);
select has_index(
  'public', 'friendships', 'friendships_requester_status_idx',
  'requester relationship lookups are indexed'
);
select has_index(
  'public', 'friendships', 'friendships_addressee_status_idx',
  'addressee relationship lookups are indexed'
);

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.friendships'::regclass),
  'RLS is enabled on friendships'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_policy
    where polrelid = 'public.friendships'::regclass
      and polname = 'friendships_select_participant_permanent'
      and polcmd = 'r'
  ),
  'participant-only permanent-account SELECT policy exists'
);

select is(
  (select count(*) from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'friendships'
     and grantee in ('anon', 'authenticated')),
  0::bigint,
  'anon and authenticated have no direct table grants'
);

-- RPC contract and privileges -------------------------------------------------

select ok(to_regprocedure('public.get_my_friend_profile()') is not null, 'get_my_friend_profile exists');
select ok(to_regprocedure('public.find_friend_by_code(text)') is not null, 'find_friend_by_code exists');
select ok(to_regprocedure('public.send_friend_request(text)') is not null, 'send_friend_request exists');
select ok(to_regprocedure('public.respond_friend_request(uuid,text)') is not null, 'respond_friend_request exists');
select ok(to_regprocedure('public.cancel_friend_request(uuid)') is not null, 'cancel_friend_request exists');
select ok(to_regprocedure('public.remove_friend(uuid)') is not null, 'remove_friend exists');
select ok(to_regprocedure('public.get_friend_overview()') is not null, 'get_friend_overview exists');

select is(
  (
    select count(*)
    from pg_catalog.pg_proc
    where oid in (
      'public.get_my_friend_profile()'::regprocedure,
      'public.find_friend_by_code(text)'::regprocedure,
      'public.send_friend_request(text)'::regprocedure,
      'public.respond_friend_request(uuid,text)'::regprocedure,
      'public.cancel_friend_request(uuid)'::regprocedure,
      'public.remove_friend(uuid)'::regprocedure,
      'public.get_friend_overview()'::regprocedure
    )
      and prosecdef
  ),
  7::bigint,
  'all public friendship RPCs are SECURITY DEFINER'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_proc
    where oid in (
      'public.get_my_friend_profile()'::regprocedure,
      'public.find_friend_by_code(text)'::regprocedure,
      'public.send_friend_request(text)'::regprocedure,
      'public.respond_friend_request(uuid,text)'::regprocedure,
      'public.cancel_friend_request(uuid)'::regprocedure,
      'public.remove_friend(uuid)'::regprocedure,
      'public.get_friend_overview()'::regprocedure
    )
      and proconfig = array['search_path=pg_catalog, public']
  ),
  7::bigint,
  'all public friendship RPCs use a fixed search path'
);

select ok(
  (select prosecdef from pg_catalog.pg_proc
   where oid = 'public.moment_play_require_permanent_user()'::regprocedure),
  'permanent-user guard is SECURITY DEFINER'
);

select ok(
  not has_function_privilege('anon', 'public.get_my_friend_profile()', 'EXECUTE'),
  'anon cannot execute friendship RPCs'
);
select ok(
  has_function_privilege('authenticated', 'public.get_my_friend_profile()', 'EXECUTE'),
  'authenticated can execute get_my_friend_profile'
);
select ok(
  has_function_privilege('authenticated', 'public.find_friend_by_code(text)', 'EXECUTE'),
  'authenticated can execute find_friend_by_code'
);
select ok(
  has_function_privilege('authenticated', 'public.send_friend_request(text)', 'EXECUTE'),
  'authenticated can execute send_friend_request'
);
select ok(
  has_function_privilege('authenticated', 'public.respond_friend_request(uuid,text)', 'EXECUTE'),
  'authenticated can execute respond_friend_request'
);
select ok(
  has_function_privilege('authenticated', 'public.cancel_friend_request(uuid)', 'EXECUTE'),
  'authenticated can execute cancel_friend_request'
);
select ok(
  has_function_privilege('authenticated', 'public.remove_friend(uuid)', 'EXECUTE'),
  'authenticated can execute remove_friend'
);
select ok(
  has_function_privilege('authenticated', 'public.get_friend_overview()', 'EXECUTE'),
  'authenticated can execute get_friend_overview'
);
select ok(
  not has_function_privilege('authenticated', 'public.moment_play_require_permanent_user()', 'EXECUTE'),
  'the internal permanent-user guard is not directly executable'
);

select is(
  (
    select array_agg(name order by ordinal)
    from pg_catalog.pg_proc as procedure
    cross join lateral unnest(procedure.proargnames, procedure.proargmodes)
      with ordinality as argument(name, mode, ordinal)
    where procedure.oid = 'public.get_friend_overview()'::regprocedure
      and argument.mode in ('o', 't')
  ),
  array['friendship_id', 'friend_code', 'nickname', 'status', 'direction', 'created_at', 'responded_at'],
  'friend overview exposes only the approved public fields'
);

-- Transaction-only users ------------------------------------------------------

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous
)
values
  ('41000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'phase4-permanent-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false),
  ('41000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'phase4-permanent-b@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false),
  ('41000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'phase4-permanent-c@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false),
  ('41000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   null, '', now(), '{"provider":"anonymous","providers":["anonymous"]}', '{}', now(), now(), true);

select is(
  (select count(*) from public.profiles
   where user_id::text like '41000000-0000-4000-8000-%'
     and friend_code ~ '^[A-F0-9]{10}$'),
  4::bigint,
  'the profile trigger creates valid friend codes for permanent and anonymous users'
);

select is(
  (select count(distinct friend_code) from public.profiles
   where user_id::text like '41000000-0000-4000-8000-%'),
  4::bigint,
  'generated friend codes are unique'
);

-- Stable fixture codes are assigned before switching to restricted roles.
-- RPC arguments are evaluated with the caller's permissions, so tests must not
-- query another user's profile as authenticated merely to obtain its code.
update public.profiles
set
  nickname = case user_id
    when '41000000-0000-4000-8000-000000000001' then 'FriendAlpha'
    when '41000000-0000-4000-8000-000000000002' then 'FriendBeta'
    when '41000000-0000-4000-8000-000000000003' then 'FriendGamma'
    else 'FriendAnon'
  end,
  friend_code = case user_id
    when '41000000-0000-4000-8000-000000000001' then 'AAAAAAAA01'
    when '41000000-0000-4000-8000-000000000002' then 'BBBBBBBB02'
    when '41000000-0000-4000-8000-000000000003' then 'CCCCCCCC03'
    else 'DDDDDDDD04'
  end
where user_id in (
  '41000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000002',
  '41000000-0000-4000-8000-000000000003',
  '41000000-0000-4000-8000-000000000004'
);

-- Anonymous and direct-access denial ------------------------------------------

select set_config('request.jwt.claims', '{}', true);
set local role anon;

select throws_ok(
  'select * from public.get_my_friend_profile()',
  '42501', 'permission denied for function get_my_friend_profile',
  'anon cannot read a friend profile'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"41000000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":true}',
  true
);
set local role authenticated;

select throws_ok(
  'select * from public.get_my_friend_profile()',
  '42501', 'Permanent account required',
  'anonymous authenticated users cannot use friend features'
);

select throws_ok(
  $$select public.send_friend_request('BBBBBBBB02')$$,
  '42501', 'Permanent account required',
  'anonymous authenticated users cannot send friend requests'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  'select * from public.friendships',
  '42501', 'permission denied for table friendships',
  'authenticated users cannot read the friendship table directly'
);

select throws_ok(
  $$insert into public.friendships (requester_id, addressee_id)
    values ('41000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000002')$$,
  '42501', 'permission denied for table friendships',
  'authenticated users cannot forge friendship rows directly'
);

-- Search and request lifecycle ------------------------------------------------

select results_eq(
  $$select friend_code, nickname from public.get_my_friend_profile()$$,
  $$values ('AAAAAAAA01'::text, 'FriendAlpha'::text)$$,
  'permanent users can read only their public friend profile'
);

select results_eq(
  $$select friend_code, nickname, relationship_status
    from public.find_friend_by_code('bbbbbbbb02')$$,
  $$values ('BBBBBBBB02'::text, 'FriendBeta'::text, 'none'::text)$$,
  'search normalizes a code and returns no private identifiers'
);

select throws_ok(
  $$select * from public.find_friend_by_code('AAAAAAAA01')$$,
  'P0001', 'You cannot add yourself',
  'users cannot search themselves as a friend target'
);

select throws_ok(
  $$select * from public.find_friend_by_code('not-a-code')$$,
  'P0001', 'Invalid friend code',
  'invalid friend-code formats are rejected'
);

select throws_ok(
  $$select * from public.find_friend_by_code('DDDDDDDD04')$$,
  'P0001', 'Friend code not found',
  'anonymous accounts cannot be found as friend targets'
);

select lives_ok(
  $$select public.send_friend_request('BBBBBBBB02')$$,
  'a permanent user can send a friend request by code'
);

reset role;
select set_config(
  'phase4.ab_request_id',
  (select id::text from public.friendships
   where requester_id = '41000000-0000-4000-8000-000000000001'
     and addressee_id = '41000000-0000-4000-8000-000000000002'),
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select results_eq(
  $$select nickname, status, direction from public.get_friend_overview()$$,
  $$values ('FriendBeta'::text, 'pending'::text, 'outgoing'::text)$$,
  'the requester sees an outgoing pending request'
);

select results_eq(
  $$select relationship_status from public.find_friend_by_code('BBBBBBBB02')$$,
  $$values ('pending_outgoing'::text)$$,
  'search reports an outgoing pending relationship'
);

select throws_ok(
  $$select public.send_friend_request('BBBBBBBB02')$$,
  'P0001', 'Friend request already exists',
  'duplicate requests are rejected'
);

select throws_ok(
  $$select public.respond_friend_request(
      current_setting('phase4.ab_request_id')::uuid,
      'accept'
    )$$,
  'P0001', 'Pending friend request not found',
  'the requester cannot accept their own outgoing request'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"41000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select results_eq(
  $$select nickname, status, direction from public.get_friend_overview()$$,
  $$values ('FriendAlpha'::text, 'pending'::text, 'incoming'::text)$$,
  'the addressee sees an incoming pending request'
);

select results_eq(
  $$select relationship_status from public.find_friend_by_code('AAAAAAAA01')$$,
  $$values ('pending_incoming'::text)$$,
  'search reports an incoming pending relationship'
);

select throws_ok(
  $$select public.send_friend_request('AAAAAAAA01')$$,
  'P0001', 'Friend request already exists',
  'a reverse-direction request is rejected'
);

select throws_ok(
  $$select public.respond_friend_request(
      current_setting('phase4.ab_request_id')::uuid,
      null
    )$$,
  'P0001', 'Unsupported friend request action',
  'null request actions are rejected explicitly'
);

select lives_ok(
  $$select public.respond_friend_request(
      current_setting('phase4.ab_request_id')::uuid,
      'accept'
    )$$,
  'only the addressee can accept a pending request'
);

select results_eq(
  $$select nickname, status, direction from public.get_friend_overview()$$,
  $$values ('FriendAlpha'::text, 'accepted'::text, 'friend'::text)$$,
  'an accepted request appears as a friend'
);

select results_eq(
  $$select relationship_status from public.find_friend_by_code('AAAAAAAA01')$$,
  $$values ('friend'::text)$$,
  'search reports an accepted friendship'
);

select throws_ok(
  $$select public.send_friend_request('AAAAAAAA01')$$,
  'P0001', 'Already friends',
  'accepted friends cannot create another request'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"41000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.remove_friend(current_setting('phase4.ab_request_id')::uuid)$$,
  'P0001', 'Friendship not found',
  'a third party cannot remove another pair relationship'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.remove_friend(current_setting('phase4.ab_request_id')::uuid)$$,
  'either accepted participant can remove the friendship'
);

select is(
  (select count(*) from public.get_friend_overview()),
  0::bigint,
  'removed friendships disappear from the overview'
);

-- Reject lifecycle ------------------------------------------------------------

select lives_ok(
  $$select public.send_friend_request('BBBBBBBB02')$$,
  'a removed pair can send a new request later'
);

reset role;
select set_config(
  'phase4.ab_reject_id',
  (select id::text from public.friendships
   where requester_id = '41000000-0000-4000-8000-000000000001'
     and addressee_id = '41000000-0000-4000-8000-000000000002'),
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"41000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.respond_friend_request(
      current_setting('phase4.ab_reject_id')::uuid,
      'reject'
    )$$,
  'the addressee can reject a pending request'
);

reset role;
select is(
  (select count(*) from public.friendships
   where id = current_setting('phase4.ab_reject_id')::uuid),
  0::bigint,
  'rejected requests are deleted and retain no relationship row'
);

-- Cancel lifecycle ------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.send_friend_request('CCCCCCCC03')$$,
  'a permanent user can send another request'
);

reset role;
select set_config(
  'phase4.ac_cancel_id',
  (select id::text from public.friendships
   where requester_id = '41000000-0000-4000-8000-000000000001'
     and addressee_id = '41000000-0000-4000-8000-000000000003'),
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.cancel_friend_request(
      current_setting('phase4.ac_cancel_id')::uuid
    )$$,
  'the requester can cancel an outgoing pending request'
);

reset role;
select is(
  (select count(*) from public.friendships
   where id = current_setting('phase4.ac_cancel_id')::uuid),
  0::bigint,
  'cancelled requests are deleted'
);

select * from finish();
rollback;
