# AniFlix — Cinema & Anime Universe 🎬✨

AniFlix is a production-grade, multi-platform cinema and anime streaming web and mobile application built with **Expo (SDK 57)**, **React Native Web**, **Cloud Supabase**, and **Playwright**.

---

## 🌟 Key Features

- **Media Streaming**: High-performance video player with episode selector and server link fallbacks.
- **Gamification & Rewards**: Daily login streak tracking, spin wheel rewards, coins, and level XP progression.
- **VIP Sovereign Membership**: FIB voucher & manual Iraqi payment gateway integration with golden badge elevation.
- **Admin Control Panel**: Real-time media catalog management (Add/Edit/Delete), VIP approvals, and Edge Function operations.
- **Social & Reviews**: Interactive user star ratings, reviews, and community comments.
- **Multi-Language Engine**: Full Kurdish Sorani (کوردی سۆرانی) and English localization.
- **Cross-Platform & Responsive**: Optimized for Small Mobile (<360px), Standard Mobile (390–430px), Tablets (768px), and Desktops (1440px+).

---

## 🛠️ Tech Stack

- **Framework**: Expo SDK 57, React Native 0.76, React Native Web 0.21.
- **Navigation**: Expo Router (File-based routing).
- **Backend & Auth**: Cloud Supabase (PostgreSQL, Auth, RLS Policies, Edge Functions).
- **State & Storage**: React Context, AsyncStorage, LocalStorage.
- **E2E Testing**: Playwright (Multi-viewport headless testing).
- **Styling**: Modern dark mode with responsive flex layouts and gradient glassmorphism.

---

## 📁 Project Structure

```text
Application-/
├── docs/                     # Authoritative Documentation
│   ├── ARCHITECTURE.md       # System design, routing & auth flow
│   ├── FEATURES.md           # Role-based feature inventory & CRUD matrix
│   ├── DEVELOPMENT.md        # Local setup & developer workflow guide
│   ├── TESTING.md            # Playwright E2E & Real User Lifecycle specs
│   └── DEPLOYMENT.md         # Production web export & Edge Function deployment
├── src/
│   ├── app/                  # Expo Router file-based screens & layouts
│   ├── components/           # Reusable UI components (Modals, Badges, Header)
│   ├── services/             # Media, VIP, and Reviews service abstractions
│   ├── hooks/                # Auth, Favorites, and Gamification hooks
│   ├── lib/                  # Supabase client, i18n translations & admin RPCs
│   ├── types/                # Unified TypeScript interfaces
│   └── constants/            # Default catalog & application constants
├── tests/                    # Playwright E2E test suites & lifecycle specs
├── .env.example              # Environment variables template
├── app.json                  # Expo project manifest
├── package.json              # Project dependencies & scripts
└── playwright.config.ts      # Playwright E2E configuration
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

### 3. Launch Development Server

```bash
# Start Metro web development server
npx expo start --web
```

Open `http://localhost:8083` in your browser.

---

## 🧪 Running E2E Tests

```bash
# Run all Playwright E2E test suites across viewports
npx playwright test

# Run the Real User Lifecycle E2E test
npx playwright test tests/lifecycle/user-lifecycle.spec.ts --project=chromium-desktop
```

---

## 📖 Further Documentation

- 📐 [Architecture Guide](docs/ARCHITECTURE.md)
- ✨ [Feature Reference & CRUD Matrix](docs/FEATURES.md)
- 💻 [Developer Workflow & Commands](docs/DEVELOPMENT.md)
- 🧪 [Testing & E2E Specs](docs/TESTING.md)
- 🚀 [Deployment Guide](docs/DEPLOYMENT.md)
