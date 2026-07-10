# Omok Online Rooms Setup

## Environment

Create a local `.env.local` file with browser-safe Supabase values:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Do not put a service-role key in frontend environment variables.

## Supabase Requirements

- Enable anonymous authentication in the Supabase project.
- Apply migrations from `supabase/migrations`.
- Use `omok_*` tables and RPC functions for this feature.

Safe local migration flow:

```sh
supabase start
supabase migration up
```

Do not run `supabase db push` or reset a remote database without confirming the target project first.

## Invite URLs

Moment Play uses `HashRouter`, so invite links use:

```text
https://host/current-base/#/minigames/omok/room/<room-id>
```

## Synchronization

Online rooms use polling, not Supabase Realtime. The client refreshes an active room roughly once per second and derives the board from server moves for the current round.

## Security Boundary

Database constraints and RPCs enforce seats, turn order, stone ownership, occupied positions, move order, finished-round checks, rematch acceptance, and room capacity. Standard/Free win completion is checked in SQL for round finality. Full forbidden-move legality is still validated by the current client/domain engine before submitting moves; a future trusted server rule engine would be needed for stronger anti-cheat guarantees.

## Excluded

- Random matchmaking
- Public room browser
- Password rooms
- Spectators
- Match history
- Account login UI
- Payments
- Rankings
- Replay
- Turn timer
- Undo
- Chat
- Online resignation
