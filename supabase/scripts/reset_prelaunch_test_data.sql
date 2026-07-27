-- Moment Play prelaunch test-data reset.
--
-- Target verified on 2026-07-27:
--   project: moment-play
--   reference: nshpwruurbbxomduvinj
--
-- This script intentionally preserves schemas, tables, migrations, functions,
-- triggers, views, extensions, RLS policies, grants, cron jobs, provider
-- configuration, and storage configuration. It deletes application data,
-- Supabase Auth users, and their transient Auth session/verification records.
--
-- Execute only after confirming the linked project:
--   npx supabase projects list --output pretty
--   npx supabase db query --linked --file supabase/scripts/reset_prelaunch_test_data.sql

begin;

-- Keep the count output in the CLI transcript as the destructive audit trail.
select 'before' as phase, 'auth.users' as object_name, count(*) as row_count
from auth.users
union all
select 'before', 'auth.flow_state', count(*) from auth.flow_state
union all
select 'before', 'auth.sessions', count(*) from auth.sessions
union all
select 'before', 'auth.refresh_tokens', count(*) from auth.refresh_tokens
union all
select 'before', 'public.profiles', count(*) from public.profiles
union all
select 'before', 'public.game_results', count(*) from public.game_results
union all
select 'before', 'public.friendships', count(*) from public.friendships
union all
select 'before', 'public.friend_game_invites', count(*) from public.friend_game_invites
union all
select 'before', 'public.omok_rooms', count(*) from public.omok_rooms
union all
select 'before', 'public.omok_room_players', count(*) from public.omok_room_players
union all
select 'before', 'public.omok_room_moves', count(*) from public.omok_room_moves
order by object_name;

-- Child-to-parent order is explicit. In particular, omok_rooms.host_user_id
-- uses ON DELETE RESTRICT, so rooms must be gone before auth.users.
delete from public.omok_room_moves;
delete from public.friend_game_invites;
delete from public.omok_room_players;
delete from public.omok_rooms;
delete from public.friendships;
delete from public.game_results;
delete from public.profiles;

-- Deleting users cascades through identities, sessions, refresh tokens, MFA,
-- OAuth consent/authorization rows, and one-time tokens through Auth FKs.
delete from auth.users;

-- PKCE flow state is transient and is not linked to auth.users by a foreign
-- key, so clear it explicitly to prevent a pre-reset verification attempt
-- from being resumed against the empty user set.
delete from auth.flow_state;

-- All application and Auth user/session targets must now be empty.
select 'after' as phase, 'auth.users' as object_name, count(*) as row_count
from auth.users
union all
select 'after', 'auth.identities', count(*) from auth.identities
union all
select 'after', 'auth.flow_state', count(*) from auth.flow_state
union all
select 'after', 'auth.sessions', count(*) from auth.sessions
union all
select 'after', 'auth.refresh_tokens', count(*) from auth.refresh_tokens
union all
select 'after', 'auth.one_time_tokens', count(*) from auth.one_time_tokens
union all
select 'after', 'public.profiles', count(*) from public.profiles
union all
select 'after', 'public.game_results', count(*) from public.game_results
union all
select 'after', 'public.friendships', count(*) from public.friendships
union all
select 'after', 'public.friend_game_invites', count(*) from public.friend_game_invites
union all
select 'after', 'public.omok_rooms', count(*) from public.omok_rooms
union all
select 'after', 'public.omok_room_players', count(*) from public.omok_room_players
union all
select 'after', 'public.omok_room_moves', count(*) from public.omok_room_moves
order by object_name;

-- These queries must each return zero. They remain useful if the script is
-- adapted later to retain a subset of users or application rows.
select count(*) as orphan_profiles
from public.profiles as profile
left join auth.users as auth_user on auth_user.id = profile.user_id
where auth_user.id is null;

select count(*) as orphan_game_results
from public.game_results as result
left join auth.users as auth_user on auth_user.id = result.user_id
where auth_user.id is null;

select count(*) as orphan_friendships
from public.friendships as friendship
left join auth.users as requester on requester.id = friendship.requester_id
left join auth.users as addressee on addressee.id = friendship.addressee_id
where requester.id is null or addressee.id is null;

select count(*) as orphan_room_players
from public.omok_room_players as player
left join public.omok_rooms as room on room.id = player.room_id
left join auth.users as auth_user on auth_user.id = player.user_id
where room.id is null or auth_user.id is null;

select count(*) as orphan_room_moves
from public.omok_room_moves as move
left join public.omok_rooms as room on room.id = move.room_id
left join public.omok_room_players as player
  on player.room_id = move.room_id
 and player.user_id = move.player_user_id
where room.id is null or player.user_id is null;

commit;
