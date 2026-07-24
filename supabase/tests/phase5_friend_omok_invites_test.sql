begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select no_plan();

-- Schema ---------------------------------------------------------------------

select has_table('public', 'friend_game_invites', 'friend_game_invites table exists');
select columns_are(
  'public',
  'friend_game_invites',
  array[
    'id', 'friendship_id', 'sender_id', 'receiver_id', 'game_key',
    'room_id', 'status', 'created_at', 'expires_at', 'responded_at'
  ],
  'friend_game_invites has exactly the required columns'
);
select has_pk('public', 'friend_game_invites', 'friend_game_invites has a primary key');

select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.friend_game_invites'::regclass
      and conname = 'friend_game_invites_distinct_users'
      and contype = 'c'
  ),
  'invite sender and receiver must be different'
);

select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.friend_game_invites'::regclass
      and conname = 'friend_game_invites_expiry_after_creation'
      and contype = 'c'
  ),
  'invite expiry must be after creation'
);

select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.friend_game_invites'::regclass
      and conname = 'friend_game_invites_response_shape'
      and contype = 'c'
  ),
  'invite status, response timestamp, and room shape stay consistent'
);

select has_index(
  'public', 'friend_game_invites', 'friend_game_invites_one_pending_pair_idx',
  'a friend pair can have only one pending invite regardless of direction'
);
select has_index(
  'public', 'friend_game_invites', 'friend_game_invites_room_idx',
  'an Omok room can belong to only one invite'
);
select has_index(
  'public', 'friend_game_invites', 'friend_game_invites_receiver_status_idx',
  'incoming invite lookups are indexed'
);
select has_index(
  'public', 'friend_game_invites', 'friend_game_invites_sender_status_idx',
  'outgoing invite lookups are indexed'
);
select has_index(
  'public', 'friend_game_invites', 'friend_game_invites_pending_expiry_idx',
  'pending invite expiry lookups are indexed'
);

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.friend_game_invites'::regclass),
  'RLS is enabled on friend_game_invites'
);

select ok(
  exists (
    select 1 from pg_catalog.pg_policy
    where polrelid = 'public.friend_game_invites'::regclass
      and polname = 'friend_game_invites_select_participant_permanent'
      and polcmd = 'r'
  ),
  'participant-only permanent-account SELECT policy exists'
);

select is(
  (select count(*) from information_schema.role_table_grants
   where table_schema = 'public'
     and table_name = 'friend_game_invites'
     and grantee in ('anon', 'authenticated')),
  0::bigint,
  'anon and authenticated have no direct invite table grants'
);

-- RPC contract and privileges -------------------------------------------------

select ok(
  to_regprocedure('public.create_friend_omok_invite(uuid,text,boolean,boolean,boolean,boolean)') is not null,
  'create_friend_omok_invite exists'
);
select ok(
  to_regprocedure('public.respond_friend_omok_invite(uuid,text)') is not null,
  'respond_friend_omok_invite exists'
);
select ok(
  to_regprocedure('public.cancel_friend_omok_invite(uuid)') is not null,
  'cancel_friend_omok_invite exists'
);
select ok(
  to_regprocedure('public.get_friend_omok_invites()') is not null,
  'get_friend_omok_invites exists'
);
select ok(
  to_regprocedure('public.get_pending_friend_omok_invite_count()') is not null,
  'get_pending_friend_omok_invite_count exists'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_proc
    where oid in (
      'public.moment_play_cleanup_friend_omok_room(uuid)'::regprocedure,
      'public.moment_play_expire_friend_omok_invites()'::regprocedure,
      'public.create_friend_omok_invite(uuid,text,boolean,boolean,boolean,boolean)'::regprocedure,
      'public.respond_friend_omok_invite(uuid,text)'::regprocedure,
      'public.cancel_friend_omok_invite(uuid)'::regprocedure,
      'public.get_friend_omok_invites()'::regprocedure,
      'public.get_pending_friend_omok_invite_count()'::regprocedure
    )
      and prosecdef
  ),
  7::bigint,
  'all invite helpers and RPCs are SECURITY DEFINER'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_proc
    where oid in (
      'public.moment_play_cleanup_friend_omok_room(uuid)'::regprocedure,
      'public.moment_play_expire_friend_omok_invites()'::regprocedure,
      'public.create_friend_omok_invite(uuid,text,boolean,boolean,boolean,boolean)'::regprocedure,
      'public.respond_friend_omok_invite(uuid,text)'::regprocedure,
      'public.cancel_friend_omok_invite(uuid)'::regprocedure,
      'public.get_friend_omok_invites()'::regprocedure,
      'public.get_pending_friend_omok_invite_count()'::regprocedure
    )
      and proconfig = array['search_path=pg_catalog, public']
  ),
  7::bigint,
  'all invite helpers and RPCs use a fixed search path'
);

