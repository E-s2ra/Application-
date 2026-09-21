# New Conversation Handoff — Security / Coins / Playback / Web

Project: `/new-folder`

Important: **Do not commit or push unless the user explicitly asks.**

## Goal

Finish the backend/security work for the streaming app, then run the real app on web and smoke-test the main flows.

The intended product behavior is:

- Locked movies/episodes require coins unless the user has active VIP.
- Unlocks are server-authoritative and expire after 7 days.
- Rewarded ads only grant coins after verified AdMob SSV callbacks.
- Raw video URLs / storage keys must never be readable from normal client SQL queries.
- Playback must only return a playable URL after auth + active device session + entitlement/VIP checks.
- Admin catalog/media operations must be server-side and admin-verified.

## Already Completed and Deployed

### Coin / entitlement security

- `media_entitlements` created and live.
- `unlock_media_with_coins_v2(uuid, integer)` is live and server-prices content from the catalog/category.
- Old client-controlled unlock RPCs are revoked from normal users.
- Signed-in unlock state is synced from `media_entitlements` rather than trusted local state.
- Unlock validity remains 7 days.

### Rewarded ads

- `rewarded_ad_sessions` is live.
- `create_rewarded_ad_session()` is client-callable for authenticated users.
- `credit_verified_rewarded_ad()` is service-role-only.
- Reward is fixed server-side at +12 coins / +50 XP.
- `admob-ssv` Edge Function is deployed and live.
- Client-side fallback coin minting was removed.
- Real spendable ad coins require a verified provider SSV callback.

### Playback / raw media security

- `stream-playback` is deployed as **version 4** with JWT verification enabled.
- It validates:
  - JWT user
  - active device session
  - target media
  - requested episode for series
  - active VIP or matching unexpired entitlement
- It resolves the exact requested episode server-side.
- `video_url`, `video_asset_key`, and `episode_links` are no longer readable by `anon` or `authenticated`.
- Anonymous/authenticated clients can no longer insert/update/delete `anime` rows.
- Safe catalog metadata remains readable.
- Existing external video was migrated into a private Supabase Storage bucket.
- Private bucket: `videos-private`
- Bucket is private, 50 MiB per object.
- Database currently has **zero external HTTPS media locators** for the migrated catalog data.
- Signed URL generation for the private object was verified.

### Admin media pipeline

- `admin-operations` Edge Function is deployed as **version 7** with JWT verification enabled.
- Admin add/update/delete now routes through the Edge Function rather than direct client catalog mutation.
- Admin-only private media read action was added for edit screens.
- Episode links are preserved/validated server-side.
- Old private video fields cached in local admin overrides are scrubbed from storage.

### Profile/sidebar freeze

- Mobile sidebar/profile freeze was fixed.
- Sidebar now uses explicit rendered/open state rather than private animated `_value` state.
- Closing overlay no longer intercepts input.
- Sidebar closes before route navigation.
- A Pixel 5 Playwright smoke test previously passed: sidebar -> Profile -> Favorites.

### Validation already passed

- `npm run typecheck` passes.
- Targeted ESLint has no errors; some pre-existing warnings remain in admin/reward UI files.
- `git diff --check` passed previously.
- Independent live checks confirmed:
  - safe catalog reads work
  - raw media columns return permission denied
  - anon update/delete returns permission denied
  - old reward/unlock RPCs return permission denied
  - unauthenticated `stream-playback` returns 401
  - `admob-ssv` is reachable

## Live Supabase Migrations / Versions

Local filenames were aligned with the versions actually recorded remotely:

- `supabase/migrations/20260920150555_harden_vip_security.sql`
- `supabase/migrations/20260920150608_secure_coin_entitlements.sql`
- `supabase/migrations/20260920152445_lock_down_media_locators.sql`

Live Edge Functions:

- `admin-operations` — v7 — ACTIVE — JWT verification enabled
- `stream-playback` — v4 — ACTIVE — JWT verification enabled
- `admob-ssv` — deployed/live

