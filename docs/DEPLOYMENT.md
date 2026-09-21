# PRODUCTION DEPLOYMENT GUIDE

This document details the step-by-step production build export, static web hosting deployment, Cloud Supabase database migrations, and Edge Functions deployment for AniFlix.

---

## 1. Web Production Build & Export

AniFlix compiles into an optimized static Single Page Application (SPA) using Expo Router's web exporter:

### 1. Execute Production Export Command
```bash
npx expo export -p web
```

### 2. Output Verification
- The build engine generates static HTML, JS, CSS, and asset bundles inside the `dist/` directory.
- Verify that `dist/index.html` and static assets are created cleanly.

---

## 2. Static Web Hosting Deployment Options

The exported `dist/` directory can be deployed to any modern static hosting platform:

### Vercel Deployment
```bash
npx vercel --prod dist
```

### Netlify Deployment
```bash
npx netlify deploy --prod --dir=dist
```

### Cloudflare Pages / Firebase Hosting / Nginx Docker
- Configure the publish directory as `dist`.
- Set rewrite rules so all requests route to `/index.html` (Single Page Application routing).

---

## 3. Cloud Supabase Infrastructure Configuration

### Environment Variables Matrix

Ensure production environment variables are properly configured in your deployment platform settings:

```env
# Production Supabase Cloud Credentials
EXPO_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-production-public-key-here

# Admin setup is server-side only. Do not expose the admin email to the client.
```

### Database Row-Level Security (RLS) Checklist
- Ensure RLS is enabled on client-facing tables including `anime`, `profiles`, `favorites`, `comments`, `notifications`, `media_entitlements`, and `wallet_ledger`.
- Verify that the latest wallet/auth migrations are applied and legacy client coin/unlock RPCs remain revoked.

### Deploying Edge Functions (`admin-operations`)

Deploy the serverless Edge Function to handle privileged administrative operations (e.g., instant VIP elevation, catalog sync):

```bash
# Deploy privileged functions with JWT verification enabled (the default).
npx supabase functions deploy admin-operations
npx supabase functions deploy stream-playback
npx supabase functions deploy admob-ssv --no-verify-jwt

# Username login is intentionally unauthenticated because it establishes a session.
# Its verify_jwt=false setting lives in supabase/config.toml.
npx supabase functions deploy username-login
```

Set required production secrets in the Supabase Dashboard:
- `SUPABASE_SECRET_KEY`: Server-only Supabase secret key. Never expose it to Expo/client code.
- `RASEDI_SECRET_KEY`: Production payment verification key for RASEDI payment gateway integrations.
- `ALLOWED_WEB_ORIGINS`: Comma-separated production web origins allowed to call browser-accessible Edge Functions.

---

## 4. Pre-Flight Production Launch Checklist

- [x] **Type Safety**: `npx tsc --noEmit` completes with zero type errors across core components.
- [ ] **Automated Testing**: Run the relevant Playwright smoke suite across desktop and mobile viewports.
- [ ] **Environment Variables**: Confirm production origins, Supabase keys, AdMob IDs, and server-only secrets.
- [ ] **Security Audit**: Verify direct sensitive writes are revoked, raw media columns are unreadable to clients, and displaced sessions cannot use economy/playback paths.
- [ ] **Bilingual i18n Verification**: Test English and Kurdish Sorani layout direction on the production export.
