# CODEBASE CLEANUP & REFACTOR AUDIT

This document records the complete architectural audit across all modules, components, services, database queries, environment configurations, and test suites in the AniFlix codebase.

---

## 1. Executive Summary & Audit Observations

1. **Service Layer Abstraction**:
   - Supabase database operations (`anime`, `reviews`, `favorites`, `payments`, `profiles`) are directly embedded inside component files (`admin/index.tsx`, `watch.tsx`, `ReviewsSection.tsx`, `search.tsx`).
   - Extracting reusable services into `src/services/` improves testability, DRY principles, and separation of concerns.

2. **Types & Interfaces Organization**:
   - `AnimeItem`, `MediaCategory`, `ReviewItem`, `UserProfile` types are re-declared across multiple screen files.
   - Centralizing domain models into `src/types/` removes duplication.

3. **Environment Security & Documentation**:
   - `.env` contains runtime keys, but `.env.example` template is missing. Creating `.env.example` ensures safe secret management without exposing keys in documentation.

4. **Console Logs & Debug Code**:
   - Non-essential `console.log` statements are present across auth, admin operations, and media loaders. Clean log management improves production performance.

5. **Playwright E2E Suite Structure**:
   - Playwright test files in `tests/` are organized into spec domains (`auth`, `content`, `social`, `admin`, `responsive`, `lifecycle`).

---

## 2. Refactoring Target Matrix

| Area | Current Issue | Target Refactoring Strategy |
| :--- | :--- | :--- |
| **Media Service** | Inline Supabase `select` / `insert` / `update` / `delete` in screens | Create `src/services/media.service.ts` |
| **VIP Service** | Direct payment submission and Edge Function calls | Create `src/services/vip.service.ts` |
| **Reviews Service** | In-component reviews fetch, submit, and average calculation | Create `src/services/reviews.service.ts` |
| **Types & Interfaces** | Scattered interfaces across 6 screen files | Centralize in `src/types/index.ts` |
| **Environment Template**| Missing `.env.example` configuration | Create `.env.example` template |
| **Debug Logs** | Debug `console.log` statements in components | Remove non-essential logs |

---

## 3. Preserved Architectural Integrity
- All Expo Router file-based routing (`src/app`) remains unchanged.
- All RLS security policies and Edge Function RPC contracts (`admin-operations`) remain untouched.
- Full compatibility with React Native Web 0.21.0 & Expo SDK 57.
