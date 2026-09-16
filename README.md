# AniFlix — Cinema & Anime Universe 🎬✨

[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-000000?style=for-the-badge&logo=expo)](https://expo.dev)
[![React Native 0.86](https://img.shields.io/badge/React%20Native-0.86-61DAFB?style=for-the-badge&logo=react)](https://reactnative.dev)
[![Supabase Cloud](https://img.shields.io/badge/Supabase-Cloud%20Postgres-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![TypeScript 5.x](https://img.shields.io/badge/TypeScript-Strict%20Type%20Check-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Playwright E2E](https://img.shields.io/badge/Playwright-E2E%20Automated-2EAD33?style=for-the-badge&logo=playwright)](https://playwright.dev)

AniFlix is a production-grade, multi-platform cinema and anime streaming web and mobile application built with **Expo (SDK 57)**, **React Native Web**, **Cloud Supabase**, and **Playwright E2E**. It features a modern dark glassmorphism interface, real-time multi-language localization (English and Kurdish Sorani / کوردی سۆرانی), gamified reward systems, secure server-authoritative media unlocks, and a dedicated VIP Sovereign management panel.

---

## 🌟 Key Application Features

- 🎥 **High-Performance Streaming Engine**: Custom video player built on `expo-video` v2 with multi-source fallback resolution, episode selectors, responsive controls, and custom gestures.
- 🌐 **Real-Time Bilingual i18n Engine**: Dynamic switching between **English (`en`)** and **Kurdish Sorani (`ku`)** across all user screens, headers, buttons, watch player controls, and modal components.
- 🔒 **Hardened Server-Authoritative Security**: Strict database Row-Level Security (RLS) and `SECURITY DEFINER` RPCs (`unlock_media_with_coins`) preventing client-side data tampering and double-unlock race conditions.
- 👑 **VIP Sovereign Membership**: Integrated manual Iraqi payment gateway (FIB, ZainCash, FastPay) with instant admin verification and golden crown status badges.
- 🎮 **Gamification & Rewards Hub**: Daily login streak tracking, lucky wheel bonus spins, coin economy, and XP level progression.
- ⚡ **Admin Sovereign Control Center**: Dedicated `/admin` dashboard for media catalog management (Add/Edit/Delete), VIP application approvals, and serverless Edge Function operations.
- 📱 **Fully Responsive Layout Matrix**: Precision breakpoints supporting Compact Mobile (<360px), Standard Mobile (390–430px), Tablets (768px), and Desktop/Workstations (1440px+).

---

## 🛠️ Technology Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Core Framework** | Expo SDK 57 & React Native 0.86 | Cross-platform runtime & native compilation |
| **Web Runtime** | React Native Web 0.21 & React 18 | High-performance Web DOM rendering |
| **Navigation** | Expo Router v4 | File-based routing, tab layouts, and access guards |
| **Database & Backend** | Cloud Supabase | PostgreSQL database, Auth, RLS Policies, and Storage |
| **Edge Compute** | Deno Edge Functions | Serverless administrative RPCs using Service Role |
| **Automated Testing** | Playwright E2E | Multi-viewport automated functional & regression testing |
| **i18n Localization** | Custom React Context Engine | Zero-reload dynamic translations (EN & Kurdish Sorani) |

---

## 📁 System Architecture & Directory Anatomy

```text
Application-/
├── docs/                     # Authoritative Engineering Documentation
│   ├── ARCHITECTURE.md       # High-level architecture, RLS security & data flow
│   ├── FEATURES.md           # Role-based feature inventory & CRUD capability matrix
│   ├── DEVELOPMENT.md        # Local workspace setup & command reference
│   ├── TESTING.md            # Playwright E2E testing strategy & multi-viewport matrix
│   └── DEPLOYMENT.md         # Production web deployment & Edge Function guide
├── src/
│   ├── app/                  # Expo Router file-based screens & tab layouts
│   ├── features/             # Feature-owned domain logic (VIP, Auth, Media, Gamification)
│   ├── components/           # Reusable UI components (Modals, Badges, Header, Players)
│   ├── services/             # Encapsulated API layer (MediaService, ReviewsService, VipService)
│   ├── hooks/                # Global React hooks (useAuth, useFavorites, useGamification)
│   ├── lib/                  # Supabase client, i18n translation engine & Edge RPC callers
│   ├── types/                # Unified TypeScript domain definitions
│   └── constants/            # Catalog defaults, genres, and static assets
├── tests/                    # Playwright E2E test suites & Real User Lifecycle specs
├── .env.example              # Environment variables template
├── app.json                  # Expo application manifest
├── package.json              # Project dependencies & npm scripts
└── playwright.config.ts      # Playwright multi-viewport E2E configuration
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites

- **Node.js**: `v18.0.0` or higher (Node 20 recommended)
- **Package Manager**: `npm` (v9+)
- **Expo CLI**: Included via `npx expo`

### 2. Installation & Setup

```bash
# Clone repository and install dependencies
npm install

# Create local environment configuration
cp .env.example .env
```

Configure `.env` with your Supabase project credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_ADMIN_EMAIL=esra99san@gmail.com
```

### 3. Launch Local Development Server

```bash
# Start Metro web development server
npx expo start --web
```

Navigate to `http://localhost:8083` in your browser.

---

## 🧪 Automated Testing

AniFlix includes Playwright E2E test suites executing across desktop, tablet, and mobile viewports.

```bash
# Run all Playwright E2E test suites
npx playwright test

# Run the Real User Lifecycle E2E test
npx playwright test tests/lifecycle/user-lifecycle.spec.ts --project=chromium-desktop

# Open Playwright HTML Report
npx playwright show-report
```

---

## 📖 Engineering Documentation Index

- 📐 **[System Architecture Guide](docs/ARCHITECTURE.md)**: Deep dive into routing, auth flow, database RLS, and security hardening.
- ✨ **[Feature Reference & CRUD Matrix](docs/FEATURES.md)**: Complete inventory of user roles, entity CRUD capabilities, and localization coverage.
- 💻 **[Developer Workflow & Commands](docs/DEVELOPMENT.md)**: Workspace setup, npm scripts, coding conventions, and type checking.
- 🧪 **[Testing & Playwright E2E Specs](docs/TESTING.md)**: Multi-viewport test matrix and step-by-step user lifecycle workflow.
- 🚀 **[Production Deployment Guide](docs/DEPLOYMENT.md)**: Web static bundle export, host deployment, and Edge Function setup.
