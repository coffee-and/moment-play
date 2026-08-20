# Friend Omok Invite Database

## Scope

This document describes the database and client-gateway contract used to invite an accepted friend to an online Omok room. The friend screen and invitation UI consume this contract.

## Lifecycle

- Only permanent authenticated accounts can use friend game invitations.
- The sender must be a participant in an accepted `friendships` row.
- `create_friend_omok_invite(...)` creates the Omok room and invite atomically.
- A friend pair can have only one pending invite in either direction.
- Invitations expire after 15 minutes.
- Only the receiver can accept or decline.
- Only the sender can cancel.
- Accept joins the receiver to the existing room through the existing `omok_join_room` contract.
- Decline, cancel, and expiry remove an unused host-only waiting room.

Statuses:

- `pending`
- `accepted`
- `declined`
- `cancelled`
- `expired`

## Privacy boundary

`get_friend_omok_invites()` returns only:

- Invite identifier
- Incoming/outgoing direction
- Status
- Friend code and nickname
- Omok room identifier and game mode
- Creation, expiry, and response timestamps

It does not return email addresses, sender/receiver user UUIDs, JWT data, auth metadata, or tokens.

## Database access

The `friend_game_invites` table has RLS enabled and no direct `anon` or `authenticated` table grants. Browser clients use SECURITY DEFINER RPCs with fixed search paths:

- `create_friend_omok_invite(uuid, text, boolean, boolean, boolean, boolean)`
- `respond_friend_omok_invite(uuid, text)`
- `cancel_friend_omok_invite(uuid)`
- `get_friend_omok_invites()`

Internal cleanup and expiry helpers are not directly executable by browser roles.

## Verification

Run application tests and build:

```sh
npm test
npm run build
```

Preview the remote migration:

```sh
npx supabase db push --linked --dry-run
```

Apply only after confirming that the intended invite migration is listed:

```sh
npx supabase db push --linked
```

Run the transaction-only database verification:

```sh
npx supabase db start
npm run test:db:invites
```

The pgTAP SQL creates isolated test users, friendships, invites, and rooms inside a transaction and rolls everything back.
It runs only against the local database; never add `--linked`. See [Database contract tests](./database-contract-tests.md) for the full suite and CI contract.
