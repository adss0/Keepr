# Run Keepr on your phone

There are three ways to get Keepr onto a phone. Start with option 1. It's free and takes a few minutes.

| | Option | Cost | Best for |
|---|---|---|---|
| 1 | **Expo Go** | Free | Trying the app while it's being built |
| 2 | **Android app file (APK)** | Free | A real installed app on Android |
| 3 | **iPhone build (TestFlight)** | Apple Developer account, £79/year | A real installed app on iPhone |

---

## Before you start

1. Install **Node.js 22.13 or newer** (the LTS version) from https://nodejs.org.
2. Check the version in a new terminal. It should show `v22` or higher:
   ```bash
   node -v
   ```
3. Install the project's dependencies once, from the Keepr folder:
   ```bash
   npm install
   ```

---

## Option 1: Expo Go (free, quickest)

Expo Go runs Keepr straight from your computer. Code changes appear on your phone in a second or two.

1. Install **Expo Go** on your phone:
   - [iPhone (App Store)](https://apps.apple.com/app/expo-go/id982107779)
   - [Android (Google Play)](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Connect your phone and computer to the **same Wi-Fi**.
3. Start the app from the Keepr folder:
   ```bash
   npm start
   ```
4. Scan the QR code shown in the terminal:
   - **iPhone:** open the Camera app and point it at the code.
   - **Android:** open Expo Go and tap **Scan QR code**.

Keepr opens inside Expo Go.

**If it doesn't connect** (for example, on a work or university network), start it in tunnel mode instead:

```bash
npm start -- --tunnel
```

**Things to know:**
- Your computer has to keep running `npm start` while you use the app.
- Reminders work in Expo Go, because they're local notifications sent by the phone itself.
- Only you can open it this way. To give Keepr to other people, use option 2 or 3.

---

## Option 2: Install on Android (free)

This builds a real `.apk` file that installs like any other app, and works without your computer.

1. Create a free account at https://expo.dev/signup.
2. Log in from the Keepr folder:
   ```bash
   npx eas-cli@latest login
   ```
3. Link the project to your Expo account (first time only):
   ```bash
   npx eas-cli@latest init
   ```
4. Build the Android app in Expo's cloud:
   ```bash
   npx eas-cli@latest build --platform android --profile preview
   ```
   This takes about 10–20 minutes. You don't need Android Studio.
5. When it finishes, the terminal shows a link and a QR code. Open the link on your Android phone and download the `.apk`.
6. Open the downloaded file and tap **Install**. If Android asks, allow installing apps from your browser.

To update the app later, run step 4 again and install the new file.

---

## Option 3: Install on iPhone (paid Apple account)

Apple only allows installed apps that are signed with a developer account.

1. Join the **Apple Developer Program** (£79/year) at https://developer.apple.com/programs/.
2. Do steps 1–3 from option 2 to set up your Expo account.
3. Build the iPhone app:
   ```bash
   npx eas-cli@latest build --platform ios --profile production
   ```
   EAS asks you to sign in to your Apple account and sets up the certificates for you.
4. Send it to TestFlight:
   ```bash
   npx eas-cli@latest submit --platform ios
   ```
5. Install the **TestFlight** app on your iPhone. Keepr appears there once Apple has processed the build, usually within an hour.

Until you're ready to pay for the Apple account, use **Expo Go** (option 1) on your iPhone.
