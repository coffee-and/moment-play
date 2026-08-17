# Database contract tests

Database contract tests run only against the repository's isolated local Supabase database. They never use a linked or production project.

## Prerequisites

- Node.js 22
- Docker Desktop or another Docker-compatible runtime
- Dependencies installed with `npm ci`

## Run the full suite

Start the local database. The command creates the Supabase system schemas and applies every file in `supabase/migrations` in order.

```sh
npx supabase db start
```

Run all pgTAP contracts in `supabase/tests`:

```sh
npm run test:db
```

Stop the isolated database when finished:

```sh
npx supabase stop --no-backup
```

The full suite is the database quality gate used by CI. Domain-specific scripts are available for focused local feedback:

- `npm run test:db:ranking`
- `npm run test:db:friends`
- `npm run test:db:invites`
- `npm run test:db:auth`

Each pgTAP file runs in a transaction and rolls back its fixtures. Do not add `--linked` to these commands: contract tests may create users and domain records and must remain isolated from hosted data.

## Continuous integration

`.github/workflows/app-ci.yml` starts a fresh local Postgres instance, applies the committed migrations, and runs the complete pgTAP suite. Pull requests run that workflow directly. The Pages deployment calls the same reusable workflow and cannot build or deploy until both application and database jobs succeed.
