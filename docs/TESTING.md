# TESTING & PLAYWRIGHT E2E SPECIFICATIONS

This document details the automated testing strategy, multi-viewport responsive testing matrix, inventory of Playwright E2E test suites, and the Real User Lifecycle end-to-end integration specification for AniFlix.

---

## 1. Testing Strategy & Framework

AniFlix utilizes **Playwright** for end-to-end (E2E) automated testing, cross-browser validation, and responsive layout verification on React Native Web.

- **Config File**: [`playwright.config.ts`](file:///media/akram/code4/Project/Application-/playwright.config.ts)
- **Base Server URL**: `http://localhost:8083`
- **Headless Engine**: Chromium

---

## 2. Multi-Viewport Responsive Testing Matrix

The automated Playwright suite executes tests across 5 distinct screen viewports to ensure UI consistency, zero layout clipping, and fluid responsiveness:

| Project Name | Viewport Dimensions | Target Device Category |
| :--- | :--- | :--- |
| `chromium-desktop` | `1280 x 720` | Standard Desktop Viewport |
| `mobile-small` | `375 x 667` | Small iPhone / Compact Mobile |
| `mobile-standard` | `390 x 844` | iPhone 12/13/14 / Standard Android |
| `tablet` | `768 x 1024` | iPad / Android Tablet |
| `desktop-large` | `1440 x 900` | Large Desktop / Workstation |

---

## 3. Inventory of Playwright E2E Test Suites (`tests/`)

- **`tests/auth/auth.spec.ts`**: Validates user login error handling, email/password validation, sign-up form navigation, and protected route access redirects.
- **`tests/content/content-crud.spec.ts`**: Validates home feed hero carousel, real-time search queries, genre tag filters, and `EmptyState` fallbacks.
- **`tests/social/reviews-social.spec.ts`**: Tests Watch screen player loading, star rating submission (1–5 stars), and review list rendering.
- **`tests/admin/admin-panel.spec.ts`**: Verifies RBAC restrictions blocking non-admin users from accessing `/admin` and `/admin/add-anime` routes.
- **`tests/responsive/responsive.spec.ts`**: Tests UI component layout bounds and responsiveness across all 5 screen size breakpoints.
- **`tests/lifecycle/user-lifecycle.spec.ts`**: Full Real User Lifecycle integration test simulating end-to-end user registration, VIP application, admin approval, and VIP status elevation.

---

## 4. Real User Lifecycle E2E Integration Workflow

The Real User Lifecycle test (`tests/lifecycle/user-lifecycle.spec.ts`) simulates a complete real-world user journey without mock database injection:

```text
STEP 1: USER REGISTRATION
  └─ Registers a new test user (e2e_user_<timestamp>@gmail.com) via the /signup UI.

STEP 2: PRE-VIP PROFILE VERIFICATION
  └─ Navigates to /(tabs)/profile and verifies user status is "STANDARD STREAMER".

STEP 3: ADMIN AUTHENTICATION
  └─ Signs out standard user session and logs in as Admin Sovereign (esra99san@gmail.com).

STEP 4: ADMIN VIP ELEVATION
  └─ Navigates to /admin panel, submits target user email, and grants 30-Day VIP status via Edge Function.

STEP 5: USER RE-AUTHENTICATION
  └─ Signs out Admin session and logs back in as the original test user.

STEP 6: VIP SOVEREIGN STATUS UNLOCK
  └─ Navigates to /(tabs)/profile and confirms status updated to "VIP SOVEREIGN · ACTIVE".
```

---

## 5. Test Execution Commands

```bash
# Execute all Playwright E2E test suites across viewports
npx playwright test

# Execute the Real User Lifecycle E2E test specifically
npx playwright test tests/lifecycle/user-lifecycle.spec.ts --project=chromium-desktop

# Open Playwright interactive HTML test report
npx playwright show-report
```
