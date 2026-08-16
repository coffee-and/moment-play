# Prelaunch data reset and authentication foundation

## Audited Supabase project

- Project name: `moment-play`
- Project reference: `nshpwruurbbxomduvinj`
- Region: Northeast Asia (Seoul)
- Linked migration history: all repository migrations through
  `20260716002000_sync_waiting_room_nickname.sql` were present before this work.

The live audit covered the `public`, `auth`, `storage`, `realtime`, `cron`,
`vault`, and `supabase_migrations` schemas. The application tables were:

- `profiles`
- `game_results`
- `friendships`
- `friend_game_invites`
- `omok_rooms`
- `omok_room_players`
- `omok_room_moves`

There were no application views, storage buckets, or storage objects. The
profile trigger on `auth.users` creates one `profiles` row. Application foreign
keys to `auth.users` use cascade deletion except
`omok_rooms.host_user_id`, which uses `ON DELETE RESTRICT`.

Pre-reset counts recorded on 2026-07-27:

| Object | Rows |
| --- | ---: |
| `auth.users` | 8 (6 anonymous test users) |
| `auth.flow_state` | 2 |
| `auth.sessions` | 11 |
| `auth.refresh_tokens` | 52 |
| `public.profiles` | 8 |
| `public.game_results` | 2 |
| `public.friendships` | 1 |
| `public.friend_game_invites` | 5 |
| `public.omok_rooms` | 1 |
| `public.omok_room_players` | 0 |
| `public.omok_room_moves` | 0 |

## Reproducible reset

The reset is intentionally a script, not an automatically applied migration:

```sh
npx supabase projects list --output pretty
npx supabase db query --linked \
  --file supabase/scripts/reset_prelaunch_test_data.sql
```

Confirm that the linked marker is beside reference
`nshpwruurbbxomduvinj` before running it. The transaction reports before and
after counts and deletes in this order:

1. Omok moves
2. Friend-game invitations
3. Omok room participants
4. Omok rooms
5. Friendships
6. Game results
7. Profiles
8. Auth users
9. Unlinked PKCE flow state

The script then verifies all targets and orphan queries are zero. Re-running it
against an already empty project is safe.

Remote execution was completed once on 2026-07-27 against the project reference
above. Post-reset verification returned zero for all listed application tables,
`auth.users`, identities, PKCE flow state, sessions, refresh tokens, and
one-time tokens. The orphan checks were zero, and the release migration,
application triggers, functions, and RLS infrastructure remained present.

The reset preserves schemas, migration records, table definitions, foreign
keys, functions, triggers, views, extensions, RLS policies, grants, cron jobs,
provider configuration, storage configuration, and frontend environment
variable names. It does not seed an account or profile.

## Authentication model

The only application auth states are:

- `loading`: existing-session restoration is unresolved
- `guest`: local visitor without a valid release account session
- `authenticated`: valid non-anonymous Supabase session

Guests may browse home, the game catalogue, game descriptions/instructions,
theme settings, and local settings. A game component is not mounted until an
authenticated user explicitly confirms Start or room entry. Authentication
only returns to the intended screen; it does not start a game, join a room,
submit a result, or consume a future ticket.

The client contains no anonymous sign-in or account-upgrade call. The release
migration also rejects anonymous `auth.users` inserts in the profile trigger.
Profiles receive a `Player-xxxxx` placeholder and nickname changes go through
the authorized `update_my_profile_nickname(text)` database function. Browser
code no longer writes Auth user metadata.

## Shared callback and redirects

`/auth/callback` is the only callback route. It:

- reads a Supabase PKCE code from the outer URL query or HashRouter query
- handles provider errors, missing/malformed codes, and expired codes
- scrubs the code from browser history before exchange
- prevents a code from being exchanged twice in one application lifetime
- restores the session and returns only to a validated internal path

`/complete-signup` and the anonymous account-completion form were removed.
Because this is a prelaunch reset and all old users/links were test data, there
is no compatibility route. If one is temporarily needed after release, add it
with a dated removal issue rather than restoring a second callback handler.

The default web callback builder uses the Vite base path and produces:

```text
http://127.0.0.1:3000/#/auth/callback
https://<deployed-host>/<base>/#/auth/callback
```

Set `VITE_AUTH_CALLBACK_URL` only when the environment needs an explicit full
callback URL. It accepts a deployed web URL or a future native deep link such
as `momentplay://auth/callback`. The environment value is still passed through
the same callback builder and receives the safe `returnTo` query.

Configure the matching URLs in Supabase Dashboard → Authentication → URL
Configuration. At minimum allow:

- `http://127.0.0.1:3000/`
- the deployed Moment Play base URL
- the future native deep-link URL only when Capacitor is implemented

Do not add OAuth client secrets to Vite variables. The browser uses only
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Return-path rules

`returnTo` must begin with one `/` and resolve to the Moment Play origin.
Absolute URLs, protocol-relative URLs, backslashes, control characters,
malformed percent escapes, `javascript:` URLs, and `data:` URLs fall back to
`/`. Valid paths include `/minigames`, game/room routes, `/ranking`,
`/friends`, and `/settings`.

## Follow-on work

Google now uses the shared gateway, callback, redirect builder, and `returnTo`
validator described in [Social login foundation](social-login.md). Apple login;
account management/deletion; play tickets; referral rewards; and Capacitor
deep-link handling remain deferred.

Account deletion must be a separately authorized server workflow with
dependent-row and Auth-user deletion in one deliberate operation.
