# Safe Docker migration runbook

AniFlix currently uses hosted Supabase, which includes PostgreSQL, Auth,
PostgREST, Realtime, Storage, and Edge Functions. The Docker target must be a
local/self-hosted Supabase stack, not only a PostgreSQL container, because the
application uses Supabase Auth and REST APIs directly.

## Safety rules

1. Keep the hosted project running until the local restored copy passes all
   tests. Do not delete, reset, or overwrite the hosted project.
2. Use an authorized `SUPABASE_DB_URL` only in the current PowerShell session.
   It must never be copied to `.env`, source code, Git, or chat.
3. Run `./scripts/backup-hosted-supabase.ps1` and retain the resulting custom
   dump. The `backups/` folder is ignored by Git.
4. Verify the backup on an isolated Docker Supabase instance before considering
   any app configuration change.

## Docker prerequisite

Install and start Docker Desktop for Windows, then verify:

```powershell
docker version
npx supabase start
```

The repository already contains `supabase/config.toml`; `supabase start` uses
Docker volumes so its database persists across container restarts. Do not run
`supabase db reset` against any environment holding user data.

## Restore and verify

1. Start the isolated local Supabase stack: `npx supabase start`.
2. Record local credentials: `npx supabase status -o env`.
3. Copy `.env.docker.example` to `.env.docker` and insert only the local public
   URL and anon key. Keep the service-role key out of Expo.
4. Restore the verified dump into the local database using the local Supabase
   database URL. This step requires a one-time controlled restore command and
   must be performed only after the hosted backup checksum and local target are
   confirmed.
5. Compare row counts and IDs for `auth.users`, `profiles`, `anime`,
   `comments`, `favorites`, `notifications`, and all related tables.
6. Run the app against `.env.docker`, then test login, products, comments,
   replies, notifications, and password recovery. Local email is available in
   the Supabase mail testing interface.
7. Only after a successful verification, deploy the same Supabase configuration
   to a managed Docker host and update the production Expo public URL/key.

## Current blocker

Docker Desktop is not installed/running in this workspace and no authorized
hosted database connection string is present. This prevents a safe data export
and restore today; it does not indicate data loss or a failed migration.
