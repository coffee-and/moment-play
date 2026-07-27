# Omok Online Rooms Setup

## Environment

Create a local `.env.local` file with browser-safe Supabase values:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Do not put a service-role key in frontend environment variables.

## Supabase Requirements

- Disable anonymous authentication in the Supabase project. Guests are local
  visitors; online rooms require a release account session.
- Apply migrations from `supabase/migrations`.
- This feature uses a shared `profiles` table (usable by any future Moment Play game, not just Omok) plus Omok-namespaced `omok_rooms`/`omok_room_players`/`omok_room_moves` tables and RPC functions.

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

## Data Retention & Cleanup

- Waiting online rooms are deleted after 24 hours of inactivity.
- Started online rooms (and their moves, via cascade) are deleted after 7 days of inactivity.
- Account rows are never deleted by retention cleanup. Future account deletion
  will use a separately authorized server workflow.
- Local nickname/records in the browser expire after 60 days of local inactivity (checked when read, not proactively scanned).
- A `SECURITY DEFINER` cleanup function (`public.moment_play_cleanup_expired_data()`) performs room cleanup only. It has no grant to `anon`/`authenticated`/`public` and is reachable only through the scheduled job below.
- A daily `pg_cron` job (`moment-play-daily-cleanup`) runs at 03:00 Asia/Seoul (18:00 UTC) and calls only that function. The migration is idempotent and safe to re-apply/inspect without creating duplicate jobs.
- This cleanup function is not executed by any tooling in this repository - it only runs on the schedule once the migration is applied to a real project.

## Security Boundary

Database constraints and RPCs enforce seats, turn order, stone ownership, occupied positions, move order, finished-round checks, rematch acceptance, and room capacity. Standard/Free win completion is checked in SQL for round finality. Full forbidden-move legality is still validated by the current client/domain engine before submitting moves; a future trusted server rule engine would be needed for stronger anti-cheat guarantees.

## Future Ranking Readiness (not implemented in this PR)

The shared `profiles` table exists so future ranking work has a stable `user_id` to key off of, but this PR does **not** add ranking functionality, a `game_results` table, ranking calculations, or ranking UI. When that work happens, the expected shape is:

```text
game_results
- user_id references profiles.user_id
- game_id
- mode
- score
- duration_ms
- result
- metadata
- created_at
```

Ranking writes are limited to authenticated users and validated server-side; a client must never submit an arbitrary owner for a ranking record.

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
