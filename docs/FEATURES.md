# FEATURE REFERENCE & CRUD MATRIX

This document serves as the authoritative feature reference for AniFlix, organizing features by role and listing entity CRUD capabilities.

---

## 1. Feature Matrix by User Role

### Guest Users (Unauthenticated)
- **Catalog Browsing**: View featured hero slider, categories, and media items.
- **Search & Filtering**: Search catalog by text query or filter by genre.
- **Trailer & Cinema Player**: Open video player interface on public media items.
- **Language Switcher**: Toggle between English and Kurdish Sorani (کوردی سۆرانی).

### Normal Users (Authenticated)
- **Profile Dashboard**: View user level, XP progress, daily streak, and coin balance.
- **Favorites Management**: Add/remove media items to personal favorites list.
- **Reviews & Ratings**: Submit star ratings (1–5) and write reviews on media items.
- **Gamification & Rewards**: Claim daily streak rewards, spin lucky wheel for bonus coins.
- **VIP Application**: View VIP subscription options (FIB, ZainCash, FastPay) and submit payment proofs.

### VIP Sovereign Members
- **VIP Status Badge**: Display golden VIP Sovereign Crown badge on profile and reviews.
- **Exclusive Content Access**: Unlock exclusive VIP media streams and ad-free viewing.
- **Priority Reviews**: VIP indicator rendered on all user comments and reviews.

### Admin Users
- **Admin Dashboard (`/admin`)**: Access administrative overview and media inventory.
- **Media Catalog Management**: Add new media items, edit titles/urls/episodes, or delete catalog items.
- **VIP Approvals Panel**: Review pending payment proofs and grant instant VIP access (7d, 30d, 90d, 365d).
- **Edge Function Privileges**: Execute server-side administrative operations securely.

---

## 2. CRUD Capabilities Matrix

| Entity | Create | Read | Update | Delete | Permitted Roles | Notes |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **Media Catalog** | ✓ | ✓ | ✓ | ✓ | Admin | Managed via `/admin` and Edge Functions |
| **User Profiles** | ✓ | ✓ | ✓ | ✗ | Owner / Admin | Created on signup, updated on profile edit |
| **Favorites** | ✓ | ✓ | ✗ | ✓ | Owner | Synced to Supabase & AsyncStorage |
| **Reviews** | ✓ | ✓ | ✓ | ✓ | Owner / Admin | Users can write/edit/delete their own reviews |
| **VIP Payments** | ✓ | ✓ | ✓ | ✗ | Owner / Admin | Users create proofs; Admin approves/elevates |
| **Daily Rewards** | ✓ | ✓ | ✓ | ✗ | Owner | Daily streak reset and coin updates |

---

## 3. Localization & i18n Engine

AniFlix supports real-time language toggling without requiring page reloads:
- **English (`EN`)**: Default fallback language.
- **Kurdish Sorani (`KU`)**: Full Kurdish translations for UI buttons, category headers, navigation tabs, and media descriptions (`description_ku`).