## CRITICAL Remaining Security Work

These were found in the final live Supabase audit and are **not yet fixed**.

### 1. HIGH — Public VIP grant RPC

`public.admin_grant_vip_by_identifier(text, integer)` is live as `SECURITY DEFINER` and executable by `PUBLIC`, `anon`, and `authenticated` without a reliable admin guard in the live definition.

Impact: a caller can grant VIP to arbitrary users if they know an email/username/UUID.

Required fix:

- Rewrite the function with a strict `public.is_admin()` guard, or make it service-role-only.
- Revoke from `PUBLIC`, `anon`, and ordinary `authenticated` users unless the function itself performs a strong admin check.
- Recheck `admin_grant_vip(uuid, integer)` as well.

### 2. HIGH — Entire profiles table anonymously readable

Live Supabase currently allows anonymous full-table `SELECT` on `profiles` through an old `profiles_select_public` policy / table grant.

Exposed fields include email, role, coins, XP, VIP state, unlocked media IDs, and anomaly/security fields.

Required fix:

- Revoke table-level anon `SELECT`.
- Keep anonymous access to only minimal public columns if social/profile discovery needs it, e.g. `id`, `username`, `full_name`, `avatar_url`.
- Authenticated users should read their own full profile, not everyone’s full profile.

### 3. MEDIUM — Signup can write `role='admin'` from user-controlled name text

The live `handle_new_user()` trigger can mark a new profile as admin if user-controlled username/full name contains strings like `admin` / `esra`.

Current DB `is_admin()` logic prevents this from directly authorizing the main admin RPCs, but it corrupts authoritative role data and is dangerous for client-side checks/future code.

Required fix:

- Rewrite `handle_new_user()` so new users always get normal user role.
- Admin assignment must happen only through an explicit privileged admin path.

### 4. HIGH — Watch XP RPC can be spammed

`record_watch_time_reward(integer)` is `SECURITY DEFINER` and callable by authenticated clients with no proof-of-watch, elapsed-time binding, rate limit, or per-period cap.

Impact: users can spam XP/levels directly.

Required fix:

- Prefer revoking client EXECUTE entirely and award watch XP only from trusted playback/session telemetry.
- If keeping client invocation, add durable server-side session/time accounting and rate limits tied to a valid playback/device session.

### 5. MEDIUM — Direct inserts into reward/evidence tables

Authenticated users can still directly insert rows into some evidence/entitlement tables:

- `daily_logins`
- `user_themes`
- `user_badges`
- `vip_transactions`

Impact:

- fake login/streak evidence
- unlock paid themes without spending coins
- self-award badges
- forge VIP/payment/history records

Required fix:

- Revoke `INSERT`, `UPDATE`, `DELETE` from authenticated users on these tables unless a specific direct client write is genuinely required.
- Keep own-row `SELECT` where needed.
- Make trusted RPCs / service-role backend the only writer.

### 6. Functional bug — coin VIP activation value mismatch

Live `vip_transactions.type` constraint allows:

- `ad_reward`
- `coins_purchase`
- `spin_reward`
- `event_bonus`
- `subscription`

But one `activate_vip_with_coins` definition inserts `coin_purchase` (singular), which causes the transaction to fail/roll back.

Required fix:

- Use `coins_purchase` consistently.
- Re-test coin-based VIP activation end-to-end.

### 7. Supabase Auth config

Supabase security advisor reports leaked-password protection is disabled.

Required fix:

- Enable compromised/leaked password protection in Supabase Auth settings if available for the plan/project.

## Remaining Backend Hardening / Cleanup

### Admin Edge Function CORS

`admin-operations` currently treats a rejected origin as `null`, then responds with `Access-Control-Allow-Origin: *` through the fallback.

This does not bypass JWT/admin authorization by itself, but defeats the intended web-origin allowlist.

Fix:

- When `ALLOWED_WEB_ORIGINS` is configured and the request origin is not allowed, return 403 or omit ACAO.
- Do not fall back to `*` for disallowed origins.

