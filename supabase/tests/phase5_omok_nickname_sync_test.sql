begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select no_plan();

select ok(
  to_regprocedure('public.omok_join_room(uuid)') is not null,
  'omok_join_room exists'
);

select ok(
  (select prosecdef from pg_catalog.pg_proc where oid = 'public.omok_join_room(uuid)'::regprocedure),
  'omok_join_room is SECURITY DEFINER'
);

select is(
  (select proconfig from pg_catalog.pg_proc where oid = 'public.omok_join_room(uuid)'::regprocedure),
  array['search_path=pg_catalog, public']::text[],
  'omok_join_room uses a fixed search path'
);

select ok(
  has_function_privilege('authenticated', 'public.omok_join_room(uuid)', 'EXECUTE'),
  'authenticated users can execute omok_join_room'
);

select ok(
  not has_function_privilege('anon', 'public.omok_join_room(uuid)', 'EXECUTE'),
  'anonymous browser role cannot execute omok_join_room'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous
)
values (
  '52000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'phase5-nickname-sync@example.invalid',
  '',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  false
);

update public.profiles
set nickname = 'BeforeName'
where user_id = '52000000-0000-4000-8000-000000000001';

select set_config(
  'request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select lives_ok(
  $$select set_config(
      'phase5.nickname_room_id',
      public.omok_create_room('standard', true, true, true, true)::text,
      true
    )$$,
  'the fixture user can create an Omok waiting room'
);

reset role;

update public.profiles
set nickname = 'AfterName'
where user_id = '52000000-0000-4000-8000-000000000001';

select set_config(
  'request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.omok_join_room(current_setting('phase5.nickname_room_id')::uuid)$$,
  'rejoining an existing waiting-room membership succeeds after nickname setup'
);

reset role;

select is(
  (
    select nickname
    from public.omok_room_players
    where room_id = current_setting('phase5.nickname_room_id')::uuid
      and user_id = '52000000-0000-4000-8000-000000000001'
  ),
  'AfterName'::text,
  'the existing waiting-room player nickname is refreshed from profiles'
);

select is(
  (
    select title
    from public.omok_rooms
    where id = current_setting('phase5.nickname_room_id')::uuid
  ),
  'AfterName님의 방'::text,
  'the waiting-room host title follows the refreshed nickname'
);

update public.omok_rooms
set status = 'playing'
where id = current_setting('phase5.nickname_room_id')::uuid;

update public.profiles
set nickname = 'DuringGame'
where user_id = '52000000-0000-4000-8000-000000000001';

select set_config(
  'request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.omok_join_room(current_setting('phase5.nickname_room_id')::uuid)$$,
  'an existing member can refresh the route while a game is active'
);

reset role;

select is(
  (
    select nickname
    from public.omok_room_players
    where room_id = current_setting('phase5.nickname_room_id')::uuid
      and user_id = '52000000-0000-4000-8000-000000000001'
  ),
  'AfterName'::text,
  'a playing-room nickname remains immutable'
);

select is(
  (
    select title
    from public.omok_rooms
    where id = current_setting('phase5.nickname_room_id')::uuid
  ),
  'AfterName님의 방'::text,
  'a playing-room title remains immutable'
);

select * from finish();
rollback;
