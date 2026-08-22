# Phase 0 — Project audit

Audit date: 2026-08-22

## Current architecture

| Area | Current implementation |
| --- | --- |
| Client | Expo SDK 57, React Native 0.86, React 19, TypeScript |
| Navigation | Expo Router file-based routes under `src/app` |
| Backend | Hosted Supabase project: PostgreSQL, PostgREST, Supabase Auth, and Edge Functions |
| Database client | `@supabase/supabase-js` in `src/lib/supabase.ts` |
| Authentication | Supabase email/password authentication; native sessions use Expo SecureStore |
| State | React Context and custom hooks; some review state is also cached in AsyncStorage/localStorage |
| Styling | React Native `StyleSheet`, theme hooks, `src/global.css`, and a small responsive hook |
| Deployment | EAS build configuration in `eas.json`; no web-hosting configuration is present |

## Data and API inventory

The live app is configured to call the hosted Supabase project identified by the public URL in app configuration. No PostgreSQL connection string, database password, or local database data directory is stored in this repository.

Schema migrations are in `supabase/migrations`. The principal tables are:

- `profiles`, `anime`, `favorites`
- `comments`, `comment_likes`, `follows`
- gamification tables: `daily_logins`, `missions`, `user_missions`, `spins`, `rewarded_ads`, `themes`, `user_themes`, `badges`, `user_badges`, `vip_transactions`
- security/audit tables introduced by later migrations: `device_sessions`, `audit_logs`

The client calls Supabase tables and RPCs directly. The server-side API surface consists of the `admin-operations` and `sign-out-all-devices` Edge Functions. There are no conventional application API routes.

## Existing feature audit

- **Notifications:** no persistent notification table, API, or user interface exists.
- **Mentions/tags:** not implemented.
- **Replies:** comments are single-level reviews; no parent-comment relationship exists.
- **Comments:** `useReviews.tsx` combines seeded reviews, local cache, and database rows. Database writes/deletes are fire-and-forget, so failed deletes can leave the database record visible elsewhere. This is the cause to address in Phase 4.
- **Products:** products are represented by the `anime` table. There is no explicit `published_at`/publication-state field, only `is_featured`.
- **Admin:** an admin UI and an Edge Function exist. Server-side checks use `profiles.role`, but historical migrations contain unsafe name-based admin assignment and must be replaced in Phase 7.
- **Password reset:** the client only calls `supabase.auth.resetPasswordForEmail`. There is no reset-password route that verifies a recovery session and updates the password. This is incomplete.
- **Registration:** no server-side disposable-email policy exists.
- **Responsive/mobile:** responsive utilities exist, but no systematic viewport, keyboard, or layout test coverage exists.
- **Icon:** Android/iOS/web icon assets exist under `assets/images` and `assets/expo.icon`; visual validation is still required in Phase 11.

## Database migration safety assessment

The current database is a hosted Supabase PostgreSQL instance containing user/application data. It must **not** be replaced, reset, or pointed at a fresh container until a verified export and restore test exist.

Safe migration sequence for Phase 12:

1. Obtain authorized Supabase CLI/database access for the existing hosted project.
2. Record the remote PostgreSQL major version and schema migration history.
3. Make an encrypted, timestamped logical backup using `supabase db dump --linked` (schema, roles, and data) or `pg_dump` with the authorized connection string.
4. Verify the backup by restoring it to an isolated Docker Supabase environment, never to the live project.
5. Compare row counts and foreign-key/schema integrity for every application and `auth` table.
6. Create persistent Docker volumes and a separate uncommitted `.env` for local Supabase secrets.
7. Point a development build at the restored local stack only after the verification succeeds.
8. Keep the hosted project unchanged until the user explicitly approves a cutover and a rollback plan.

Current blockers for an actual data migration:

- Docker is not available in this workspace.
- No authorized remote database connection string/service-role secret is available in the repository.
- The live data cannot be safely inspected or exported with the public anonymous key.

These are intentional safeguards, not reasons to recreate or overwrite the existing database.

## Configuration and security observations

- `.env.example` contains only public Supabase placeholders; it needs Docker/local-development variables in Phase 12.
- Public Expo configuration currently carries the Supabase URL and anonymous key. Those values are designed to be public, but configuration should be consolidated into environment variables to avoid accidental environment mix-ups.
- No secrets will be committed. Docker backup files and local credentials must remain ignored.
- Existing generated Android install artifacts are local-only and must remain outside Git.

## Test baseline

- No automated test runner is configured in `package.json`.
- `npm run lint` is currently not a reliable baseline due to an installed ESLint TypeScript resolver compatibility failure observed before this audit.
- Phase implementations will add focused checks and run Expo/TypeScript validation where the current toolchain permits.

## Phase 0 result

Phase 0 is complete. No remote data, authentication configuration, or database infrastructure was changed.
