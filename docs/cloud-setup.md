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
3. Do the same with [`supabase/migrations/20261117000000_receipt_photos_and_anonymous_guard.sql`](../supabase/migrations/20261117000000_receipt_photos_and_anonymous_guard.sql).

This creates the `receipts` and `subscriptions` tables with **row level security**, so each person can only ever read or change their own data. The second file adds a private `receipt-photos` storage bucket for receipt photos (each person can only reach their own folder), and stops the anonymous sessions used for signed-out scanning from reading or writing any data.

**Already ran the first file in the SQL Editor?** If you then switch to the CLI, tell it that file is done before pushing, or it tries to create the tables again:

```bash
npx supabase migration repair --status applied 20261112000000
```

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

## 4. Allow Keepr's addresses for sign-in links

Supabase only sends people back to addresses on its allow list. This is needed for the confirmation link and for **Forgot password?** links.

1. Open **Authentication → URL Configuration**.
2. Set **Site URL** to `http://localhost:8081`, then click **Save changes**.
3. Under **Redirect URLs**, click **Add URL** and add these three:
   - `http://localhost:8081/**` (the web app)
   - `exp://**` (Expo Go on your phone)
   - `keepr://**` (the installed app)

   Then click **Save URLs**.

## 5. Sign in

1. In Keepr, open **Account and sync** and tap **Create an account**.
2. Supabase emails you a confirmation link. Tap it, then come back and **Sign in**.
3. Your receipts and subscriptions upload straight away, and every change after that is saved within a second.

**Forgot your password?** Tap **Forgot password?** under the sign-in form. Keepr emails you a link. Open it on the same phone (or in the same browser), and Keepr opens on a screen to choose a new password.

To turn off email confirmation while testing, open **Authentication → Sign In / Providers → Email** in Supabase and switch off **Confirm email**.

## 6. Turn on AI receipt scanning

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
   npx supabase functions deploy extract-receipt --no-verify-jwt
   ```
5. To let people scan without an account, open **Authentication → Sign In / Providers** in Supabase and turn on **Allow anonymous sign-ins**. Keepr then gives signed-out users a hidden anonymous session just for scanning. It never syncs their receipts. Leave it off if you only want signed-in users to scan.
6. In Keepr, tap **Add**, then **Scan a receipt**. Check the details it fills in, then save.

Only Keepr app sessions can use the function (signed-in or anonymous): it asks Supabase Auth to confirm each caller's session first. Supabase limits anonymous sign-ins to 30 an hour per IP address by default (**Authentication → Rate Limits**). Keep **Verify JWT with legacy secret** turned off for this function (that's what `--no-verify-jwt` does), because that older check would also let anyone with the app's public key use your Gemini quota.

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
