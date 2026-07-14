# Phase 4 Friendship Database

## Scope

This phase adds the database and client gateway foundation for friend features. It does not add the `/friends` screen yet.

Included:

- A unique public friend code for every profile
- Permanent-account-only friend search
- Send, accept, reject, cancel, and remove operations
- Friend and pending-request overview
- RLS and privilege boundaries
- pgTAP coverage for schema, grants, forged actions, anonymous accounts, duplicate pairs, and the full request lifecycle

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

Anonymous authenticated users are rejected by the internal permanent-account guard.

## Verification

Run the application tests:

```sh
npm test
```

Run the Phase 4 database test against the linked Supabase project:

```sh
npm run test:db:friends
```

Equivalent command:

```sh
npx supabase db query --linked --file supabase/tests/phase4_friendships_test.sql
```

The SQL file opens a transaction, creates isolated users and relationships, runs the pgTAP assertions, and rolls everything back.

Friend-code fixtures are assigned before the test switches to restricted database roles. This matters because SQL function arguments are evaluated with the caller's permissions: an authenticated user must not query another user's `profiles` row merely to discover the code passed to a SECURITY DEFINER RPC.

The linked query command returns a non-zero result when an uncaught SQL exception interrupts the suite. Review all emitted pgTAP rows as well and confirm that none begin with `not ok`.

## Next phase

Phase 4-2 will add the friend page and UI states using `friendsGateway.js`:

- My friend code
- Friend-code search
- Incoming requests
- Outgoing requests
- Friend list
- Accept, reject, cancel, and remove actions
