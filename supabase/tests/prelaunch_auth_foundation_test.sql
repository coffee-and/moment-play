begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(20);

select has_function(
  'public', 'update_my_profile_nickname', array['text'],
  'server-authorized nickname update function exists'
);

select ok(
  (select prosecdef
   from pg_catalog.pg_proc
   where oid = 'public.update_my_profile_nickname(text)'::regprocedure),
  'nickname update function is SECURITY DEFINER'
);

select is(
  (select proconfig
   from pg_catalog.pg_proc
   where oid = 'public.update_my_profile_nickname(text)'::regprocedure),
  array['search_path=pg_catalog, public'],
  'nickname update function fixes its search path'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.update_my_profile_nickname(text)',
    'EXECUTE'
  ),
  'authenticated users can call the nickname function'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.update_my_profile_nickname(text)',
    'EXECUTE'
  ),
  'browser guests cannot call the nickname function'
);

select is(
  (select count(*)
   from information_schema.role_table_grants
   where table_schema = 'public'
     and table_name = 'profiles'
     and grantee = 'authenticated'
     and privilege_type = 'INSERT'),
  0::bigint,
  'authenticated clients cannot insert protected profiles directly'
);

select is(
  (select count(*)
   from information_schema.column_privileges
   where table_schema = 'public'
     and table_name = 'profiles'
     and grantee = 'authenticated'
     and privilege_type = 'UPDATE'),
  0::bigint,
  'authenticated clients cannot update protected profile columns directly'
);

select throws_ok(
  $$insert into auth.users (
      id, instance_id, aud, role, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous
    )
    values (
      '61000000-0000-4000-8000-000000000099',
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', '', now(),
      '{"provider":"anonymous","providers":["anonymous"]}', '{}',
      now(), now(), true
    )$$,
  '42501',
  'Anonymous accounts are not supported',
  'the Auth profile trigger rejects anonymous Auth user creation'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous
)
values
  (
    '61000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'release-a@example.invalid', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), false
  ),
  (
    '61000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'release-b@example.invalid', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), false
  );

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous
)
values
  (
    '62000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'social-google@example.invalid', '', now(),
    '{"provider":"google","providers":["google"]}',
    '{"name":"Untrusted Google Nickname"}',
    now(), now(), false
  ),
  (
    '63000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', null, '', now(),
    '{"provider":"kakao","providers":["kakao"]}', '{}',
    now(), now(), false
  );

select is(
  (select count(*)
   from public.profiles
   where user_id = '62000000-0000-4000-8000-000000000001'),
  1::bigint,
  'Google Auth user creation creates exactly one protected profile'
);

select is(
  (select nickname
   from public.profiles
   where user_id = '62000000-0000-4000-8000-000000000001'),
  'Player-62000',
  'Google provider metadata cannot choose the protected profile nickname'
);

select is(
  (select count(*)
   from public.profiles
   where user_id = '63000000-0000-4000-8000-000000000001'),
  1::bigint,
  'Kakao Auth user creation creates a profile when email is unavailable'
);

select is(
  (select nickname
   from public.profiles
   where user_id = '63000000-0000-4000-8000-000000000001'),
  'Player-63000',
  'Kakao Auth user creation receives the server-owned placeholder nickname'
);

update auth.users
set raw_user_meta_data = '{"name":"Changed Provider Nickname"}',
    last_sign_in_at = now(),
    updated_at = now()
where id = '62000000-0000-4000-8000-000000000001';

select ok(
  (select count(*) = 1
      and min(nickname) = 'Player-62000'
   from public.profiles
   where user_id = '62000000-0000-4000-8000-000000000001'),
  'returning provider login cannot duplicate or rewrite the protected profile'
);

select matches(
  (select nickname
   from public.profiles
   where user_id = '61000000-0000-4000-8000-000000000001'),
  '^Player-[0-9a-f]{5}$',
  'verified account creation receives a non-guest placeholder profile'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select throws_ok(
  $$update public.profiles
    set nickname = 'Forged'
    where user_id = '61000000-0000-4000-8000-000000000001'$$,
  '42501',
  'permission denied for table profiles',
  'direct protected profile updates are denied'
);

select lives_ok(
  $$select public.update_my_profile_nickname('ReleasePlay')$$,
  'authenticated user can update their profile through the server function'
);

reset role;

select is(
  (select nickname
   from public.profiles
   where user_id = '61000000-0000-4000-8000-000000000001'),
  'ReleasePlay',
  'nickname function updates the caller profile'
);

select matches(
  (select nickname
   from public.profiles
   where user_id = '61000000-0000-4000-8000-000000000002'),
  '^Player-[0-9a-f]{5}$',
  'nickname function does not modify another profile'
);

select ok(
  position(
    'auth.users' in pg_catalog.pg_get_functiondef(
      'public.moment_play_cleanup_expired_data()'::regprocedure
    )
  ) = 0,
  'retention cleanup no longer owns an account-deletion lifecycle'
);

select ok(
  position(
    'is_anonymous' in pg_catalog.pg_get_functiondef(
      'public.moment_play_cleanup_expired_data()'::regprocedure
    )
  ) = 0,
  'retention cleanup contains no anonymous-account branch'
);

select * from finish();
rollback;
