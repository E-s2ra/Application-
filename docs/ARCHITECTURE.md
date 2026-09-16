# SYSTEM ARCHITECTURE & TECHNICAL SPECIFICATIONS

This document outlines the high-level architecture, directory anatomy, routing structure, authentication flow, role-based access control (RBAC), data security layer, database RPC integrity, and media streaming engine of the AniFlix application.

---

## 1. High-Level System Architecture

```text
 ┌───────────────────────────────────────────────────────────────────┐
 │               React Native Web / Expo Router UI Layer             │
 │    (App Screens, Responsive Breakpoints, Custom UI Components)    │
 └─────────────────────────────────┬─────────────────────────────────┘
                                   │
 ┌─────────────────────────────────▼─────────────────────────────────┐
 │                       Service & Hook Layer                        │
 │   (MediaService, VipService, ReviewsService, useAuth, Gamification)│
 └─────────────────────────────────┬─────────────────────────────────┘
                                   │
 ┌─────────────────────────────────▼─────────────────────────────────┐
 │                      Supabase Client SDK                          │
 └─────────────────────────────────┬─────────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
 ┌──────▼──────────┐      ┌────────▼─────────┐      ┌─────────▼─────────┐
 │ Cloud Postgres  │      │  Auth & Storage  │      │  Edge Functions   │
 │ (RLS & RPCs)    │      │ (JWT Sessions)   │      │(admin-operations) │
 └─────────────────┘      └──────────────────┘      └───────────────────┘
```

---

## 2. Directory Layout & Architecture Layers

The codebase follows a modular, feature-owned layer separation designed to scale cleanly across web and native mobile runtime environments:

- **`src/app/`**: Expo Router screens following file-based routing conventions (`index.tsx`, `search.tsx`, `favorites.tsx`, `profile.tsx`, `watch.tsx`, `/admin`).
- **`src/features/`**: Feature-owned domain logic, modals, and business workflows (Auth, Media, Rewards, VIP).
- **`src/components/`**: Reusable presentation components (Header, Video Players, Badges, Modals, Category Rails).
- **`src/services/`**: Encapsulated data access abstractions (`MediaService`, `ReviewsService`, `VipService`). UI components must consume data via services rather than raw inline queries.
- **`src/hooks/`**: Global state hooks (`useAuth`, `useFavorites`, `useGamification`, `useLanguage`).
- **`src/lib/`**: System infrastructure (`supabase.ts`, `i18n/translations.ts`, `admin-operations.ts`).
- **`src/types/`**: Centralized TypeScript interface declarations (`index.ts`).
- **`src/constants/`**: Application defaults, genre mappings, and fallback assets.

---

## 3. Expo Router Navigation & Access Guard Matrix

AniFlix uses **Expo Router v4** file-based navigation with strict layout guards:

| Route | Layout File | Access Guard | Functional Description |
| :--- | :--- | :--- | :--- |
| `/(tabs)/index` | `src/app/(tabs)/_layout.tsx` | Public / User | Home feed with hero carousel, category rails, and media items |
| `/(tabs)/search` | `src/app/(tabs)/_layout.tsx` | Public / User | Real-time catalog search & multi-genre filtering |
| `/(tabs)/favorites` | `src/app/(tabs)/_layout.tsx` | User (Auth Guard) | User bookmarked favorites list |
| `/(tabs)/profile` | `src/app/(tabs)/_layout.tsx` | User (Auth Guard) | User profile, XP level, daily streak, and VIP Sovereign status |
| `/(auth)/login` | `src/app/(auth)/_layout.tsx` | Public | Authentication sign-in screen |
| `/(auth)/signup` | `src/app/(auth)/_layout.tsx` | Public | New user account registration screen |
| `/watch` | `src/app/watch.tsx` | Public / User | Video streaming player, episode switcher, and user reviews |
| `/admin` | `src/app/admin/index.tsx` | Admin Only | Administrative overview, catalog CRUD, and VIP approvals |
| `/admin/add-anime` | `src/app/admin/add-anime.tsx` | Admin Only | Add new media item form |
| `/admin/edit-anime` | `src/app/admin/edit-anime.tsx` | Admin Only | Edit existing media item form |

