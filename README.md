# Keepr

[![CI](https://github.com/adss0/Keepr/actions/workflows/ci.yml/badge.svg)](https://github.com/adss0/Keepr/actions/workflows/ci.yml)

> **You keep your receipts. Keepr keeps your rights.**

Snap a receipt and Keepr pulls out the product, price and return deadline. It reminds you before your return window or warranty runs out. When something breaks, it tells you exactly what you're entitled to under UK consumer law, and how to claim it.

> **Status:** Early development. The Expo app skeleton is set up, and features are being built step by step. See the [build plan](PLAN.md).

---

## Table of contents

- [The problem](#the-problem)
- [Who it's for](#who-its-for)
- [Core features](#core-features)
- [Your rights, explained](#your-rights-explained)
- [How it works](#how-it-works)
- [Pricing](#pricing)
- [Privacy and security](#privacy-and-security)
- [Tech stack](#tech-stack)
- [Build plan](#build-plan)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [License](#license)

---

## The problem

Most people lose their receipts and miss refunds they were owed.

- Receipts fade, get thrown away, or sit in an inbox nobody searches.
- Return windows close without anyone noticing.
- When a product breaks, most people don't know that the law often gives them more than the shop's own policy, so they accept "sorry, it's out of warranty" when they could get a repair, replacement or refund.
- Subscriptions pile up across different apps and cards, and renewals catch people out.

## Who it's for

**Everyone who buys anything.** In particular:

- Shoppers who want proof of purchase to hand without hunting for it.
- People buying expensive items like electronics, appliances and furniture, where a missed warranty or return costs real money.
- Anyone who has been told "no" by a retailer and isn't sure whether that's actually allowed.
- Anyone with more subscriptions than they can keep track of.

---

## Core features

### 📸 Snap a receipt
- Take a photo of a paper receipt, or forward or upload a digital one.
- Keepr extracts the **retailer, product(s), price, purchase date and payment method**.
- It works out the **return deadline** and **warranty end date**, using the retailer's known policy where available and the legal minimums otherwise.
- The original image is kept as proof of purchase.

### 📥 Automatic capture from email *(later phase)*
- Connect Gmail or Outlook with **read-only** access.
- Order confirmations and e-receipts are picked up automatically, with no snapping needed.

### ⏰ Reminders before you lose out
- "Your 30-day return window for *Headphones* at *Store X* closes in 3 days."
- "The warranty on your *Washing machine* ends next month."
- "Your 14-day cancellation period for an online order ends on Friday."

### ⚖️ "It broke. What am I owed?"
- Pick the item, describe what went wrong, and Keepr tells you:
  - which rights apply, based on what you bought, when, how and how you paid
  - what you can ask for: a refund, repair, replacement or partial refund
  - the steps to take, with a ready-to-send claim letter or email to the retailer
- See [Your rights, explained](#your-rights-explained) below.

### 🔁 All your subscriptions in one place
- See every subscription together, with its cost, renewal date and billing cycle.
- Get alerts before free trials convert and before renewals.
- See your total monthly and yearly subscription spend.

### 🗂️ Organise, search and export
- Automatic categories (electronics, groceries, clothing, home, …).
- Search by retailer, product, amount or date.
- Export receipts to PDF or CSV for insurance claims, expenses or tax.

---

## Your rights, explained

Keepr's rights engine is built on UK consumer law. These are the main rules it applies:

| Situation | Your right | Source |
|---|---|---|
| Faulty goods, within **30 days** | Full refund (the "short-term right to reject") | Consumer Rights Act 2015 |
| Faulty goods, within **6 months** | Repair or replacement. If that fails, a refund or price reduction. The fault is presumed to have been there from the start. | Consumer Rights Act 2015 |
| Faulty goods, after **6 months** | Repair, replacement or refund still possible, but you may need to show the fault was there at purchase | Consumer Rights Act 2015 |
| Goods that should last longer | Claims possible for up to **6 years** (5 in Scotland), depending on reasonable durability | Consumer Rights Act 2015 / Limitation Act 1980 |
| Bought **online, by phone or by mail order** | **14 days** to cancel for any reason, then 14 days to return. Refund due within 14 days. | Consumer Contracts Regulations 2013 |
| Paid by **credit card**, item £100–£30,000 | The card provider is jointly liable with the retailer | Section 75, Consumer Credit Act 1974 |
| Paid by **debit card** or for items under £100 on credit | You may be able to ask your bank for a chargeback (a scheme rule, not a legal right) | Card scheme rules |
| Faulty **digital content** | Repair or replacement, then a refund or price reduction | Consumer Rights Act 2015 |

Keepr also makes clear what the law **doesn't** cover. For example, a "change of mind" return in a physical shop is a goodwill policy, not a legal right.

> ⚠️ Keepr provides general information about consumer rights, not legal advice. For complex disputes, Citizens Advice or a solicitor can help.

---

## How it works

```
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │ Photo / scan │   │  Email inbox │   │ Manual entry │
 └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
        ▼                  ▼                  ▼
 ┌─────────────────────────────────────────────────────┐
 │  Extraction: retailer, product, price, date,        │
 │  payment method (vision AI + OCR)                   │
 └──────────────────────────┬──────────────────────────┘
                            ▼
 ┌─────────────────────────────────────────────────────┐
 │  Deadlines: return window, cancellation period,     │
 │  warranty, legal rights timeline                    │
 └──────────────────────────┬──────────────────────────┘
                            ▼
 ┌─────────────────────────────────────────────────────┐
 │        Receipt vault (searchable proof of purchase) │
 └───────┬─────────────────┬─────────────────┬─────────┘
         ▼                 ▼                 ▼
    Reminders        Rights engine      Subscriptions
                   + claim letters      & exports
```

---

## Pricing

**Keepr is free.** Every feature is free to use, with no subscription, no premium tier and no limits.

---

## Privacy and security

- **Least privilege:** email access is read-only, and only receipt-like emails are processed.
- **OAuth, not passwords:** Keepr never sees your email password.
- **Encryption** in transit and at rest.
- **Your data, your control:** export everything, or delete your account and all data at any time.
- **No selling personal data.** Partners never get your data without explicit opt-in.
- Designed to comply with **UK GDPR**.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** everywhere | One language across the app and backend. Strong typing catches bugs early. Huge ecosystem. |
| Mobile app | **React Native + Expo** | One codebase for iOS and Android. Built-in camera, push notifications and over-the-air updates. Can also run on the web. |
| Backend | **Supabase** (Postgres, Auth, Storage, Edge Functions) | A managed database, sign-in, image storage and server functions in one service. Very fast to start, and it's standard Postgres, so there's no lock-in. |
| Receipt extraction | **Vision-capable LLM** (e.g. Claude) | Reads messy, crumpled or faded receipts and returns structured data (product, price, date) directly, rather than raw OCR text that still needs parsing. |
| Rights engine | **Rules in TypeScript**, with an LLM only for explanations | The deadlines and entitlements must be deterministic and testable. The AI explains the result in plain English but doesn't decide it. |
| Scheduled jobs | Supabase cron / scheduled functions | Daily checks for upcoming deadlines that trigger reminders. |
| Notifications | Expo Push Notifications | One API for iOS and Android push. |
| Email capture (later) | Gmail API / Microsoft Graph | Official read-only access. |

---

## Build plan

The development phases, full feature list and decisions log are in [PLAN.md](PLAN.md).

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

### Run it on your phone

See **[Run Keepr on your phone](docs/run-on-your-phone.md)** for step-by-step instructions using Expo Go (free), an Android APK (free) or an iPhone build (TestFlight).

### Useful commands

| Command | What it does |
|---|---|
| `npm start` | Starts the dev server |
| `npm run web` | Opens the app in a browser |
| `npm run typecheck` | Checks the TypeScript types |
| `npm run lint` | Lints the code |
| `npm test` | Runs the unit tests |
| `npx expo install <package>` | Adds a package at a version compatible with this Expo SDK. Use this instead of `npm install <package>`. |

### Continuous integration

Every pull request to `main`, and every merge into it, runs [CI](.github/workflows/ci.yml) on GitHub Actions. It checks types, lints the code, runs the unit tests and builds the app. `main` is protected:

- Changes reach `main` only through a pull request.
- A PR can only be merged when CI passes, the branch is up to date with `main` and it has no conflicts.
- Force-pushing to `main` and deleting it are blocked.

---

## Project structure

```
Keepr/
├── src/
│   ├── app/            # Screens (Expo Router: every file here is a screen)
│   │   ├── _layout.tsx #   Root navigation layout and header
│   │   ├── index.tsx   #   Receipts list (home screen)
│   │   └── receipt/    #   Receipt detail ([id]), add (new) and edit (edit/[id]) screens
│   ├── components/     # Reusable UI
│   │   ├── deadline-pill.tsx # Colour-coded deadline label
│   │   ├── form.tsx    #   Text field, option picker and button
│   │   ├── receipt-card.tsx # One receipt with its next deadline
│   │   └── receipt-form.tsx # Add/edit receipt form
│   ├── constants/      # Shared constants
│   │   └── theme.ts    #   Light and dark mode colours
│   ├── data/           # Where receipts come from
│   │   ├── receipts.tsx #  Saves receipts on the phone (useReceipts, add, edit, delete)
│   │   └── sample-receipts.ts # Example receipts for trying the app
│   ├── lib/            # App logic, kept separate from screens
│   │   ├── confirm.ts  #   "Are you sure?" prompts
│   │   ├── deadlines.ts#   Works out return, cancellation and warranty dates
│   │   ├── format.ts   #   Formats prices and dates
│   │   ├── receipt-input.ts # Checks and parses the receipt form
│   │   └── search.ts   #   Receipt search
│   └── types/          # Shared TypeScript types
│       └── receipt.ts  #   The Receipt data model
├── .github/workflows/  # CI checks run on every PR and merge
├── assets/             # App icons and splash screen
├── PLAN.md             # Build plan: phases, features and decisions
├── docs/               # Guides (running on your phone)
├── eas.json            # EAS cloud build settings (Android APK, iPhone)
├── AGENTS.md           # Notes for AI coding assistants working on this repo
├── app.json            # Expo app configuration (name, icons, plugins)
├── eslint.config.js    # Lint rules (Expo defaults)
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript settings (`@/` points to `src/`)
```

Planned additions: `supabase/` (database schema and server functions).

---

## License

All rights reserved.
