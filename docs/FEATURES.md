# FEATURE REFERENCE & CRUD CAPABILITY MATRIX

This document details the feature inventory for AniFlix organized by user role, entity CRUD capability matrix, and complete i18n localization coverage.

---

## 1. Feature Inventory by User Role

### 🟢 Guest Users (Unauthenticated)
- **Catalog Browsing**: Browse featured hero slider, category rails (Popular, Trending, Action, Sci-Fi), and full media catalog.
- **Search & Multi-Genre Filtering**: Real-time title search and multi-genre tag filtering.
- **Media Player & Trailer Stream**: Access trailer streams and public media playback interfaces.
- **Bilingual Language Switcher**: Dynamically toggle between English and Kurdish Sorani (کوردی سۆرانی) without reloads.

### 🔵 Normal Authenticated Users
- **Profile Dashboard**: Monitor level XP progress bar, daily streak counter, coin balance, and membership status.
- **Favorites Management**: Add or remove media titles to personal favorites (persisted to Supabase and synced locally).
- **Reviews & Ratings Engine**: Submit 1–5 star ratings and written reviews on media items; edit or delete own reviews.
- **Gamification & Rewards Hub**: Claim daily streak rewards, spin lucky wheel for coin bonuses, and earn level XP.
- **Server-Authoritative Coin Unlocks**: Unlock coin-locked premium media titles safely via `unlock_media_with_coins` RPC.
- **VIP Subscription Application**: View VIP subscription tiers (FIB, ZainCash, FastPay) and submit transaction receipt proofs for admin approval.

### 👑 VIP Sovereign Members
- **Golden Sovereign Crown Badge**: Golden VIP Sovereign badge displayed on user profile, comments, and review cards.
- **Exclusive Stream Access**: Access exclusive high-bitrate VIP media streams and ad-free playback.
- **Priority Community Reviews**: VIP indicator displayed on all published reviews across the platform.

### 🔴 Admin Sovereign Users
- **Admin Dashboard (`/admin`)**: Overview of media inventory, user analytics, and system status.
- **Media Catalog Management**: Add new media items, edit titles, poster URLs, video streams, episode links, coin costs, and delete items.
- **VIP Approvals Desk**: Review pending Iraqi payment proofs (FIB, ZainCash, FastPay) and grant instant VIP access (7d, 30d, 90d, 365d).
- **Edge Function Execution**: Trigger serverless Edge Functions (`admin-operations`) using Service Role elevation.

---

## 2. CRUD Capabilities Matrix

| Entity / Domain | Create | Read | Update | Delete | Permitted Roles | Notes & Authorization Constraints |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **Media Catalog** | ✓ | ✓ | ✓ | ✓ | Admin | Managed via `/admin` forms and Edge Functions |
| **User Profiles** | ✓ | ✓ | ✓ | ✗ | Owner / Admin | Profile created on signup; direct balance edit revoked for client |
| **Favorites** | ✓ | ✓ | ✗ | ✓ | Owner | Synced between Supabase PostgreSQL and local storage |
| **Reviews & Ratings** | ✓ | ✓ | ✓ | ✓ | Owner / Admin | Users can write/edit/delete their own reviews; Admin can clean up |
| **VIP Payments** | ✓ | ✓ | ✓ | ✗ | Owner / Admin | User creates payment proof; Admin approves and elevates role |
| **Daily Rewards** | ✓ | ✓ | ✓ | ✗ | Owner | Daily streak reset and coin updates via gamification service |
| **Media Unlocks** | ✓ | ✓ | ✗ | ✗ | Owner | Server-authoritative coin deductions via `unlock_media_with_coins` |

---

## 3. Localization & i18n Coverage Map

AniFlix features a dynamic React Context i18n engine supporting zero-reload language switching between **English (`en`)** and **Kurdish Sorani (`ku`)**:

### Dynamic Language Engine Architecture
- **Hook**: `useLanguage()` exposing `{ language, setLanguage, t }`.
- **Translations File**: [`src/lib/i18n/translations.ts`](file:///media/akram/code4/Project/Application-/src/lib/i18n/translations.ts).

### Screen & Component Translation Coverage

| Screen / Component | English (`en`) Coverage | Kurdish Sorani (`ku`) Coverage | Status |
| :--- | :--- | :--- | :--- |
| **Navigation Header** | Search, Favorites, Profile, Admin, Login, Language Toggle | گەڕان, دڵخوازەکان, پڕۆفایل, ئەدمین, چوونەژوورەوە | ✅ Complete |
| **Home Screen** | Hero Carousel, Categories, Play, Details, Trending | سلایدر, هاوپۆلەکان, پەخشکردن, زانیاریەکان, باوەکان | ✅ Complete |
| **Search Screen** | Search placeholder, Filter by genre, No results found | گەڕان لە دراما و فیلمەکان, فلتەرکردن, هیچ ئەنجامێک نەدۆزرایەوە | ✅ Complete |
| **Watch Player Screen** | Loading Media, In My List, Add to My List, Show Less, Read More, You Might Also Like | بارکردنی میدیا..., لە لیستەکەمدایە, زیاکردن بۆ لیستەکەم, کەمتر پیشان بده, زیاتر بخوێنەوە, ڕەنگە حەزت لەمەنەش بێت | ✅ Complete |
| **Rewards Hub Modal** | Daily Streak, Claim Reward, Spin Wheel, Coin Balance | دەستکەوتی ڕۆژانە, وەرگرتنی خەڵات, چەرخی بەخت, باڵانسی کۆین | ✅ Complete |
| **VIP Application Modal**| Payment Methods, Submit Proof, VIP Sovereign Benefits | ڕێگاکانی پارەدان, ناردنی بەڵگە, تایبەتمەندیەکانی ڤای ئای پی | ✅ Complete |
