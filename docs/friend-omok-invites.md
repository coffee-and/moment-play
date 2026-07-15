# Friend Omok Invite Database

## Scope

This phase adds the database and client-gateway foundation for inviting an accepted friend to an existing online Omok room. It does not add the invite buttons, inbox UI, or navigation badge yet.

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
- `get_pending_friend_omok_invite_count()`

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
npm run test:db:invites
```

The pgTAP SQL creates isolated test users, friendships, invites, and rooms inside a transaction and rolls everything back.

## Next phase

The follow-up UI phase will:

- Add an Omok invite action to accepted friends
- Reuse the existing Omok rule and guide settings
- Show incoming and outgoing invitations
- Navigate the receiver to `/minigames/omok/room/:roomId` after acceptance
- Add friendly loading, error, expiry, and duplicate-invite states
