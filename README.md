# Keepr

**Keep every receipt. Split every bill. Never miss a return window again.**

Keepr is a personal finance companion that collects your receipts automatically — from your email inbox, photos of paper receipts, and manual entries — organises them in one place, helps you split costs with friends, and reminds you about the things that matter (return deadlines, warranties, who still owes you money).

> **Status:** Early development. The Expo app skeleton is set up, and features are being built phase by phase (see [Roadmap](#roadmap)).

---

## Table of contents

- [Why Keepr?](#why-keepr)
- [Core features](#core-features)
- [How it works](#how-it-works)
- [Privacy and security](#privacy-and-security)
- [Roadmap](#roadmap)
- [Proposed tech stack](#proposed-tech-stack)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Why Keepr?

Receipts are scattered everywhere: crumpled in pockets, buried in email, stuck in a dozen shopping apps. When you need one — to return something, claim a warranty, file an expense, or settle up after a group dinner — it's never where you need it.

Keepr solves three everyday problems:

1. **"Where's that receipt?"** — Every receipt, digital or paper, searchable in one place.
2. **"Who owes what?"** — Split a bill item-by-item and track who has paid you back.
3. **"I forgot to return it."** — Automatic reminders before return windows and warranties expire.

---

## Core features

### 📥 Automatic receipt capture from email
- Connect your email account (Gmail, Outlook, and others via IMAP) with **read-only** access.
- Keepr scans for order confirmations, invoices and e-receipts from retailers, restaurants, ride-shares, subscriptions and more.
- Extracts the useful bits: merchant, date, total, tax, line items, payment method, order number.
- Only receipt-like emails are processed — everything else is ignored.

### 📸 Paper receipt scanning
- Snap a photo of a paper receipt.
- OCR reads the merchant, items and totals so you don't have to type them.
- The original image is kept alongside the extracted data.

### 🗂️ Organisation and search
- Automatic categorisation (groceries, dining, travel, electronics, subscriptions, …).
- Search by merchant, item, amount, date or tag.
- Custom tags and folders (e.g. "Work expenses", "Home renovation", "Holiday 2026").
- Spending summaries by category and month.

### ➗ Bill splitting
- Split any receipt **evenly**, **by item**, **by percentage** or **by custom amounts**.
- Assign individual line items to people ("Sam had the steak, Alex had the pasta").
- Tax and tip are distributed proportionally.
- Groups for recurring splits (flatmates, trips, couples).
- Running balances: see who owes whom and settle up with the fewest payments.
- Share a split link with friends — they don't need an account to see what they owe.

### ⏰ Reminders
- **Return windows:** "Your return window for *Headphones* at *Store X* closes in 3 days."
- **Warranties:** alerts before a product warranty expires.
- **Unpaid splits:** gentle nudges for money you're owed (and money you owe).
- **Subscriptions:** a heads-up before a free trial converts or a subscription renews.
- **Price drops (future):** notice when something you bought gets cheaper within its price-adjustment window.

### 📤 Export
- Export receipts to CSV / PDF for expense reports or tax time.
- Bulk-download original receipt images and emails.

---

## How it works

```
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │  Email inbox │   │ Photo / scan │   │ Manual entry │
 └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
        │                  │                  │
        ▼                  ▼                  ▼
 ┌─────────────────────────────────────────────────────┐
 │        Ingestion: detect receipt-like content       │
 └──────────────────────────┬──────────────────────────┘
                            ▼
 ┌─────────────────────────────────────────────────────┐
 │  Extraction: merchant, date, items, totals, return  │
 │  policy, warranty (parsing + OCR + AI assistance)   │
 └──────────────────────────┬──────────────────────────┘
                            ▼
 ┌─────────────────────────────────────────────────────┐
 │           Receipt store (searchable, tagged)        │
 └───────┬─────────────────┬─────────────────┬─────────┘
         ▼                 ▼                 ▼
   Bill splitting     Reminders &       Insights &
   & balances         notifications     exports
```

1. **Ingest** — Keepr periodically checks connected inboxes for new receipt emails, and accepts photos and manual entries.
2. **Extract** — Structured data is pulled out using known retailer templates where available, falling back to OCR and AI-assisted parsing for everything else.
3. **Store** — Receipts are saved with their original source (email or image) so you always have proof of purchase.
4. **Act** — Split the bill, set reminders, or just let it sit there until you need it.

---

## Privacy and security

Keepr reads financial data and email, so trust is the whole product. Guiding principles:

- **Least privilege:** email access is read-only and scoped as narrowly as the provider allows. Keepr never sends, deletes or modifies email.
- **Only receipts:** non-receipt emails are skipped and not stored.
- **OAuth, not passwords:** email is connected via the provider's OAuth flow — Keepr never sees or stores your email password.
- **Encryption:** data encrypted in transit (TLS) and at rest.
- **Your data, your control:** disconnect an inbox at any time, export everything, or delete your account and all associated data.
- **No selling data.** Ever.

> Note: Accessing Gmail data requires passing Google's OAuth verification and, for restricted scopes, a security assessment. This should be planned for before a public launch.

---

## Roadmap

### Phase 1 — MVP
- [ ] Project setup, auth and user accounts
- [ ] Manual receipt entry
- [ ] Receipt list, detail view and search
- [ ] Basic bill splitting (even and custom amounts)

### Phase 2 — Automation
- [ ] Gmail integration (read-only OAuth)
- [ ] Receipt detection and data extraction from emails
- [ ] Photo upload with OCR
- [ ] Auto-categorisation

### Phase 3 — Reminders and social
- [ ] Return window and warranty reminders
- [ ] Item-level splitting, groups and balances
- [ ] Shareable split links
- [ ] Push and email notifications

### Phase 4 — Polish
- [ ] Outlook / IMAP support
- [ ] Spending insights dashboard
- [ ] CSV / PDF export
- [ ] Subscription tracking and price-drop alerts
- [ ] Mobile apps

---

## Proposed tech stack

*Not final — open to change as the project takes shape.*

| Layer | Options |
|---|---|
| Mobile / web client | React Native (Expo) or Next.js |
| Backend API | Node.js (TypeScript) or Python (FastAPI) |
| Database | PostgreSQL |
| File storage | S3-compatible object storage for receipt images |
| Background jobs | Queue-based workers for email syncing and reminders |
| Email integration | Gmail API, Microsoft Graph, IMAP |
| OCR / extraction | Cloud OCR + LLM-assisted parsing |
| Notifications | Push notifications + transactional email |

---

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org/) **22.13 or newer** (Expo SDK 58 requires it; install the current LTS)
- [Git](https://git-scm.com/)
- The **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)) to test on a real device, for free

### Run the app

```bash
git clone https://github.com/adss0/Keepr.git
cd Keepr
npm install
npm start
```

Then scan the QR code in the terminal:
- **Android:** scan it with the Expo Go app.
- **iPhone:** scan it with the Camera app.

You can also press `w` to open the app in a web browser.

### Useful commands

| Command | What it does |
|---|---|
| `npm start` | Starts the dev server |
| `npm run web` | Opens the app in a browser |
| `npm run typecheck` | Checks the TypeScript types |
| `npm run lint` | Lints the code |
| `npx expo install <package>` | Adds a package at a version compatible with this Expo SDK. Use this instead of `npm install <package>`. |

---

## Project structure

```
Keepr/
├── src/
│   └── app/            # Screens (Expo Router: every file here is a screen)
│       ├── _layout.tsx #   Root navigation layout
│       └── index.tsx   #   Home screen
├── assets/             # App icons and splash screen
├── AGENTS.md           # Notes for AI coding assistants working on this repo
├── app.json            # Expo app configuration (name, icons, plugins)
├── eslint.config.js    # Lint rules (Expo defaults)
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript settings (`@/` points to `src/`)
```

Planned additions: `supabase/` (database schema and server functions) and `src/components/` (reusable UI).

---

## Contributing

This is currently a personal project. Ideas and feedback are welcome via issues.

---

## License

All rights reserved. A license may be added later.
