# WEB FEATURE TEST PLAN & MATRIX

This document details the complete feature inventory, user role permissions, CRUD matrices, database/Edge Function dependencies, test cases, and potential failure points for the AniFlix Web Application.

---

## 1. Authentication & Session Management
- **Route / Page**: `/(auth)/login`, `/(auth)/signup`, `/(auth)/forgot-password`, `/reset-password`
- **User Role**: Guest / Authenticated User / Admin
- **Dependencies**: Supabase Auth (`supabase.auth.signUp`, `supabase.auth.signInWithPassword`, `supabase.auth.signOut`)
- **Actions**:
  - **Create**: User registration with email, password, and full name.
  - **Read**: Check active auth session state (`supabase.auth.getSession`).
  - **Update**: Reset password link and password update.
  - **Delete**: Sign out session clearance (`AsyncStorage` / `LocalStorage`).
- **Test Cases**:
  1. Valid registration creates profile row and sets session.
  2. Invalid email or short password displays validation error.
  3. Sign in with correct credentials navigates to Home tab.
  4. Sign in with wrong credentials displays error message.
  5. Unauthenticated access to protected route `/(tabs)/profile` redirects to Login.
- **Potential Failure Points**: Auth network timeouts, invalid Supabase key in `.env`, stale token in localStorage.

---

## 2. User Profile & Avatar Customization
- **Route / Page**: `/(tabs)/profile`
- **User Role**: Authenticated User
- **Dependencies**: `profiles` Supabase Table (`id`, `full_name`, `avatar_url`, `is_vip`, `role`, `updated_at`)
- **Actions**:
  - **Create**: Auto-created on user signup trigger.
  - **Read**: Fetch profile details, XP level, Coins, Streak, Favorites count.
  - **Update**: Edit username modal, change avatar icon.
  - **Delete**: N/A (Account deletion restricted).
- **Test Cases**:
  1. Profile screen renders username, avatar, level title, and stat boxes cleanly.
  2. Clicking "Edit Profile" opens modal to update display name.
  3. Avatar grid allows selection of new avatar.
  4. Level title and XP progress bar calculate correctly (300 XP = 1 Level).
- **Potential Failure Points**: RLS permission block on `profiles` update, missing profile row fallback.

---

## 3. Media Content Catalog & Cinema Player
- **Route / Page**: `/(tabs)/index`, `/(tabs)/search`, `/watch`
- **User Role**: Guest / Authenticated User / VIP / Admin
- **Dependencies**: `anime` table, `episode_links` table, `DEFAULT_CATALOG` fallback constant.
- **Actions**:
  - **Create**: Add new anime title & video URLs (Admin only).
  - **Read**: Fetch featured carousel, category rails, search query matching, episode streaming player.
  - **Update**: Edit title, description, category, poster image, episode links (Admin only).
  - **Delete**: Remove media item from catalog (Admin only).
- **Test Cases**:
  1. Homepage loads hero banner and category rails (`Anime Series`, `Movies`, `K-Drama`, `Drama`).
  2. Search screen filters media items in real-time by search query, category, and genre.
  3. Empty query filter with no matching items renders `EmptyState` component.
  4. Cinema watch page (`/watch?id=...`) loads video player and episode selection buttons.
- **Potential Failure Points**: Invalid video stream URL, search regex mismatch, empty database state.

---

## 4. Reviews & Rating System
- **Route / Page**: `/watch` (Reviews Section Component)
- **User Role**: Authenticated User / Guest
- **Dependencies**: `reviews` Supabase table (`id`, `anime_id`, `user_id`, `user_name`, `user_avatar`, `rating`, `comment`, `is_vip`, `created_at`)
- **Actions**:
  - **Create**: Submit star rating (1–5) & written review comment.
  - **Read**: Fetch reviews sorted by date, calculate average rating.
  - **Update**: Edit own review comment.
  - **Delete**: Delete own review comment.
- **Test Cases**:
  1. Submitting review increases total review count and updates average rating.
  2. User can only edit or delete their own review (`rev.userId === currentUserId`).
  3. VIP badge appears next to VIP user review submissions.
  4. Author username is truncated with `numberOfLines={1}` on narrow viewports.
- **Potential Failure Points**: Missing `anime_id` foreign key, unauthenticated submit attempts.

---

## 5. Favorites / Bookmarks
- **Route / Page**: `/(tabs)/favorites`, `/watch`, `/(tabs)/search`
- **User Role**: Authenticated User
- **Dependencies**: `favorites` table, `@react-native-async-storage/async-storage` local backup.
- **Actions**:
  - **Create**: Tap Heart icon on Media Card or Watch screen to add to favorites.
  - **Read**: Fetch user's favorited items list on `/(tabs)/favorites`.
  - **Update**: N/A.
  - **Delete**: Tap Heart icon again to remove from favorites.
- **Test Cases**:
  1. Tapping Heart on media card toggles favorite status.
  2. Favorited items appear immediately on Favorites tab.
  3. Removing item from Favorites tab removes item card and shows EmptyState if list becomes empty.
- **Potential Failure Points**: Local storage sync mismatch, duplicate primary keys.

---

## 6. Social Follow System
- **Route / Page**: `/watch` (Reviews Section), Profile
- **User Role**: Authenticated User
- **Dependencies**: `follows` table (`follower_id`, `following_id`, `created_at`)
- **Actions**:
  - **Create**: Follow reviewer / user.
  - **Read**: Check following status (`isFollowing(userId)`).
  - **Delete**: Unfollow user.
- **Test Cases**:
  1. Tapping "Follow" button on review item changes state to "Following".
  2. Profile screen updates "Following" stat count.
- **Potential Failure Points**: Self-follow attempt, database constraint error.

