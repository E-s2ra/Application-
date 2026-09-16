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
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key-here

# Sovereign Admin Configuration
EXPO_PUBLIC_ADMIN_EMAIL=esra99san@gmail.com
```

### Database Row-Level Security (RLS) Checklist
- Ensure RLS is enabled on all tables: `anime`, `profiles`, `favorites`, `reviews`, `payments`.
- Verify that `unlock_media_with_coins` is configured with `SECURITY DEFINER` privileges on PostgreSQL.

### Deploying Edge Functions (`admin-operations`)

Deploy the serverless Edge Function to handle privileged administrative operations (e.g., instant VIP elevation, catalog sync):

```bash
# Deploy admin-operations Edge Function using Supabase CLI
npx supabase functions deploy admin-operations --no-verify-jwt
```

Set required production secrets in the Supabase Dashboard:
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase secret key for Service Role elevation.
- `RASEDI_SECRET_KEY`: Production payment verification key for RASEDI payment gateway integrations.

---

## 4. Pre-Flight Production Launch Checklist

- [x] **Type Safety**: `npx tsc --noEmit` completes with zero type errors across core components.
- [x] **Automated Testing**: Playwright E2E suite passes across desktop, tablet, and mobile viewports.
- [x] **Environment Variables**: Confirmed production URLs (no `localhost` or staging strings).
- [x] **Security Audit**: Verified that direct profile balance writes are revoked and database RPCs are active.
- [x] **Bilingual i18n Verification**: Tested English and Kurdish Sorani toggling on live build.
