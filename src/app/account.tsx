import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button, Field } from "@/components/form";
import { useTheme } from "@/constants/theme";
import { useToast } from "@/components/toast";
import { useCloud } from "@/data/cloud";
import { useSpaces } from "@/data/spaces";
import { STATUS_TEXT } from "@/lib/cloud-status";
import { errorMessage } from "@/lib/format";

/** Google's "G" mark, as Google's sign-in branding asks for on the button. */
const GOOGLE_G =
  "data:image/svg+xml;base64," +
  "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCI+PHBhdGggZmlsbD0iI0VBNDMzNSIgZD0iTTI0IDkuNWMzLjU0IDAgNi43MSAxLjIyIDkuMjEgMy42bDYuODUtNi44NUMzNS45IDIuMzggMzAuNDcgMCAyNCAwIDE0LjYyIDAgNi41MSA1LjM4IDIuNTYgMTMuMjJsNy45OCA2LjE5QzEyLjQzIDEzLjcyIDE3Ljc0IDkuNSAyNCA5LjV6Ii8+PHBhdGggZmlsbD0iIzQyODVGNCIgZD0iTTQ2Ljk4IDI0LjU1YzAtMS41Ny0uMTUtMy4wOS0uMzgtNC41NUgyNHY5LjAyaDEyLjk0Yy0uNTggMi45Ni0yLjI2IDUuNDgtNC43OCA3LjE4bDcuNzMgNmM0LjUxLTQuMTggNy4wOS0xMC4zNiA3LjA5LTE3LjY1eiIvPjxwYXRoIGZpbGw9IiNGQkJDMDUiIGQ9Ik0xMC41MyAyOC41OWMtLjQ4LTEuNDUtLjc2LTIuOTktLjc2LTQuNTlzLjI3LTMuMTQuNzYtNC41OWwtNy45OC02LjE5Qy45MiAxNi40NiAwIDIwLjEyIDAgMjRjMCAzLjg4LjkyIDcuNTQgMi41NiAxMC43OGw3Ljk3LTYuMTl6Ii8+PHBhdGggZmlsbD0iIzM0QTg1MyIgZD0iTTI0IDQ4YzYuNDggMCAxMS45My0yLjEzIDE1Ljg5LTUuODFsLTcuNzMtNmMtMi4xNSAxLjQ1LTQuOTIgMi4zLTguMTYgMi4zLTYuMjYgMC0xMS41Ny00LjIyLTEzLjQ3LTkuOTFsLTcuOTggNi4xOUM2LjUxIDQyLjYyIDE0LjYyIDQ4IDI0IDQ4eiIvPjwvc3ZnPg==";

function GoogleButton() {
  const theme = useTheme();
  const { signInWithGoogle } = useCloud();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <View style={styles.form}>
      <Button
        title="Continue with Google"
        busy={busy}
        icon={busy ? undefined : <Image source={{ uri: GOOGLE_G }} style={styles.googleMark} accessibilityIgnoresInvertColors />}
        onPress={async () => {
          setBusy(true);
          setError(undefined);
          try {
            await signInWithGoogle();
          } catch (signInError) {
            setError(errorMessage(signInError));
          } finally {
            setBusy(false);
          }
        }}
      />
      {error && <Text style={[styles.body, { color: theme.urgentText }]}>{error}</Text>}
      <View style={styles.divider}>
        <View style={[styles.rule, { backgroundColor: theme.border }]} />
        <Text style={[styles.body, { color: theme.textMuted }]}>or use your email</Text>
        <View style={[styles.rule, { backgroundColor: theme.border }]} />
      </View>
    </View>
  );
}

function SignInForm() {
  const theme = useTheme();
  const { signIn, signUp } = useCloud();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<string | void>) {
    if (!email.trim() || password.length < 8) {
      setError("Enter your email and a password of at least 8 characters");
      return;
    }
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const result = await action();
      if (result) setMessage(result);
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.form}>
      <Text style={[styles.body, { color: theme.textMuted }]}>
        Sign in to back up your receipts and subscriptions, and use them on more than one phone. Everything still works
        without an account.
      </Text>
      <GoogleButton />
      <Field
        label="Email"
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Field
        label="Password"
        placeholder="At least 8 characters"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
        error={error}
      />
      {message && <Text style={[styles.body, { color: theme.text }]}>{message}</Text>}
      <Button title="Sign in" variant="primary" busy={busy} onPress={() => run(() => signIn(email, password))} />
      <Button title="Create an account" onPress={() => run(() => signUp(email, password))} />
      <Button
        title="Forgot password?"
        variant="ghost"
        onPress={() => router.push({ pathname: "/reset-password", params: { email: email.trim() } })}
      />
    </View>
  );
}