---

## 7. Search & Catalog Filtering
- **Route / Page**: `/(tabs)/search`
- **User Role**: Guest / Authenticated User
- **Dependencies**: `anime` table query, `selectedCategory`, `selectedGenre`.
- **Actions**:
  - **Read**: Real-time filtering by search text input, category pills, and genre dropdown.
- **Test Cases**:
  1. Typing title string matches matching media items.
  2. Selecting category pill ("Movies", "Anime Series", "K-Drama") filters cards accordingly.
  3. Searching non-existent keyword displays "No Results Found" EmptyState.
- **Potential Failure Points**: Special character regex crash, unhandled state delay.

---

## 8. Settings & Localization System
- **Route / Page**: Header bar, Profile, Modals
- **User Role**: All Users
- **Dependencies**: `useLanguage` hook (`en` / `ku` translations), `useTheme` design tokens.
- **Actions**:
  - **Read**: Retrieve current language preference.
  - **Update**: Toggle language between English and Kurdish (Sorani).
- **Test Cases**:
  1. Tapping language toggle updates UI strings dynamically (e.g., "Favorites" ↔ "دڵخوازەکان").
  2. Language preference persists across session reloads.
- **Potential Failure Points**: Missing translation keys, string overflow in Kurdish.

---

## 9. Gamification & Rewards Hub
- **Route / Page**: Modals (`RewardsHubModal`), Profile Header
- **User Role**: Authenticated User
- **Dependencies**: `useGamification` hook (`streak`, `coins`, `spinWheel`, `xp`, `badges`)
- **Actions**:
  - **Create**: Spin Lucky Wheel for daily coins reward.
  - **Read**: View daily streak progress, claimable missions, unlocked badges.
  - **Update**: Claim mission reward (+50 Coins, +100 XP), increment daily streak.
- **Test Cases**:
  1. Opening Rewards Hub displays Coins balance, Streak count, and Mission tasks.
  2. Claiming completed mission increases Coins and XP instantly.
  3. Lucky Wheel spin triggers rotation animation and awards random reward.
- **Potential Failure Points**: Multi-claim exploit, streak timer calculation error.

---

## 10. VIP Sovereign System
- **Route / Page**: `VipSubscriptionModal`, `/vip-success`, `/fib-payment`
- **User Role**: Authenticated User / Admin
- **Dependencies**: `payments` table (`user_id`, `plan_id`, `amount_iqd`, `status`, `metadata`), Edge Function `admin-operations` (`grant_vip`).
- **Actions**:
  - **Create**: Submit manual payment proof (ZainCash / FastPay / FIB voucher) for VIP activation.
  - **Read**: Check VIP membership badge (`is_vip`, `vip_until`).
  - **Update**: Admin approves payment proof or grants instant VIP.
- **Test Cases**:
  1. Non-VIP user clicking VIP badge opens `VipSubscriptionModal`.
  2. Selecting plan displays payment reference instructions.
  3. VIP users display golden VIP Crown badge and get access to exclusive content.
- **Potential Failure Points**: Payment reference validation failure, expired VIP badge calculation.

---

## 11. Admin Management Panel
- **Route / Page**: `/admin`, `/admin/add-anime`, `/admin/edit-anime`
- **User Role**: Admin (`role === 'admin'` or `email === 'esra99san@gmail.com'`)
- **Dependencies**: Edge Function `admin-operations` (`action`, `payload`), `supabase.rpc`.
- **Actions**:
  - **Create**: Add new media item with poster URL & episode links.
  - **Read**: View full media catalog list, view pending VIP payment approvals.
  - **Update**: Edit existing media item details, approve/reject pending VIP payment proofs, grant instant VIP access.
  - **Delete**: Delete media item, clear all media catalog.
- **Test Cases**:
  1. Non-admin user accessing `/admin` is redirected away.
  2. Admin can fill form on `/admin/add-anime` and publish new title.
  3. Admin can enter user email on `/admin` and grant 30-day VIP access instantly.
  4. Admin can approve pending VIP payment transfer, activating user's VIP status.
- **Potential Failure Points**: Missing admin auth header, Edge Function secret mismatch.

---

## 12. Role-Based Access Control (RBAC) Matrix

| Route / Feature | Guest | Normal User | VIP User | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Home (`/(tabs)`)** | Read | Read | Read | Read |
| **Search (`/(tabs)/search`)** | Read | Read | Read | Read |
| **Watch (`/watch`)** | Standard Stream | Standard Stream | VIP Streams | Full Control |
| **Favorites (`/(tabs)/favorites`)** | Redirect | Full Access | Full Access | Full Access |
| **Profile (`/(tabs)/profile`)** | Redirect | Full Access | Full Access | Full Access |
| **Admin Panel (`/admin`)** | Denied | Denied | Denied | **Full Access** |
| **Add/Edit Media** | Denied | Denied | Denied | **Full Access** |
| **Grant VIP Edge Function** | Denied | Denied | Denied | **Full Access** |

---

## 13. Multi-Viewport Layout Integrity Matrix

| Viewport | Preset | Key Visual Checks |
| :--- | :--- | :--- |
| **375 × 667** | Small Mobile | No horizontal scroll, stat boxes wrap, buttons visible. |
| **390 × 844** | Standard Mobile | Navigation tab bar inset, card grid 2-columns. |
| **768 × 1024** | Tablet | Responsive 3-column media grid, centered modals. |
| **1440 × 900** | Desktop | Centered `maxContentWidth` container, header expanded. |

---

## 14. Console & Network Integrity
- Zero uncaught JS runtime exceptions.
- Zero hydration errors on Web.
- Suppressed non-critical network fallbacks.
