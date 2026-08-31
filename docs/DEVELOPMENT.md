# DEVELOPER WORKFLOW & COMMAND REFERENCE

This guide covers environment setup, local development workflows, code quality scripts, and project conventions for AniFlix.

---

## 1. Prerequisites

- **Node.js**: `v18.0.0` or higher (Node 20 recommended).
- **Package Manager**: `npm` (v9+).
- **Expo CLI**: Installed via `npx expo`.

---

## 2. Local Environment Setup

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with active credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://zkbprmyxwjfznsucyuvi.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_ADMIN_EMAIL=esra99san@gmail.com
   ```

---

## 3. Available NPM & Shell Commands

| Command | Purpose |
| :--- | :--- |
| `npx expo start --web` | Launch Metro web development server on port 8083 |
| `npx expo start` | Launch interactive Metro bundler for mobile & web |
| `npx expo export -p web` | Build static web bundle for production deployment |
| `npx tsc --noEmit` | Run TypeScript type checking across the codebase |
| `npx playwright test` | Run full Playwright E2E test suite across viewports |
| `npx playwright test tests/lifecycle/user-lifecycle.spec.ts` | Run Real User Lifecycle E2E test |

---

## 4. Codebase Conventions & Guidelines

- **Service Layer Abstraction**: Avoid scattering raw `supabase.from(...)` queries inside UI components. Use `src/services/` (`MediaService`, `ReviewsService`, `VipService`).
- **Type Safety**: Import domain models from `@/types` instead of redeclaring interfaces inline.
- **Naming Conventions**:
  - Components: `PascalCase.tsx`
  - Services & Utility files: `camelCase.service.ts` or `kebab-case.ts`
  - Constants: `UPPER_SNAKE_CASE`
- **Error Handling**: Use explicit try/catch blocks in services with fallback UI empty states. Do not swallow errors silently.
