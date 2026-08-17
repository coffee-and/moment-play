# Ranking Database Verification

Start the isolated local database and run the Phase 3 ranking contract:

```sh
npx supabase db start
npm run test:db:ranking
```

Equivalent command:

```sh
npx supabase test db supabase/tests/phase3_game_results_test.sql
```

The pgTAP suite creates isolated test users and ranking rows inside a transaction and automatically rolls everything back. It requires a Docker-compatible runtime, but does not require hosted credentials, a real user UUID, or retained test data.

Never run this suite with `--linked` or use a service-role or secret API key to claim that RLS has been verified because those roles bypass RLS.

Review the output for `not ok` lines and confirm the final pgTAP result reports success. Each assertion has a focused description identifying the failed schema, privilege, RLS, constraint, or leaderboard behavior.

See [Database contract tests](./database-contract-tests.md) for the full suite and CI contract.
