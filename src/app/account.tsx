import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button, Field } from "@/components/form";
import { useTheme } from "@/constants/theme";
import { type CloudStatus, useCloud } from "@/data/cloud";

const STATUS_TEXT: Record<CloudStatus, string> = {
  not_set_up: "Cloud sync isn't set up",
  signed_out: "Not signed in",
  syncing: "Syncing…",
  synced: "Backed up",
  error: "Couldn't sync",
};

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
      setError(actionError instanceof Error ? actionError.message : String(actionError));
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
      <Button title={busy ? "Please wait…" : "Sign in"} variant="primary" onPress={() => run(() => signIn(email, password))} />
      <Button title="Create an account" onPress={() => run(() => signUp(email, password))} />
    </View>
  );
}

export default function AccountScreen() {
  const theme = useTheme();
  const cloud = useCloud();
  const card = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }];

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
        {cloud.email && <Text style={[styles.body, { color: theme.textMuted }]}>Signed in as {cloud.email}</Text>}
        {cloud.lastSyncedAt && (
          <Text style={[styles.body, { color: theme.textMuted }]}>
            Last synced at {cloud.lastSyncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}
        {cloud.error && <Text style={[styles.body, { color: theme.urgentText }]}>{cloud.error}</Text>}
      </View>

      {cloud.status === "not_set_up" && (
        <Text style={[styles.body, { color: theme.textMuted }]}>
          Keepr is saving everything on this phone. To turn on sign-in and cloud backup, follow
          docs/cloud-setup.md in the Keepr project.
        </Text>
      )}

      {cloud.status === "signed_out" && <SignInForm />}

      {cloud.email && (
        <View style={styles.form}>
          <Button title="Sync now" variant="primary" onPress={cloud.syncNow} />
          <Button title="Sign out" onPress={cloud.signOut} />
          <Text style={[styles.body, { color: theme.textMuted }]}>
            Signing out keeps your receipts on this phone.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
});
