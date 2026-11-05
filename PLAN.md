# Keepr: build plan

> The development phases, features and decisions for Keepr. Updated as work lands.

**Last updated:** 5 Nov 2026

---

## Where we are

- ✅ Expo app set up and running (PR #2)
- ✅ Receipt data model and deadline calculator (merged via PR #3)
- ✅ README rewritten around the product (PR #3)
- ✅ Build plan moved into `PLAN.md`
- ⏭️ **Next:** receipts list screen with sample data

---

## Development phases

### Phase 1: MVP (snap → save → remind)
- [x] Expo app setup (TypeScript, Expo Router)
- [x] Receipt data model and deadline calculator (30-day reject, 14-day online cancellation, retailer return window, warranty)
- [ ] Receipts list screen with sample data, showing upcoming deadlines
- [ ] Receipt detail screen
- [ ] Supabase project: database tables, sign-up and log-in
- [ ] Save receipts to Supabase (each user sees only their own)
- [ ] Snap a receipt → AI extraction → review and save
- [ ] Search the receipt vault
- [ ] Push reminders before deadlines (daily scheduled check)

### Phase 2: Rights engine
- [ ] Rules for Consumer Rights Act 2015 (30 days / 6 months / up to 6 years)
- [ ] Consumer Contracts Regulations 2013 (14-day cancellation)
- [ ] Section 75 and chargeback guidance based on payment method
- [ ] "It broke" flow: what you're owed and next steps
- [ ] Generated claim letter or email to the retailer
- [ ] Known retailer return policies
- [ ] Unit tests for every rule

### Phase 3: Subscriptions and automation
- [ ] Subscription tracker: cost, renewal date, trial end
- [ ] Renewal and trial-ending alerts
- [ ] Gmail / Outlook auto-capture (read-only)
- [ ] Keepr Premium subscription via RevenueCat
- [ ] Free-tier scan limit

### Phase 4: Partnerships and polish
- [ ] Retailer digital receipt integration
- [ ] Opt-in insurer offers (extended warranty when one is ending)
- [ ] PDF / CSV export
- [ ] Spending insights
- [ ] App Store and Google Play release

---

## Features (full list)

| Feature | Phase | Free / Premium |
|---|---|---|
| Snap a receipt, AI pulls out product, price, date | 1 | Free (limited scans) |
| Return, cancellation and warranty reminders | 1 | Free |
| Receipt vault with search | 1 | Free |
| "It broke, what am I owed?" | 2 | Premium |
| Claim letter generator | 2 | Premium |
| Subscription tracker and alerts | 3 | Premium |
| Email auto-capture | 3 | Premium |
| Export to PDF / CSV | 4 | Premium |
| Retailer and insurer partnerships | 4 | Revenue |

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
| **RevenueCat** | Handles Apple and Google subscriptions. Free until real revenue. |
| **Cloudflare R2** (if needed) | Cheap photo storage once Supabase's 1 GB fills up. |

---

## Decisions log

- **4 Nov 2026:** Chose Expo + TypeScript + Supabase to keep costs near £0 and use one language.
- **4 Nov 2026:** Prices stored in pence to avoid rounding errors.
- **4 Nov 2026:** Work goes in small PRs, opened about 12 hours apart, with no AI credits or reviewer notes.
- **5 Nov 2026:** Roadmap moved out of the README into this `PLAN.md`.
- **5 Nov 2026:** Every change goes through a PR with a summary. No direct pushes to `main`.

## Notes and to-dos

- Local Node is 20.14. Expo SDK 58 needs **22.13+**, so upgrade to run the app.
