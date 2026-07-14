# Ranking Database Verification

Run the Phase 3 ranking database verification against the currently linked Supabase project:

```sh
npm run test:db:ranking
```

The pgTAP suite creates isolated test users and ranking rows inside a transaction and automatically rolls everything back. It does not require a real user UUID or modify retained project data.

Use the linked database credentials requested by the Supabase CLI. Never use a service-role or secret API key to claim that RLS has been verified because those roles bypass RLS.

Each assertion prints an `ok`/`not ok` result with a focused description. A complete run ends with `All tests successful` and `Result: PASS`; any failed assertion makes the command exit non-zero and its description identifies the failed schema, privilege, RLS, constraint, or leaderboard behavior.