---

## 4. Authentication & Session Lifecycle

- **Authentication Provider**: Supabase Auth (`signUp`, `signInWithPassword`, `signOut`, `getSession`).
- **Session Persistence**: Managed automatically via `AsyncStorage` on mobile devices and `localStorage` on Web.
- **Automatic Auth Redirects**: Unauthenticated users attempting to navigate to protected routes (`/profile`, `/favorites`, `/admin`) are intercepted by layout guards and redirected to `/(auth)/login`.
- **Session Refresh**: JWT tokens are automatically refreshed in the background by `supabase.auth.onAuthStateChange`.

---

## 5. Role-Based Access Control (RBAC)

AniFlix enforces a 4-tier role hierarchy:

```text
GUEST ──► NORMAL USER ──► VIP SOVEREIGN ──► ADMIN
```

1. **Guest**: Public catalog browsing, searching, viewing trailer / public media players, language switching.
2. **Normal User**: Registered account, profile dashboard, favorites management, submitting reviews, daily streak rewards, spin wheel, coin unlocks.
3. **VIP Sovereign**: Exclusive VIP video stream access, golden crown badge on profile & reviews, ad-free streaming.
4. **Admin**: Restricted to users with `role === 'admin'` or email matching `EXPO_PUBLIC_ADMIN_EMAIL` (`esra99san@gmail.com`). Full access to `/admin` dashboard, catalog CRUD, VIP payment approvals, and Edge Function invocation.

---

## 6. Data Layer & Security Architecture

### Supabase Cloud PostgreSQL Schema
- **`anime`**: Stores media titles, genres, thumbnails, video URLs, VIP flags, coin prices, and Kurdish metadata (`title_ku`, `description_ku`).
- **`profiles`**: Stores user levels, XP, streak counters, coin balance, and VIP expiration timestamps (`is_vip`, `vip_expires_at`).
- **`favorites`**: User bookmarked media items (`user_id`, `anime_id`).
- **`reviews`**: User star ratings (1–5) and text reviews (`user_id`, `anime_id`, `rating`, `comment`).
- **`payments`**: VIP payment proof submissions (`user_id`, `method`, `receipt_url`, `status`, `duration_days`).

### Row Level Security (RLS) Policies
- All database tables have **Row Level Security (RLS) enabled**.
- Users can read public catalog data but can only create/update/delete their own `favorites`, `reviews`, and `profiles`.
- Direct table updates to sensitive `profiles` columns (e.g., balance, `is_vip`) are revoked for the `authenticated` role.

### Server-Authoritative Database RPCs (`unlock_media_with_coins`)
- **Server Enforcement**: Media coin unlocks and balance deductions execute exclusively through `SECURITY DEFINER` RPC functions on PostgreSQL.
- **No Client Fallbacks**: Direct client-side `profiles.update(...)` fallbacks are strictly prohibited to prevent client balance manipulation.

### Race Condition Guarding
- **Optimistic Lock**: The `useGamification` hook enforces an in-memory timestamp lock (`unlockingRef.current`) during unlock requests.
- **Transaction Rollback**: If the server RPC returns an error or fails validation, the optimistic state lock rolls back gracefully without mutating client state.

---

## 7. Video Streaming Engine Architecture

- **Primary Player Engine**: `expo-video` v2 (`VideoView` and `useVideoPlayer`).
- **Fallback Resolution**: If `getPlaybackUrl` returns an error or unconfigured stream, the streaming engine automatically falls back to secondary media sources (`fallbackStream`).
- **Responsive Gesture Controls**: Custom `PanResponder` implementations for volume sliders and playback seek bars, declared early in component lifecycles to prevent runtime `ReferenceError` exceptions.
- **Web Fallback Support**: Compatible web fallback rendering for standard HTML5/Video.js integration.
