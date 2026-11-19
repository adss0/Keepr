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
- ✅ AI receipt scanning: photo → Supabase Edge Function → Google Gemini (free tier) → form filled in
- ✅ Scan without an account (anonymous scan session)
- ✅ App layout with tabs: Receipts, Calendar, Subscriptions, Insights and Settings
- ✅ Settings: reminder timing, defaults for new receipts, and Light/Dark/Automatic theme
- ✅ Calendar of every deadline, renewal and free-trial end
- ✅ Spending insights and an Excel spending breakdown
- ✅ Receipt photos kept as proof of purchase, backed up to Supabase Storage
- ✅ Multi-item receipts (pick one item or add them all), and scanning PDFs and screenshots
- ✅ Save a receipt as a PDF with its deadlines and photo
- ✅ Receipt-paper look, a Next deadline card, and fixes from a full test of every screen
- ✅ Shared spaces for families and organisations: invites, roles, shared receipts and subscriptions, live sync
- ✅ Mark receipts as returned, claimed or archived (no more reminders, kept as history; returned ones don't count as spending), and swipe a receipt row to archive or delete it
- ✅ Usual return windows of common UK shops fill themselves in (Argos, John Lewis, M&S, Next, Amazon, IKEA and more), with a reminder to check the receipt
- ✅ Share into Keepr: share a photo, screenshot or PDF from any app and it opens in Add receipt and is scanned (needs a development build, not Expo Go)
- ✅ Search inside receipts: scanning keeps every word printed on the receipt, and search looks through them
- ✅ Opening animation: a receipt prints out of a till slot and is stamped "Kept", then the home screen rises in. Keepr's own type: Fraunces for titles and big figures, IBM Plex Mono for prices and deadlines
- ✅ Export screen: pick the dates (this month, 3 months, this year, last year, all, or your own), whether to include finished receipts, photos and subscriptions, then save a PDF of all those receipts, a CSV or an Excel breakdown
- ✅ Receipt photos on the web: signed-in users upload straight to the cloud
- ✅ Attach a receipt photo when adding by hand, choose camera or library when replacing it, and a one-time opening animation with a matching splash
- ⏭️ **Next:** email auto-capture

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
- [x] Snap a receipt → AI extraction → review and save
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
- [x] CSV export, Excel spending breakdown and single-receipt PDF
- [x] Spending insights
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
| Export to PDF / CSV / Excel | 4 |
| Calendar of deadlines and renewals | 3 |
| Spending insights | 4 |
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
| **Google Gemini** (free tier) | Reads messy receipts straight into structured data, at no cost while in development. |
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

- Receipts are saved on the phone with AsyncStorage (works in Expo Go and on the web). A new install starts empty and shows one blurred example receipt; the old sample receipts were removed (and cleaned up once from phones that had them). If saved data can't be read at startup, nothing is written back, so a bad read can't wipe it.
- Return windows are capped at 10 years, warranties at 100 years and prices at £1,000,000, so a typo can't produce a date too far away to calculate.

- Reminders are local notifications scheduled by the phone, so they need no server and work in Expo Go. All are rescheduled whenever receipts change, capped at 60 (iOS allows 64).

- The rights engine is plain TypeScript rules with tests at every boundary (day 30/31, 6 months, 6 years, £100 for Section 75). Legal dates always show the year.

- Subscriptions roll their renewal date forward automatically by whole billing cycles, counting from the original date so the 31st stays the 31st.

- Cloud sync is optional and only on when `.env` has the Supabase URL and publishable key. The phone is the main copy: sign-in merges cloud items in (phone wins on a clash), and phone deletes are pushed to the cloud. Deletes made on another phone aren't pulled down yet.
- Row level security on every table: users can only read or change their own rows.

- AI scanning runs in a Supabase Edge Function so the API key stays on the server. Users always check the details before saving.
- Switched scanning from Claude to Google Gemini (`gemini-3.5-flash-lite`) to use Gemini's free tier. Trade-off: Google may use free-tier inputs to improve its products, so move to a paid plan before real users.

- `npm start` checks the Node.js version first, because Expo SDK 58 crashes on Node below 22.13 with "URL.parse is not a function".

- Forgot password uses Supabase's emailed reset link, which reopens Keepr at /reset-password. Email templates can't be edited on the free plan without custom SMTP, so a code-based reset isn't possible yet.

- Scanning is one tap from home: the Scan button opens Add receipt with the camera already open (on phones; browsers need a second tap), and the form says how many details were filled in.
- Signed-out users can scan too: the app opens a hidden anonymous Supabase session just for the scan function (needs **Allow anonymous sign-ins** in Supabase). It never counts as signed in and never syncs.
- Motion is kept small and purposeful: buttons and receipt cards shrink slightly while pressed, toasts slide up, and scan results fade in. Reduce Motion swaps the press shrink for a dim. Screens keep the native transitions.

- Deleting a receipt or subscription happens straight away with an Undo message, instead of an "Are you sure?" box.
- Navigation uses native tabs on phones (`expo-router/native-tabs`) and a custom bottom bar on the web. Tab screens draw their own large-title header; detail and form screens open on top in the root stack.
- Settings are saved on the phone, not synced: reminder lead time (1, 3, 7 or 14 days), last-day reminder, reminder hour, default channel and payment method, and theme. Reminder syncs and cloud pushes each run one at a time, so overlapping runs can't duplicate notifications or bring back deleted receipts.
- Icons come from `expo-symbols`: SF Symbols on iOS, Material Symbols on Android and the web.
- Excel files are written by a small in-house `.xlsx` writer on top of `fflate`, rather than SheetJS, whose npm release is old and has security advisories. Cells are text or numbers, never formulas.
- Receipt photos are files in the app's documents folder, named after the receipt, and backed up to a private `receipt-photos` bucket at `<user id>/<file>`. Photo backup never blocks the main sync. Browsers have no app folder, so the web only shows backed-up photos.
- Anonymous scan sessions are blocked from all tables and photos by restrictive row level security policies.
- Look ("Thermal print"): receipt-paper white, near-black ink for buttons and hero cards, and a tomato-red accent like a till stamp, all from Radix Colors (Sand, Tomato, Amber, Indigo) with matched dark mode. Motion is mechanical: short and firm, and the opening receipt feeds out in steps like a thermal printer; receipt cards have a dashed tear line. The home screen leads with the single most urgent deadline in the next 30 days.
- Shared spaces: a space is a Family (anyone can delete shared items) or an Organisation (only owners and admins delete or invite). Items have an optional `space_id`; without one they stay personal. Invites are 8-character codes valid for 7 days, made and redeemed only through database functions so roles can't be forged. Deleting a space hands its items back to whoever added them.
- Sync with several editors: each phone keeps a snapshot of what the cloud held at its last sync. Unpushed changes on the phone win; otherwise the cloud's copy wins, and items gone from the cloud are deleted locally. No clocks are compared. Pushes send only changed rows. Pulls run on Realtime changes and when the app returns to the front.
- Scanning returns every item on the receipt; the form lets you pick one, or add each as its own receipt with a copy of the photo. PDFs go to Gemini as documents. Receiving files from the system share sheet needs a native share extension, so it waits for a development build.
- Dates are picked with the native date picker on phones and the browser's date input on the web, with Today/Yesterday shortcuts for purchase dates.

## Notes and to-dos

- Before launch: move Gemini scanning to a paid plan (or another provider) so receipt photos aren't used for training.

- Harden sign-in storage: keep the Supabase session encrypted (expo-secure-store) instead of AsyncStorage.
- Apply migrations `20261117000000_receipt_photos_and_anonymous_guard.sql` `20261118000000_shared_spaces.sql` and `20261119000000_receipt_status.sql`, `20261120000000_receipt_printed_text.sql` to the Supabase project, and redeploy `extract-receipt` for item lists and PDF scanning. Until then the app falls back gracefully (unknown columns are dropped when syncing, no item list, PDFs refused, sharing shows that it needs the update).
- Shared spaces later: transfer ownership, change a member's role after joining, and per-space reminder settings.
