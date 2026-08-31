# PRODUCTION DEPLOYMENT GUIDE

This guide details the production deployment process for the AniFlix Web application, Cloud Supabase infrastructure, and Edge Functions.

---

## 1. Web Production Build

1. Build static production bundle using Expo Router:
   ```bash
   npx expo export -p web
   ```
2. The output static bundle is generated inside the `dist/` directory.
3. Deploy `dist/` to any static web hosting platform (Vercel, Netlify, Cloudflare Pages, Firebase Hosting).

---

## 2. Cloud Supabase Configuration

### Environment Variables Matrix

Ensure production environment variables are configured on your hosting provider:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
EXPO_PUBLIC_ADMIN_EMAIL=esra99san@gmail.com
```

### Edge Functions Deployment

Deploy the `admin-operations` Edge Function to handle privileged admin RPCs:

```bash
# Deploy Edge Function using Supabase CLI
npx supabase functions deploy admin-operations --no-verify-jwt
```

Ensure secrets are configured in Supabase Dashboard:
- `SUPABASE_SERVICE_ROLE_KEY`: Service role secret key for RLS elevation.
- `RASEDI_SECRET_KEY`: Production RASEDI payment API key.

---

## 3. Pre-Deployment Quality Checklist

- [x] `npx tsc --noEmit` returns **0 type errors**.
- [x] All 64 Playwright E2E tests pass cleanly.
- [x] Production environment variables verified (no localhost URLs).
- [x] Supabase Row Level Security (RLS) enabled on all database tables.