select ok(
  not has_function_privilege('anon', 'public.get_friend_omok_invites()', 'EXECUTE'),
  'anon cannot execute invite RPCs'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_friend_omok_invite(uuid,text,boolean,boolean,boolean,boolean)',
    'EXECUTE'
  ),
  'authenticated can execute create_friend_omok_invite'
);
select ok(
  has_function_privilege('authenticated', 'public.respond_friend_omok_invite(uuid,text)', 'EXECUTE'),
  'authenticated can execute respond_friend_omok_invite'
);
select ok(
  has_function_privilege('authenticated', 'public.cancel_friend_omok_invite(uuid)', 'EXECUTE'),
  'authenticated can execute cancel_friend_omok_invite'
);
select ok(
  has_function_privilege('authenticated', 'public.get_friend_omok_invites()', 'EXECUTE'),
  'authenticated can execute get_friend_omok_invites'
);
select ok(
  has_function_privilege('authenticated', 'public.get_pending_friend_omok_invite_count()', 'EXECUTE'),
  'authenticated can execute pending invite count'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.moment_play_cleanup_friend_omok_room(uuid)',
    'EXECUTE'
  ),
  'room cleanup helper is not directly executable'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.moment_play_expire_friend_omok_invites()',
    'EXECUTE'
  ),
  'expiry helper is not directly executable'
);

select is(
  (
    select array_agg(argument.name order by argument.ordinal)
    from pg_catalog.pg_proc as procedure
    cross join lateral unnest(procedure.proargnames, procedure.proargmodes)
      with ordinality as argument(name, mode, ordinal)
    where procedure.oid = 'public.get_friend_omok_invites()'::regprocedure
      and argument.mode in ('o', 't')
  ),
  array[
    'invite_id', 'direction', 'status', 'friend_code', 'nickname',
    'room_id', 'game_mode', 'created_at', 'expires_at', 'responded_at'
  ],
  'invite overview exposes only approved public fields'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_proc as procedure
    cross join lateral unnest(procedure.proargnames, procedure.proargmodes)
      with ordinality as argument(name, mode, ordinal)
    where procedure.oid = 'public.get_friend_omok_invites()'::regprocedure
      and argument.mode in ('o', 't')
      and argument.name ~* '(email|user_id|sender_id|receiver_id|jwt|token|raw_)'
  ),
  'invite overview does not expose emails, user identifiers, JWTs, or tokens'
);

