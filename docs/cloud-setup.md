# Cloud sync and AI scanning setup (Supabase)

Keepr works fully on the phone with no accounts. This guide turns on the optional cloud features:

- **Sign in and cloud backup:** receipts and subscriptions are saved to your own Supabase database, so they survive a lost phone and appear on every device you sign in on.
- **AI receipt scanning:** take a photo of a receipt and Google Gemini fills in the product, shop, price, date and payment method for you.

Supabase's free tier is enough for Keepr.

---

## 1. Create a Supabase project

1. Sign up at https://supabase.com and click **New project**.
2. Pick a name (for example `keepr`), set a database password, and choose the **London** region (closest to UK users).
3. Wait a minute or two for it to start.

## 2. Create the tables

1. In your project, open **SQL Editor** and click **New query**.
2. Copy everything in [`supabase/migrations/20261112000000_receipts_and_subscriptions.sql`](../supabase/migrations/20261112000000_receipts_and_subscriptions.sql), paste it in, and click **Run**.

This creates the `receipts` and `subscriptions` tables with **row level security**, so each person can only ever read or change their own data.

> If you use the Supabase CLI instead, run `npx supabase link` and then `npx supabase db push` from the Keepr folder.

## 3. Connect the app

1. In Supabase, open **Project Settings → API Keys** and copy the **Project URL** and the **publishable key** (starts with `sb_publishable_`).
   Never put the **secret** key in the app.
2. In the Keepr folder, copy `.env.example` to a new file called `.env` and paste the two values in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   `.env` is ignored by git, so it won't be uploaded to GitHub.
3. Restart the app (`npm start`). **Account and sync** at the bottom of the receipts list now shows a sign-in form.

## 4. Sign in

1. In Keepr, open **Account and sync** and tap **Create an account**.
2. Supabase emails you a confirmation link. Tap it, then come back and **Sign in**.
3. Your receipts and subscriptions upload straight away, and every change after that is saved within a second.

To turn off email confirmation while testing, open **Authentication → Sign In / Providers → Email** in Supabase and switch off **Confirm email**.

## 5. Turn on AI receipt scanning

Scanning runs in a Supabase **Edge Function** ([`supabase/functions/extract-receipt`](../supabase/functions/extract-receipt/index.ts)). The app sends the photo to the function, and the function asks **Google Gemini** (`gemini-3.5-flash-lite`, on Gemini's free tier) to read it. Your Gemini API key is stored as a secret on Supabase, so it is never inside the app.

1. Get a free Gemini API key at https://aistudio.google.com/apikey (sign in with a Google account, then **Create API key**). No card is needed for the free tier.
2. Log in to Supabase from the Keepr folder and link the project (the project ref is the part before `.supabase.co` in your URL):
   ```bash
   npx supabase login
   ```
   ```bash
   npx supabase link --project-ref your-project-ref
   ```
3. Save the Gemini key as a secret:
   ```bash
   npx supabase secrets set GEMINI_API_KEY=your-gemini-key
   ```
4. Deploy the function:
   ```bash
   npx supabase functions deploy extract-receipt
   ```
5. In Keepr, sign in, tap **Add**, then **Scan a receipt**. Check the details it fills in, then save.

Only signed-in users can use the function, because Supabase checks their sign-in before it runs.

**About the free tier:**
- **Daily limits:** it has request limits per minute and per day. If you hit them, Keepr shows "Too many scans right now".
- **Data use:** Google may use what's sent on the free tier to improve its products, so receipt photos may be seen by Google. For real users, switch the key to a paid Gemini plan, or move scanning to a provider that doesn't use your data.
- **Changing models:** if Google retires the model, change `MODEL` at the top of the function and deploy again.

## Phone builds (EAS)

`.env` is only read on your computer. For builds made with EAS (see [Run Keepr on your phone](run-on-your-phone.md)), add the same two values to your Expo project once:

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://abcdefgh.supabase.co --environment preview --environment production --visibility plaintext
```

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_... --environment preview --environment production --visibility plaintext
```

## How sync works

- The phone is the main copy. Keepr keeps working offline and saves to the cloud when it can.
- When you sign in on a phone, anything in the cloud that isn't on it yet is added. If the same item is on both, the phone's version wins.
- Deleting a receipt or subscription on the phone deletes it from the cloud too.
- Signing out keeps everything on the phone.
