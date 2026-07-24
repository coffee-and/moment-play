# Ranking Database Verification

Run the Phase 3 ranking database verification against the currently linked Supabase project:

```sh
npm run test:db:ranking
```

Equivalent command:

```sh
npx supabase db query --linked --file supabase/tests/phase3_game_results_test.sql
```

The pgTAP suite creates isolated test users and ranking rows inside a transaction and automatically rolls everything back. It does not require a local Docker daemon, a real user UUID, or retained test data.

Use the linked database credentials requested by the Supabase CLI. Never use a service-role or secret API key to claim that RLS has been verified because those roles bypass RLS.

Review the output for `not ok` lines and confirm the final pgTAP result reports success. Each assertion has a focused description identifying the failed schema, privilege, RLS, constraint, or leaderboard behavior.
