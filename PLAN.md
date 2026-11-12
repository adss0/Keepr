# Keepr: build plan

> The development phases, features and decisions for Keepr. Updated as work lands.

---

## Where we are

- ✅ Expo app set up and running (PR #2)
- ✅ Receipt data model and deadline calculator (merged via PR #3)
- ✅ README rewritten around the product (PR #3)
- ✅ Build plan moved into `PLAN.md`
- ✅ CI on every PR and merge, and `main` protected by a ruleset
- ✅ Receipts list screen with sample data, showing each receipt’s next deadline
- ✅ Guide for running Keepr on a phone (Expo Go, Android APK, iPhone TestFlight)
- ✅ Unit tests (Jest) for deadlines and formatting, run in CI
- ✅ Receipt detail screen: every deadline with a plain-English explanation
- ✅ Add, edit and delete receipts, saved on the phone
- ✅ Search receipts by product or shop
- ✅ Reminders 3 days before each deadline and on the last day (9am, phone notifications)
- ✅ Rights engine and "It broke" flow with a claim letter you can send or copy
- ✅ Subscription tracker with monthly/yearly totals, renewal and free-trial reminders
- ✅ Export receipts to CSV (share sheet on phones, download on the web)
- ✅ Supabase sign-in (email and password) and cloud sync of receipts and subscriptions
- ⏭️ **Next:** AI receipt scanning

---

## Development phases

### Phase 1: MVP (snap → save → remind)
- [x] Expo app setup (TypeScript, Expo Router)
- [x] Receipt data model and deadline calculator (30-day reject, 14-day online cancellation, retailer return window, warranty)
- [x] Receipts list screen with sample data, showing upcoming deadlines
- [x] Receipt detail screen
- [x] Supabase project: database tables, sign-up and log-in
- [x] Save receipts on the phone, and add, edit and delete them by hand
- [x] Save receipts to Supabase (each user sees only their own)
- [ ] Snap a receipt → AI extraction → review and save
- [x] Search the receipt vault
- [x] Reminders before deadlines (local notifications scheduled on the phone)

### Phase 2: Rights engine
- [x] Rules for Consumer Rights Act 2015 (30 days / 6 months / up to 6 years)
- [x] Consumer Contracts Regulations 2013 (14-day cancellation)
- [x] Section 75 and chargeback guidance based on payment method
- [x] "It broke" flow: what you're owed and next steps
- [x] Generated claim letter or email to the retailer
- [ ] Known retailer return policies
- [x] Unit tests for every rule

### Phase 3: Subscription tracking and automation
- [x] Subscription tracker: cost, renewal date, trial end
- [x] Renewal and trial-ending alerts
- [ ] Gmail / Outlook auto-capture (read-only)

### Phase 4: Partnerships and polish
- [ ] Retailer digital receipt integration
- [ ] Opt-in insurer offers (extended warranty when one is ending)
- [x] CSV export (PDF still to do)
- [ ] Spending insights
- [ ] App Store and Google Play release

---

## Features (full list)

| Feature | Phase |
|---|---|
| Snap a receipt, AI pulls out product, price, date | 1 |
| Return, cancellation and warranty reminders | 1 |
| Receipt vault with search | 1 |
| "It broke, what am I owed?" | 2 |
| Claim letter generator | 2 |
| Subscription tracker and alerts | 3 |
| Email auto-capture | 3 |
| Export to PDF / CSV | 4 |
| Retailer and insurer partnerships | 4 |

All features are free for now.

---

## Tech stack (and why)

| Tool | Why |
|---|---|
| **TypeScript** | One language for the app, backend and rules. Types catch money and date mistakes early. |
| **Expo + React Native** | One codebase for iPhone and Android. Camera and push notifications built in. Test free with Expo Go. |
| **Expo Router** | File-based screens: every file in `src/app/` is a screen. |
| **Supabase** | Free tier covers database, sign-in, photo storage and scheduled jobs. Standard Postgres, so no lock-in. |
| **Vision AI (e.g. Claude)** | Reads messy receipts straight into structured data. |
| **Rules in code (not AI)** | Legal deadlines must be exact and testable. AI only explains results and drafts letters. |
| **Expo Push Notifications** | One API for iOS and Android reminders. |
| **Cloudflare R2** (if needed) | Cheap photo storage once Supabase's 1 GB fills up. |

---

## Decisions log

- Chose Expo + TypeScript + Supabase to keep costs near £0 and use one language.
- Prices stored in pence to avoid rounding errors.
- Work goes in small PRs, opened about 12 hours apart, with no AI credits or reviewer notes.
- Roadmap moved out of the README into this `PLAN.md`.
- Every change goes through a PR with a summary. No direct pushes to `main`.
- Keepr is free for now: no Premium tier, scan limits or in-app payments.
- Added CI (typecheck, lint, web build). `main` ruleset: PR required, CI must pass, branch must be up to date, no force-push or deletion.
- Deadlines within 3 days are shown in red, and within 7 days in amber. Receipts are sorted by their soonest deadline.
- Web preview runs as a single-page app (no server rendering), since Keepr is a phone app first.

- Phone builds use EAS: `preview` makes an installable Android APK, `production` is for the app stores.

- Unit tests use `jest-expo`, live next to the code in `__tests__` folders and import `describe`/`it`/`expect` from `@jest/globals`.

- Receipts are saved on the phone with AsyncStorage (works in Expo Go and on the web). A new install starts empty, with a button to load sample receipts.
- Dates are typed as YYYY-MM-DD for now; a date picker can come later.

- Reminders are local notifications scheduled by the phone, so they need no server and work in Expo Go. All are rescheduled whenever receipts change, capped at 60 (iOS allows 64).

- The rights engine is plain TypeScript rules with tests at every boundary (day 30/31, 6 months, 6 years, £100 for Section 75). Legal dates always show the year.

- Subscriptions roll their renewal date forward automatically by whole billing cycles, counting from the original date so the 31st stays the 31st.

- Cloud sync is optional and only on when `.env` has the Supabase URL and publishable key. The phone is the main copy: sign-in merges cloud items in (phone wins on a clash), and phone deletes are pushed to the cloud. Deletes made on another phone aren't pulled down yet.
- Row level security on every table: users can only read or change their own rows.

## Notes and to-dos

- Harden sign-in storage: keep the Supabase session encrypted (expo-secure-store) instead of AsyncStorage.
- Local Node is 20.14. Expo SDK 58 needs **22.13+**, so upgrade to run the app.