/** The name others see in shared spaces. Asks for one when the account has none yet (email sign-ups). */
function NameCard() {
  const theme = useTheme();
  const { displayName } = useCloud();
  const { setMyNameEverywhere } = useSpaces();
  const { showToast } = useToast();
  const [name, setName] = useState(displayName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const asking = !displayName;

  return (
    <View
      style={[
        styles.card,
        styles.form,
        { backgroundColor: asking ? theme.accentSoft : theme.card, borderColor: asking ? theme.accent : theme.border },
      ]}
    >
      <Text style={[styles.status, { color: theme.text }]}>{asking ? "What should we call you?" : "Your name"}</Text>
      <Field
        label="Name"
        hint="People in your shared spaces see this next to what you add."
        placeholder="For example, Sam"
        autoComplete="name"
        value={name}
        onChangeText={setName}
        maxLength={60}
        error={error}
      />
      <Button
        title="Save name"
        variant={asking ? "primary" : undefined}
        busy={busy}
        onPress={async () => {
          setBusy(true);
          setError(undefined);
          try {
            await setMyNameEverywhere(name);
            showToast({ message: "Name saved" });
          } catch (saveError) {
            setError(errorMessage(saveError));
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}

export default function AccountScreen() {
  const theme = useTheme();
  const cloud = useCloud();
  const { completeSignInRedirect } = cloud;
  const [redirectError, setRedirectError] = useState<string>();

  // On the web, Google sends the browser back here with the sign-in in the address. Finish it, then tidy the address.
  useEffect(() => {
    const returning = Platform.OS === "web" && /access_token|error_description/.test(window.location.href);
    if (!returning) return;
    // Expo Router keeps the part after "#" as the "#" param and writes it back into the address, so clear it there.
    completeSignInRedirect(window.location.href)
      .catch((error: unknown) => setRedirectError(errorMessage(error)))
      .finally(() => router.setParams({ "#": undefined }));
  }, [completeSignInRedirect]);
  const card = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }];

  const signedIn = !!cloud.email;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={card}>
        <Text style={[styles.status, { color: cloud.status === "error" ? theme.urgentText : theme.text }]}>
          {STATUS_TEXT[cloud.status]}
        </Text>
        {cloud.lastSyncedAt && (
          <Text style={[styles.body, { color: theme.textMuted }]}>
            Last synced at {cloud.lastSyncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}
        {cloud.error && <Text style={[styles.body, { color: theme.urgentText }]}>{cloud.error}</Text>}
        {!signedIn && cloud.notice && <Text style={[styles.body, { color: theme.text }]}>{cloud.notice}</Text>}
        {redirectError && <Text style={[styles.body, { color: theme.urgentText }]}>{redirectError}</Text>}
        {signedIn && <Button title="Sync now" onPress={cloud.syncNow} />}
      </View>

      {cloud.status === "not_set_up" && (
        <Text style={[styles.body, { color: theme.textMuted }]}>
          Keepr is saving everything on this phone. To turn on sign-in, cloud backup and AI receipt scanning, follow
          docs/cloud-setup.md in the Keepr project.
        </Text>
      )}

      {cloud.status === "signed_out" && <SignInForm />}

      {signedIn && (
        <>
          <SectionTitle title="Profile" />
          <NameCard key={cloud.displayName ?? ""} />
          <View style={card}>
            <Row label="Email" value={cloud.email ?? ""} />
            <Row label="Signs in with" value={signInMethods(cloud.providers)} divided />
          </View>

          <SectionTitle title="Security" />
          {cloud.providers.includes("email") && <ChangePassword />}
          <SecurityActions />
        </>
      )}
    </ScrollView>
  );
}

/** "Google, or email and password", from the account's sign-in methods. */
function signInMethods(providers: string[]): string {
  const names = providers.map((provider) =>
    provider === "email" ? "email and password" : provider[0].toUpperCase() + provider.slice(1),
  );
  const text = names.join(", or ") || "Email and password";
  return text[0].toUpperCase() + text.slice(1);
}

function SectionTitle({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.textMuted }]}>
      {title}
    </Text>
  );
}

function Row({ label, value, divided }: { label: string; value: string; divided?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, divided && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
      <Text style={[styles.body, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.body, styles.rowValue, { color: theme.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** For email accounts: a new password, used from the next sign-in on. */
function ChangePassword() {
  const theme = useTheme();
  const { updatePassword } = useCloud();
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <View style={[styles.card, styles.form, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Field
        label="New password"
        placeholder="At least 8 characters"
        secureTextEntry
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
        error={error}
      />
      <Button
        title="Change password"
        busy={busy}
        onPress={async () => {
          if (password.length < 8) {
            setError("Use at least 8 characters");
            return;
          }
          setBusy(true);
          setError(undefined);
          try {
            await updatePassword(password);
            setPassword("");
            showToast({ message: "Password changed" });
          } catch (changeError) {
            setError(errorMessage(changeError));
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}

function SecurityActions() {
  const theme = useTheme();
  const { signOut, signOutOtherDevices } = useCloud();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  return (
    <View style={styles.form}>
      <Button
        title="Sign out on other devices"
        busy={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await signOutOtherDevices();
            showToast({ message: "Signed out everywhere else" });
          } catch (signOutError) {
            showToast({ message: `Couldn't sign out other devices: ${errorMessage(signOutError)}` });
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button title="Sign out" variant="danger" onPress={signOut} />
      <Text style={[styles.body, { color: theme.textMuted }]}>
        Signing out keeps your receipts on this phone. Other devices stay signed in until they sign out themselves.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  googleMark: {
    width: 18,
    height: 18,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  status: {
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: -8,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
  },
  rowValue: {
    flexShrink: 1,
    fontWeight: "600",
  },
});
