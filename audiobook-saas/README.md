# DENG — Audiobook SaaS Web Experience

A new, independent audiobook web application, designed for immersive listening and a memorable bookstore feel. Built in React 19, TypeScript, Vite 7, self-hosted variable fonts, and original SVG cover art.

## Get started

From this folder:

~~~sh
npm install
npm run dev
~~~

Open the local URL shown by Vite. The app is already designed for desktop, tablet, and mobile. Start at the public landing page, then select **Start listening** or **Explore the library**.

## Features

- Art-directed editorial landing page with an interactive audio-installation hero, physical book compositions, sound edition and literary catalog.
- Curated discover page with cover-led featured edition, listening selections and a seven-subject printed directory.
- Catalog search, filtering by genre, sorting, and two switchable layouts: **Gallery** (featured hero-sized first book) and **Index** (compact ledger).
- 12 custom illustrated SVG classics covers; source files are in the public/covers/ directory.
- Detailed book views, chapter listings, curated descriptions, saved books, and share links.
- A real HTML audio player with resume, seek, playback speed, volume, persistent mini-player, full-screen player, and keyboard shortcuts.
- Browser-persisted favorite books, recently played, preview progress, profile display name, and preferences.
- Membership pricing design, account onboarding preview, demo interest form, and honest empty/error states.
- A private collection page with original physical-book staging, numbered saved-book ledger, tabs for saved/recently played and resume controls.
- Hugeicons throughout the app with a slim dark desktop navigation rail, mobile navigation, visible focus states and reduced-motion support.

**Keyboard:** Cmd/Ctrl + K opens catalog search; Space toggles playback when focus is away from controls; Escape closes dialogs.

## Audio / content

The initial playable audio previews are recordings from LibriVox:

- *The Great Gatsby*, chapter 1, recorded by Kara Shallenberg: [source](https://librivox.org/the-great-gatsby-by-f-scott-fitzgerald/).
- *Pride and Prejudice*, chapter 1, publicly available LibriVox reading: [source](https://librivox.org/pride-and-prejudice-by-jane-austen/).

The ten other classics have authored descriptions and cover art but **do not yet have playable audio**. The player and chapter UI never pretend these recordings exist. Availability of LibriVox recordings and reuse rights varies by country; confirm rights for each target market before shipping or commercializing.

Marketing has a small number of decorative listening-room compositions, presented as interface previews. Subscription plan pricing is illustrative and must be configured to your actual business economics before launch.

## Validation

~~~sh
npm run typecheck
npm run build
npm run qa:visual
npm run qa:layout
npm run qa:functional
~~~

Visual QA uses Playwright Chromium and takes screenshots for major desktop/mobile routes under qa/screens/. Layout QA checks every route at 1440, 1024, 768, 390 and 360 pixels. Functional QA tests catalog view switching, saved book persistence, searching, library tabs, player lifecycle, default playback speed and mobile navigation. If necessary, first run npx playwright install chromium.

## Deployment

npm run build produces static files in dist/, deployable to most static hosts. Navigation uses hash-based routes for reliable static hosting without special rewrite rules.

This is the **frontend and design foundation**. Before real paid production launch, wire in secure authentication, database-backed libraries/progress, licensed audio storage and streaming, subscription checkout, webhooks, customer entitlements, email capture, analytics, legal policies, and operational monitoring. The demo currently stores preferences only in browser localStorage; no email or payment credentials are sent anywhere.

### Design decisions

The system draws high-level inspiration from ElevenLabs' restrained audio-product interfaces and Shopify's editorial commerce presentation. The resulting direction is a Swiss editorial publication crossed with an independent literary record label: original DENG identity, warm bone paper, black ink, chartreuse used sparingly, precise hairline rules, asymmetric book installations, and the typographic contrast of Manrope with Instrument Serif. All twelve cover artworks are original.
