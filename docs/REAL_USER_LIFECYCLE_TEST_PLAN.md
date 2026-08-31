# REAL USER LIFECYCLE E2E TEST PLAN & ARCHITECTURE

This document outlines the step-by-step E2E lifecycle test plan for a newly-created AniFlix user account, tracing the user from initial sign-up to normal feature usage, VIP restriction checks, Admin VIP elevation via Edge Functions, and subsequent VIP status & feature verification.

---

## Complete Lifecycle Flow

```text
PHASE 1: REGISTRATION (Fresh Credentials)
  │
  ├── Navigates to /signup
  ├── Fills Full Name, Email (e2e_user_<timestamp>@gmail.com), Password & Confirm Password
  └── Submits form → Account created & auto-logged in

PHASE 2: NORMAL USER FEATURE TESTING
  │
  ├── Opens Profile / Home / Search
  ├── Verifies User Details & Initial 0-Level / 0-VIP State
  ├── Tests Favorites toggle & Reviews Submission
  └── Explicitly Verifies VIP Features are LOCKED (is_vip === false)

PHASE 3: LOGOUT NORMAL USER
  │
  └── Clears auth session via Logout button

PHASE 4: ADMIN AUTHENTICATION
  │
  ├── Navigates to /login
  ├── Sign in as Admin (esra99san@gmail.com)
  └── Navigates to Admin Panel (/admin)

PHASE 5: ADMIN VIP GRANT WORKFLOW
  │
  ├── Locates exact e2e_user_<timestamp>@gmail.com in Instant VIP Grant panel
  ├── Selects 30 Days plan duration chip
  ├── Invokes Edge Function (callAdminOperation('grant_vip', ...))
  └── Verifies VIP grant success feedback

PHASE 6: LOGOUT ADMIN
  │
  └── Clears Admin session

PHASE 7: SAME USER RE-LOGIN
  │
  ├── Navigates to /login
  └── Logs in using original e2e_user_<timestamp>@gmail.com & password

PHASE 8: VIP STATUS & FEATURE UNLOCK VERIFICATION
  │
  ├── Verifies VIP Sovereign Crown Badge on Profile
  ├── Verifies is_vip === true state
  └── Tests VIP Stream access & VIP review badge rendering
```

---

## Detailed Test Matrix

| Phase | Target Role | Actions | Expected Output | Failure Risk |
| :--- | :--- | :--- | :--- | :--- |
| **1. Registration** | New User | Register with unique timestamp email | Redirect to Home / Profile with active session | Disposable email check or password rule rejection |
| **2. Normal User** | New User | Browse catalog, favorite items, write review | Actions succeed; VIP features locked | Supabase RLS error or unhandled state |
| **3. Pre-VIP Check**| New User | Verify VIP Sovereign status | `is_vip: false`, Crown badge hidden | Stale session state |
| **4. Admin Login** | Admin | Sign in with `esra99san@gmail.com` | Redirect to Admin Dashboard (`/admin`) | Auth credential error |
| **5. Admin Grant** | Admin | Enter user email in VIP Grant input and submit | Success alert "30 Days VIP Granted" | Edge Function network error or missing admin claims |
| **6. Same User Return**| Same User | Re-login with original credentials | Successful login, lands on Profile | Session overwrite |
| **7. VIP Verification**| Same User | Check profile badge & VIP actions | VIP Crown badge visible, VIP streams unlocked | DB update delay or state cache mismatch |

---

## Security & RBAC Enforcement Rules

1. **Password Enforcement**: Credentials must meet length (>=8), digit, and symbol constraints (e.g. `E2EPass123!`).
2. **User Identity Isolation**: The test MUST follow the single created email `e2e_user_<timestamp>@gmail.com` without creating dummy secondary users.
3. **No Direct DB Direct Writes**: VIP status MUST be granted via the real Admin Panel interface (`callAdminOperation('grant_vip')`), validating real API endpoints.