### ADMIN_EMAIL fallback

`admin-operations` has a hardcoded fallback admin email if the environment variable is missing.

Safer production behavior:

- Require `ADMIN_EMAIL` from environment or rely entirely on a hardened DB admin role check.
- Avoid silently falling back to a baked-in email in production.

### Private bucket migration history

An older historical migration creates `videos-private` with a 2 GiB object size limit, which is too large for the current Supabase project configuration.

The live bucket was successfully created manually with a 50 MiB limit.

Need a **new corrective migration** (do not rewrite already-applied historical migrations) that ensures:

- bucket exists
- `public = false`
- `file_size_limit = 52428800`
- allowed MIME types remain appropriate
- only trusted/admin backend paths can mutate storage objects

## Web QA Still Remaining

After the final security migration(s), run the real Expo web app against the actual Supabase project and smoke-test:

1. Home/catalog loads.
2. Search works.
3. Title detail/watch page loads metadata with no raw media fields in network responses.
4. Locked non-VIP title shows coin paywall.
5. Unlock spends the canonical server price and creates entitlement.
6. Playback works only after unlock / active VIP.
7. Series episode N plays episode N rather than episode 1.
8. Profile/sidebar navigation remains responsive on mobile viewport.
9. Favorites add/remove works.
10. Rewards/Tasks UI loads server-backed state.
11. Rewarded-ad web/dev fallback does not mint spendable coins.
12. Admin list loads safe metadata.
13. Admin edit loads private stream details only via `admin-operations`.
14. Admin add/edit/delete persists successfully through Edge Function.
15. Fresh browser/localStorage contains no raw private video locator data.

## Suggested Validation Commands

From `/new-folder`:

```powershell
npm run typecheck
npx eslint src/lib/admin-operations.ts src/services/media.service.ts src/app/admin/edit-anime.tsx src/app/admin/add-anime.tsx src/hooks/useGamification.tsx
git diff --check
```

Then run web using the real `.env` credentials:

```powershell
npm run web -- --port 8081
```

Do not use placeholder Supabase credentials for the final smoke pass.

## Useful Independent Permission Checks

Using the publishable client key, verify:

- safe `anime` metadata SELECT succeeds
- selecting `video_url` fails
- selecting `video_asset_key` fails
- selecting `episode_links` fails
- anon `UPDATE anime` fails
- anon `DELETE anime` fails
- legacy reward/unlock RPCs fail
- public VIP-grant RPC fails after hardening
- anon full-profile SELECT fails after hardening

## Current Working Tree Warning

The repo contains many modified/untracked files from earlier work. **Do not reset, clean, or wholesale revert the tree.** Preserve unrelated changes.

Known files from this security work include:

- `src/lib/admob.ts`
- `src/hooks/useAdMob.tsx`
- `src/hooks/useGamification.tsx`
- `src/components/RewardsHubModal.tsx`
- `src/components/Sidebar.tsx`
- `src/lib/playback.ts`
- `src/lib/admin-operations.ts`
- `src/services/media.service.ts`
- `src/app/watch.tsx`
- `src/app/admin/edit-anime.tsx`
- `supabase/functions/stream-playback/index.ts`
- `supabase/functions/admin-operations/index.ts`
- `supabase/functions/admob-ssv/`
- the three 20260920 security migrations listed above

Do not assume every other modified file belongs to this task.

## Recommended First Prompt for the New Conversation

Use this:

> Continue `/new-folder` from `SECURITY_HANDOFF.md`. Read that file first and inspect the current working tree without resetting unrelated changes. Finish every remaining HIGH/MEDIUM Supabase security issue listed there, add the corrective private-bucket migration, fix admin Edge CORS, deploy the final migrations/functions to the already connected live Supabase project, verify the exploits are closed with independent client-level checks, then run Expo web against the real Supabase project and smoke-test the major user/admin/paywall/playback/profile flows. Fix regressions you find. Do not commit or push unless I explicitly ask.

