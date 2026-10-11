# DENG — Audiobook Library

An audiobook web app with a browser-based listening player and an interactive 3D home library. Built with React 19, TypeScript, Vite 7, Three.js, React Three Fiber, self-hosted variable fonts, and original SVG book covers.

## Get started

From this folder:

~~~sh
npm install
npm run dev
~~~

Open the local URL shown by Vite. Select **Explore** for the catalog or open **Library** for the 3D room.

## Features

- Minimal editorial landing page with original books and a working chapter-preview action.
- Discover page with a featured audio edition and a small selection of books.
- Catalog search, filtering by genre, sorting, and two switchable layouts: **Gallery** (featured hero-sized first book) and **Index** (compact ledger).
- 12 custom illustrated SVG classics covers; source files are in the public/covers/ directory.
- Detailed book views, chapter listings, curated descriptions, saved books, and share links.
- A real HTML audio player with resume, seek, playback speed, volume, persistent mini-player, full-screen player, and keyboard shortcuts.
- Browser-persisted favorite books, recently played, preview progress, profile display name, and preferences.
- Membership information clearly identifying DENG Plus as not yet available; no fake checkout or inactive email form.
- **Real-time 3D home library** with modeled oak shelves, wall, floor, window, chair, lamp and 3D books with cover textures, spines and visible page blocks. Books can be selected directly inside the room, with View, Preview and Save actions.
- Saved/recently played book lists, continuation controls and a keyboard-accessible alternative to 3D selection.
- Dynamically loaded Three.js room, limited camera orbit, touch-friendly mobile rendering, reduced pixel density on small screens, and a usable non-WebGL fallback.
- Hugeicons throughout the app with a slim dark desktop navigation rail, mobile navigation, visible focus states and reduced-motion support.

**Keyboard:** Cmd/Ctrl + K opens catalog search; Space toggles playback when focus is away from controls; Escape closes dialogs.

## Audio / content

The initial playable audio previews are recordings from LibriVox:

- *The Great Gatsby*, chapter 1, recorded by Kara Shallenberg: [source](https://librivox.org/the-great-gatsby-by-f-scott-fitzgerald/).
- *Pride and Prejudice*, chapter 1, publicly available LibriVox reading: [source](https://librivox.org/pride-and-prejudice-by-jane-austen/).

The ten other classics have authored descriptions and cover art but **do not yet have playable audio**. The player and chapter UI never pretend these recordings exist. Availability of LibriVox recordings and reuse rights varies by country; confirm rights for each target market before shipping or commercializing.

Subscription plan pricing is illustrative and must be configured to actual business economics before launch.

## Validation

~~~sh
npm run typecheck
npm run build
npm run qa:visual
npm run qa:layout
npm run qa:functional
~~~

Visual QA uses Playwright Chromium and takes screenshots for major desktop/mobile routes under qa/screens/. Layout QA checks every route at 1440, 1024, 768, 390 and 360 pixels. Functional QA tests the 3D room or accessible fallback, catalog view switching, saved book persistence, selecting books, searching, library tabs, player lifecycle, playback speed and mobile navigation. If necessary, first run npx playwright install chromium. WebGL appearance depends on the browser's GPU/driver support.

## Deployment

npm run build produces static files in dist/, deployable to most static hosts. Navigation uses hash-based routes for reliable static hosting without special rewrite rules.

This is the **frontend and design foundation**. Before real paid production launch, wire in secure authentication, database-backed libraries/progress, licensed audio storage and streaming, subscription checkout, webhooks, customer entitlements, email capture, analytics, legal policies, and operational monitoring. The demo currently stores preferences only in browser localStorage; no email or payment credentials are sent anywhere.

### Design decisions

The design uses warm bone paper, near-black ink, restrained chartreuse accents, clean book-centered typography and a warmly furnished interactive 3D reading room. Book covers are original SVG designs; the 3D room and book geometry are modeled in code rather than downloaded GLB assets.
