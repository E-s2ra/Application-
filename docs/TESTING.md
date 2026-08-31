# TESTING & PLAYWRIGHT E2E SPECIFICATIONS

This document outlines the testing strategy, test suite structure, multi-viewport responsive matrix, and the Real User Lifecycle E2E test workflow.

---

## 1. Testing Strategy & Framework

AniFlix utilizes **Playwright** for automated end-to-end (E2E) functional, regression, and responsive testing on React Native Web.

- **Config File**: [`playwright.config.ts`](file:///media/akram/code4/Project/Application-/playwright.config.ts)
- **Base URL**: `http://localhost:8083`
- **Browsers**: Chromium Headless

---

## 2. Multi-Viewport Responsive Matrix

The Playwright suite executes across 5 distinct viewports to guarantee mobile responsiveness and zero layout clipping:

| Project Name | Viewport Dimensions | Target Device Category |
| :--- | :--- | :--- |
| `chromium-desktop` | `1280 x 720` | Standard Desktop Viewport |
| `mobile-small` | `375 x 667` | Small iPhone / Compact Mobile |
| `mobile-standard` | `390 x 844` | iPhone 12/13/14 / Android Standard |
| `tablet` | `768 x 1024` | iPad / Android Tablet |
| `desktop-large` | `1440 x 900` | Large Desktop / Workstation |

---

## 3. Test Suite Inventory (`tests/`)

- **`tests/auth/auth.spec.ts`**: Login error handling, input validation, signup form navigation, auth redirects.
- **`tests/content/content-crud.spec.ts`**: Home page headers, search queries, EmptyState fallbacks, category filters.
- **`tests/social/reviews-social.spec.ts`**: Watch player stream loading, review creation, rating display.
- **`tests/admin/admin-panel.spec.ts`**: Non-admin RBAC restriction, direct route protection (`/admin`, `/admin/add-anime`).
- **`tests/responsive/responsive.spec.ts`**: Responsiveness validation across all screen width breakpoints.
- **`tests/lifecycle/user-lifecycle.spec.ts`**: Real User Lifecycle end-to-end integration test.

---

## 4. Real User Lifecycle E2E Workflow

The Real User Lifecycle test (`tests/lifecycle/user-lifecycle.spec.ts`) verifies the end-to-end business flow using real application UI without artificial database state hacks:

```text
STEP 1: REGISTRATION
  └─ Registers fresh user (e2e_user_<timestamp>@gmail.com) via /signup UI.

STEP 2: PRE-VIP VERIFICATION
  └─ Navigates to /(tabs)/profile and verifies user status is "STANDARD STREAMER".

STEP 3: ADMIN AUTHENTICATION
  └─ Clears user session and logs in as Admin (esra99san@gmail.com).

STEP 4: ADMIN VIP GRANT
  └─ Opens /admin panel, submits target email, and grants 30-Day VIP access via Edge Function.

STEP 5: USER RE-LOGIN
  └─ Clears Admin session and re-authenticates as original user.

STEP 6: VIP SOVEREIGN UNLOCK
  └─ Navigates to /(tabs)/profile and confirms status updated to "VIP SOVEREIGN · ACTIVE".
```

---

## 5. Test Execution Commands

```bash
# Execute full Playwright test suite
npx playwright test

# Execute Real User Lifecycle test
npx playwright test tests/lifecycle/user-lifecycle.spec.ts --project=chromium-desktop

# Open Playwright HTML Report
npx playwright show-report
```
