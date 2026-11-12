# Cloud sync setup (Supabase)

Keepr works fully on the phone with no accounts. This guide turns on the optional cloud features:

- **Sign in and cloud backup:** receipts and subscriptions are saved to your own Supabase database, so they survive a lost phone and appear on every device you sign in on.

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