-- Transaction-only users and friendships -------------------------------------

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous
)
values
  ('42000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'phase5-permanent-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false),
  ('42000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'phase5-permanent-b@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false),
  ('42000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'phase5-permanent-c@example.invalid', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false),
  ('42000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   null, '', now(), '{"provider":"anonymous","providers":["anonymous"]}', '{}', now(), now(), true);

update public.profiles
set nickname = case user_id
  when '42000000-0000-4000-8000-000000000001' then 'InviteAlpha'
  when '42000000-0000-4000-8000-000000000002' then 'InviteBeta'
  when '42000000-0000-4000-8000-000000000003' then 'InviteGamma'
  else 'InviteAnon'
end,
friend_code = case user_id
  when '42000000-0000-4000-8000-000000000001' then 'AAAABBBB01'
  when '42000000-0000-4000-8000-000000000002' then 'AAAABBBB02'
  when '42000000-0000-4000-8000-000000000003' then 'AAAABBBB03'
  else 'AAAABBBB04'
end
where user_id in (
  '42000000-0000-4000-8000-000000000001',
  '42000000-0000-4000-8000-000000000002',
  '42000000-0000-4000-8000-000000000003',
  '42000000-0000-4000-8000-000000000004'
);

insert into public.friendships (
  id, requester_id, addressee_id, status, created_at, responded_at
)
values
  (
    '43000000-0000-4000-8000-000000000001',
    '42000000-0000-4000-8000-000000000001',
    '42000000-0000-4000-8000-000000000002',
    'accepted', now(), now()
  ),
  (
    '43000000-0000-4000-8000-000000000002',
    '42000000-0000-4000-8000-000000000001',
    '42000000-0000-4000-8000-000000000003',
    'pending', now(), null
  );

-- Anonymous and direct-table denial ------------------------------------------

select set_config('request.jwt.claims', '{}', true);
set local role anon;

select throws_ok(
  'select * from public.get_friend_omok_invites()',
  '42501', 'permission denied for function get_friend_omok_invites',
  'anon cannot read game invites'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":true}',
  true
);
set local role authenticated;

select throws_ok(
  $$select * from public.create_friend_omok_invite(
      '43000000-0000-4000-8000-000000000001',
      'standard', true, true, true, true
    )$$,
  '42501', 'Permanent account required',
  'anonymous authenticated users cannot create friend game invites'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  'select * from public.friend_game_invites',
  '42501', 'permission denied for table friend_game_invites',
  'authenticated users cannot read invite rows directly'
);

select throws_ok(
  $$insert into public.friend_game_invites (
      friendship_id, sender_id, receiver_id, room_id
    ) values (
      '43000000-0000-4000-8000-000000000001',
      '42000000-0000-4000-8000-000000000001',
      '42000000-0000-4000-8000-000000000002',
      gen_random_uuid()
    )$$,
  '42501', 'permission denied for table friend_game_invites',
  'authenticated users cannot forge invite rows directly'
);

-- Creation policy -------------------------------------------------------------

select throws_ok(
  $$select * from public.create_friend_omok_invite(
      '43000000-0000-4000-8000-000000000002',
      'standard', true, true, true, true
    )$$,
  'P0001', 'Accepted friendship not found',
  'pending friendships cannot create game invites'
);

select throws_ok(
  $$select * from public.create_friend_omok_invite(
      '43000000-0000-4000-8000-000000000001',
      'arcade', true, true, true, true
    )$$,
  'P0001', 'Unsupported Omok game mode',
  'unsupported Omok modes are rejected'
);

select throws_ok(
  $$select * from public.create_friend_omok_invite(
      '43000000-0000-4000-8000-000000000001',
      'standard', null, true, true, true
    )$$,
  'P0001', 'Omok invite settings are required',
  'missing Omok invite settings are rejected'
);

select lives_ok(
  $$select set_config(
      'phase5.ab_invite_id',
      (select invite_id::text
       from public.create_friend_omok_invite(
         '43000000-0000-4000-8000-000000000001',
         'standard', true, false, true, false
       )),
      true
    )$$,
  'an accepted friend can create an Omok invite'
);

reset role;
select set_config(
  'phase5.ab_room_id',
  (
    select room_id::text
    from public.friend_game_invites
    where id = current_setting('phase5.ab_invite_id')::uuid
  ),
  true
);

select is(
  (
    select status
    from public.friend_game_invites
    where id = current_setting('phase5.ab_invite_id')::uuid
  ),
  'pending'::text,
  'a new invite starts pending'
);

select ok(
  (
    select expires_at > created_at
      and expires_at <= created_at + interval '15 minutes 1 second'
    from public.friend_game_invites
    where id = current_setting('phase5.ab_invite_id')::uuid
  ),
  'a new invite receives the bounded 15-minute expiry'
);

select is(
  (
    select host_user_id
    from public.omok_rooms
    where id = current_setting('phase5.ab_room_id')::uuid
  ),
  '42000000-0000-4000-8000-000000000001'::uuid,
  'the invite sender owns the created Omok room'
);

select is(
  (
    select count(*)
    from public.omok_room_players
    where room_id = current_setting('phase5.ab_room_id')::uuid
  ),
  1::bigint,
  'a pending invite room contains only the host'
);

select results_eq(
  $$select game_mode, allow_forbidden_positions, allow_forbidden_reasons
    from public.omok_rooms
    where id = current_setting('phase5.ab_room_id')::uuid$$,
  $$values ('standard'::text, true, false)$$,
  'the atomic create RPC preserves shared Omok room settings'
);

-- Overview and duplicate protection ------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select results_eq(
  $$select direction, status, friend_code, nickname, game_mode
    from public.get_friend_omok_invites()
    where invite_id = current_setting('phase5.ab_invite_id')::uuid$$,
  $$values ('outgoing'::text, 'pending'::text, 'AAAABBBB02'::text, 'InviteBeta'::text, 'standard'::text)$$,
  'the sender sees a safe outgoing invite overview'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select is(
  public.get_pending_friend_omok_invite_count(),
  1,
  'the receiver pending badge count includes the invite'
);

select results_eq(
  $$select direction, status, friend_code, nickname
    from public.get_friend_omok_invites()
    where invite_id = current_setting('phase5.ab_invite_id')::uuid$$,
  $$values ('incoming'::text, 'pending'::text, 'AAAABBBB01'::text, 'InviteAlpha'::text)$$,
  'the receiver sees a safe incoming invite overview'
);

select throws_ok(
  $$select * from public.create_friend_omok_invite(
      '43000000-0000-4000-8000-000000000001',
      'free', true, true, true, true
    )$$,
  'P0001', 'Active Omok invite already exists',
  'reverse-direction duplicate invites are rejected'
);

-- Acceptance authorization and room join -------------------------------------

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  $$select * from public.respond_friend_omok_invite(
      current_setting('phase5.ab_invite_id')::uuid,
      'accept'
    )$$,
  'P0001', 'Incoming Omok invite not found',
  'a third party cannot accept another pair invite'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  $$select * from public.respond_friend_omok_invite(
      current_setting('phase5.ab_invite_id')::uuid,
      'accept'
    )$$,
  'P0001', 'Incoming Omok invite not found',
  'the sender cannot accept their own outgoing invite'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  $$select * from public.respond_friend_omok_invite(
      current_setting('phase5.ab_invite_id')::uuid,
      null
    )$$,
  'P0001', 'Unsupported Omok invite action',
  'null invite actions are rejected'
);

select lives_ok(
  $$select * from public.respond_friend_omok_invite(
      current_setting('phase5.ab_invite_id')::uuid,
      'accept'
    )$$,
  'only the receiver can accept a pending invite'
);

reset role;
select is(
  (
    select status
    from public.friend_game_invites
    where id = current_setting('phase5.ab_invite_id')::uuid
  ),
  'accepted'::text,
  'acceptance updates the invite status'
);

select ok(
  (
    select responded_at is not null
    from public.friend_game_invites
    where id = current_setting('phase5.ab_invite_id')::uuid
  ),
  'acceptance records a response timestamp'
);

select is(
  (
    select count(*)
    from public.omok_room_players
    where room_id = current_setting('phase5.ab_room_id')::uuid
      and user_id = '42000000-0000-4000-8000-000000000002'
      and role = 'guest'
  ),
  1::bigint,
  'acceptance joins the receiver to the existing Omok room'
);

select is(
  (
    select count(*)
    from public.omok_room_players
    where room_id = current_setting('phase5.ab_room_id')::uuid
  ),
  2::bigint,
  'the accepted room has exactly two players'
);

-- Decline lifecycle -----------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select set_config(
  'phase5.decline_invite_id',
  (select invite_id::text
   from public.create_friend_omok_invite(
     '43000000-0000-4000-8000-000000000001',
     'free', false, false, false, false
   )),
  true
);

reset role;
select set_config(
  'phase5.decline_room_id',
  (
    select room_id::text from public.friend_game_invites
    where id = current_setting('phase5.decline_invite_id')::uuid
  ),
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select lives_ok(
  $$select * from public.respond_friend_omok_invite(
      current_setting('phase5.decline_invite_id')::uuid,
      'decline'
    )$$,
  'the receiver can decline a pending invite'
);

reset role;
select results_eq(
  $$select status, room_id is null, responded_at is not null
    from public.friend_game_invites
    where id = current_setting('phase5.decline_invite_id')::uuid$$,
  $$values ('declined'::text, true, true)$$,
  'decline closes the invite and clears its room reference'
);
select is(
  (
    select count(*) from public.omok_rooms
    where id = current_setting('phase5.decline_room_id')::uuid
  ),
  0::bigint,
  'decline removes the unused host-only waiting room'
);

-- Cancel lifecycle ------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select set_config(
  'phase5.cancel_invite_id',
  (select invite_id::text
   from public.create_friend_omok_invite(
     '43000000-0000-4000-8000-000000000001',
     'standard', true, true, true, true
   )),
  true
);

reset role;
select set_config(
  'phase5.cancel_room_id',
  (
    select room_id::text from public.friend_game_invites
    where id = current_setting('phase5.cancel_invite_id')::uuid
  ),
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  $$select * from public.cancel_friend_omok_invite(
      current_setting('phase5.cancel_invite_id')::uuid
    )$$,
  'P0001', 'Outgoing Omok invite not found',
  'the receiver cannot cancel the sender invite'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select lives_ok(
  $$select * from public.cancel_friend_omok_invite(
      current_setting('phase5.cancel_invite_id')::uuid
    )$$,
  'the sender can cancel an outgoing pending invite'
);

reset role;
select results_eq(
  $$select status, room_id is null, responded_at is not null
    from public.friend_game_invites
    where id = current_setting('phase5.cancel_invite_id')::uuid$$,
  $$values ('cancelled'::text, true, true)$$,
  'cancel closes the invite and clears its room reference'
);
select is(
  (
    select count(*) from public.omok_rooms
    where id = current_setting('phase5.cancel_room_id')::uuid
  ),
  0::bigint,
  'cancel removes the unused host-only waiting room'
);

-- Expiry lifecycle ------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select set_config(
  'phase5.expire_invite_id',
  (select invite_id::text
   from public.create_friend_omok_invite(
     '43000000-0000-4000-8000-000000000001',
     'standard', true, true, true, true
   )),
  true
);

reset role;
select set_config(
  'phase5.expire_room_id',
  (
    select room_id::text from public.friend_game_invites
    where id = current_setting('phase5.expire_invite_id')::uuid
  ),
  true
);

update public.friend_game_invites
set created_at = now() - interval '20 minutes',
    expires_at = now() - interval '5 minutes'
where id = current_setting('phase5.expire_invite_id')::uuid;

select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select is(
  public.get_pending_friend_omok_invite_count(),
  0,
  'pending count expires stale incoming invites before counting'
);

reset role;
select results_eq(
  $$select status, room_id is null, responded_at is not null
    from public.friend_game_invites
    where id = current_setting('phase5.expire_invite_id')::uuid$$,
  $$values ('expired'::text, true, true)$$,
  'lazy expiry closes the invite and clears its room reference'
);
select is(
  (
    select count(*) from public.omok_rooms
    where id = current_setting('phase5.expire_room_id')::uuid
  ),
  0::bigint,
  'expiry removes the unused host-only waiting room'
);

select * from finish();
rollback;
