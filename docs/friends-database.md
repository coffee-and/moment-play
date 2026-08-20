# Friendship Database Contract

## Scope

This document describes the database and client gateway contract used by the `/friends` screen.

Included:

- A unique public friend code for every profile
- Permanent-account-only friend search
- Send, accept, reject, cancel, and remove operations
- Friend and pending-request overview
- RLS and privilege boundaries
- pgTAP coverage for schema, grants, forged actions, guest denial, duplicate pairs, and the full request lifecycle

## Privacy boundary

Friend lookup and overview RPCs return only:

- Friend code
- Nickname
- Relationship status and direction
- Friendship identifier and timestamps where needed for actions

They do not return email addresses, JWT data, authentication metadata, or raw user identifiers.

Friend codes are identifiers, not passwords or secrets. All state-changing operations still verify the authenticated permanent user on the server.

## Database access

The `friendships` table has RLS enabled and gives `anon` and `authenticated` no direct table grants. Browser clients use SECURITY DEFINER RPC functions with fixed search paths:

- `get_my_friend_profile()`
- `find_friend_by_code(text)`
- `send_friend_request(text)`
- `respond_friend_request(uuid, text)`
- `cancel_friend_request(uuid)`
- `remove_friend(uuid)`
- `get_friend_overview()`

Browser guests cannot call friendship RPCs. Release accounts are authorized by
the internal account guard.

## Verification

Run the application tests:

```sh
npm test
```

Start the isolated local database and run the friendship database contract:

```sh
npx supabase db start
npm run test:db:friends
```

Equivalent command:

```sh
npx supabase test db supabase/tests/phase4_friendships_test.sql
```

The SQL file opens a transaction, creates isolated users and relationships, runs the pgTAP assertions, and rolls everything back.

Friend-code fixtures are assigned before the test switches to restricted database roles. This matters because SQL function arguments are evaluated with the caller's permissions: an authenticated user must not query another user's `profiles` row merely to discover the code passed to a SECURITY DEFINER RPC.

The test command returns a non-zero result when an assertion fails or an uncaught SQL exception interrupts the suite. Never add `--linked`; the fixtures must remain isolated from hosted data. See [Database contract tests](./database-contract-tests.md) for the full suite and CI contract.
