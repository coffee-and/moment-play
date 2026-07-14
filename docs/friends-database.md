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

Run the Phase 4 database test directly against the currently linked Supabase project:

```sh
npm run test:db:friends
```

Equivalent command:

```sh
npx supabase db query --linked --file supabase/tests/phase4_friendships_test.sql
```

This runner does not require a local Docker daemon. The SQL file opens a transaction, creates isolated test users and relationships, runs the pgTAP assertions, and rolls everything back.

Review the output for `not ok` lines and confirm the final pgTAP result reports success. Because this command sends the SQL directly to the linked database rather than using the Docker-hosted `pg_prove` runner, the console output itself is the source of truth for assertion failures.

## Next phase

Phase 4-2 will add the friend page and UI states using `friendsGateway.js`:

- My friend code
- Friend-code search
- Incoming requests
- Outgoing requests
- Friend list
- Accept, reject, cancel, and remove actions
