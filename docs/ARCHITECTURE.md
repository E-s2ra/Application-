# ARCHITECTURE DOCUMENTATION

This document describes the high-level architecture, directory layout, routing structure, authentication flow, authorization rules, and data layer of the AniFlix application.

---

## 1. System Architecture Overview

```text
               ┌──────────────────────────────────────────┐
               │    React Native Web / Expo Router UI     │
               └────────────────────┬─────────────────────┘
                                    │
               ┌────────────────────▼─────────────────────┐
               │         Service & Hook Layer             │
               │  (MediaService, VipService, useAuth, ...)│
               └────────────────────┬─────────────────────┘
                                    │
               ┌────────────────────▼─────────────────────┐
               │         Supabase Client SDK              │
               └────────────────────┬─────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       │                            │                            │
┌──────▼────────┐           ┌───────▼────────┐          ┌────────▼─────────┐
│ Cloud Postgres│           │ Auth & Storage │          │ Edge Functions   │
│  (RLS Rules)  │           │   (Sessions)   │          │ (admin-operations│
└───────────────┘           └────────────────┘          └──────────────────┘
```

---

## 2. Directory Layout & Layer Responsibilities

- **`src/app/`**: Expo Router screens following file-based routing convention.
- **`src/components/`**: Presentation UI components (modals, video players, navigation header, reviews section).
- **`src/services/`**: Encapsulated data layer API abstractions (`MediaService`, `ReviewsService`, `VipService`).
- **`src/hooks/`**: Custom hooks for global app state (`useAuth`, `useFavorites`, `useGamification`).
- **`src/lib/`**: Supabase client initialization (`supabase.ts`), i18n translation engine (`translations.ts`), and Edge Function RPC callers (`admin-operations.ts`).
- **`src/types/`**: Shared TypeScript definitions (`index.ts`).

---

## 3. Expo Router Layout & Navigation

### App Route Structure

| Route | Access Guard | Description |
| :--- | :--- | :--- |
| `/(tabs)/index` | Public / User | Home feed with hero slider, categories, and media catalog |
| `/(tabs)/search` | Public / User | Real-time catalog search & genre filters |
| `/(tabs)/favorites` | User (Auth Guard) | Bookmarked favorites list |
| `/(tabs)/profile` | User (Auth Guard) | User profile, XP level, daily streak, and VIP Sovereign status |
| `/(auth)/login` | Public | Authentication sign in screen |
| `/(auth)/signup` | Public | New user registration form |
| `/watch` | Public / User | Video streaming player screen |
| `/admin` | Admin Only | Admin Panel (Media Catalog, VIP Approvals, Analytics) |
| `/admin/add-anime` | Admin Only | Add new media item form |
| `/admin/edit-anime` | Admin Only | Edit existing media item form |

---

## 4. Authentication Architecture

- **Engine**: Supabase Auth (`supabase.auth.signUp`, `signInWithPassword`, `signOut`, `getSession`).
- **Session Persistence**: Managed automatically via `AsyncStorage` on mobile and `localStorage` on Web.
- **Auth Guard**: Unauthenticated users trying to access protected screens (`/profile`, `/favorites`, `/admin`) are redirected to `/(auth)/login`.

---

## 5. Role-Based Access Control (RBAC)

The application enforces a strict role hierarchy:

```text
GUEST ──► NORMAL USER ──► VIP SOVEREIGN ──► ADMIN
```

1. **Guest**: Public browsing, searching catalog, viewing public trailer/player interface.
2. **Normal User**: Account profile, bookmarking favorites, leaving reviews, daily rewards.
3. **VIP Sovereign**: Exclusive VIP video streams, VIP review badge, priority streaming access.
4. **Admin**: Restricted to `esra99san@gmail.com` or users with `role === 'admin'`. Direct access to `/admin` dashboard, catalog CRUD, and instant VIP elevation via Edge Functions.

---

## 6. Data Layer & Security (Supabase)

- **PostgreSQL Database**: Tables for `anime`, `reviews`, `favorites`, `payments`, and `profiles`.
- **Row Level Security (RLS)**: Enforced at the database level to ensure users can only modify their own profiles, favorites, and reviews.
- **Edge Functions (`admin-operations`)**: Serverless function executing privileged admin actions (`grant_vip`, catalog sync) using the Supabase Service Role key securely.
