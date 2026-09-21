# DEVELOPER WORKFLOW & COMMAND REFERENCE

This guide covers environment setup, local development workflows, npm command scripts, code quality enforcement, and project architectural conventions for AniFlix.

---

## 1. System Prerequisites

Before initializing the development workspace, ensure your machine satisfies the following environment dependencies:

- **Node.js**: `v18.0.0` or higher (`v20.x` LTS recommended).
- **Package Manager**: `npm` (`v9.0.0` or higher).
- **Expo CLI**: Executed via `npx expo` (no global installation required).
- **Git**: Installed and configured with standard SSH or HTTPS credentials.

---

## 2. Local Environment Setup

### 1. Clone & Install Dependencies
```bash
git clone git@github.com:E-s2ra/Application-.git
cd Application-
npm install
```

### 2. Configure Local Environment Variables
Create a local `.env` file by copying the provided example template:
```bash
cp .env.example .env
```

Populate `.env` with your active Supabase project credentials:
```env
# Supabase Cloud Project Configuration
EXPO_PUBLIC_SUPABASE_URL=https://zkbprmyxwjfznsucyuvi.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_public_key_here
```

Admin provisioning uses the server-only `ADMIN_EMAIL` variable documented in
`.env.example`; it is not exposed through Expo public configuration.

---

## 3. Command Reference Matrix

| Command | Purpose / Execution Description |
| :--- | :--- |
| `npx expo start --web` | Launch Metro web development server on default port `8083` |
| `npx expo start` | Launch interactive Metro bundler for mobile (iOS/Android) and Web |
| `npx expo export -p web` | Build optimized static web production bundle in `dist/` |
| `npx tsc --noEmit` | Execute strict TypeScript static type analysis across the codebase |
| `npx playwright test` | Execute full automated E2E test suite across 5 responsive viewports |
| `npx playwright test tests/lifecycle/user-lifecycle.spec.ts` | Execute Real User Lifecycle E2E integration test |
| `npx playwright show-report` | Open interactive Playwright HTML test results report |

---

## 4. Codebase Architecture & Guidelines

### Service Layer Abstraction Rule
- **Never write inline Supabase queries inside presentation UI components**.
- All data access and mutations must be encapsulated within `src/services/` (`MediaService`, `ReviewsService`, `VipService`) or custom hooks (`useAuth`, `useGamification`).

### Type Safety & Domain Modeling
- Import central TypeScript types from `@/types` instead of declaring ad-hoc inline interfaces.
- Ensure strict type adherence when modifying component props or service signatures.

### File & Component Naming Standards
- **React Components**: `PascalCase.tsx` (e.g., `RewardsHubModal.tsx`, `VideoJsPlayer.tsx`)
- **Service Modules**: `camelCase.service.ts` or `domain.ts` (e.g., `mediaService.ts`, `admin-operations.ts`)
- **Hooks**: `camelCase.tsx` / `.ts` (e.g., `useGamification.tsx`, `useLanguage.tsx`)
- **Constants & Configs**: `UPPER_SNAKE_CASE` inside `src/constants/`

### Error Handling & Resiliency
- Wrap external network operations in `try/catch` blocks.
- Provide user-friendly fallback states (`EmptyState`, toast alerts) when data is missing or network requests fail.
- Do not swallow exceptions silently without diagnostic logging (`[LOG DEBUG]`).
