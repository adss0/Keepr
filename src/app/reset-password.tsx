import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { Button, Field } from "@/components/form";
import { useTheme } from "@/constants/theme";
import { useCloud } from "@/data/cloud";

const MIN_PASSWORD_LENGTH = 8;

type Step = "email" | "sent" | "new_password" | "done";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Forgot password. Keepr emails a reset link; opening it on this device brings you back here
 * signed in, ready to choose a new password.
 */
export default function ResetPasswordScreen() {
  const theme = useTheme();
  const { sendPasswordResetEmail, startPasswordRecovery, updatePassword } = useCloud();
  const params = useLocalSearchParams<{ email?: string }>();
  const url = Linking.useLinkingURL();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(params.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // Opened from the reset link: sign in with its tokens, then ask for the new password.
  useEffect(() => {
    if (!url?.includes("#")) return;
    let cancelled = false;
    startPasswordRecovery(url)
      .then((recovering) => {
        if (!cancelled && recovering) setStep("new_password");
      })
      .catch((recoveryError: unknown) => {
        if (cancelled) return;
        setError(`${messageOf(recoveryError)}. Send yourself a new link below.`);
        setStep("email");
      });
    return () => {
      cancelled = true;
    };
  }, [url, startPasswordRecovery]);

  async function sendLink() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter the email you signed up with");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await sendPasswordResetEmail(email);
      setStep("sent");
    } catch (sendError) {
      setError(messageOf(sendError));
    } finally {
      setBusy(false);
    }
  }

  async function savePassword() {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await updatePassword(password);
      setStep("done");
    } catch (updateError) {
      setError(messageOf(updateError));
    } finally {
      setBusy(false);
    }
  }

  const body = [styles.body, { color: theme.textMuted }];

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {step === "email" && (
        <>
          <Text style={body}>
            Enter the email you use for Keepr and we&apos;ll send you a link to choose a new password.
          </Text>
          <Field
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={sendLink}
            returnKeyType="send"
            error={error}
          />
          <Button title={busy ? "Sending…" : "Send reset link"} variant="primary" onPress={sendLink} />
        </>
      )}

      {step === "sent" && (
        <>
          <Text style={[styles.title, { color: theme.text }]}>Check your email</Text>
          <Text style={body}>
            We&apos;ve sent a reset link to {email.trim()}. Open it on this phone (or in this browser) and Keepr will
            open here so you can choose a new password. It can take a minute to arrive, so check your spam folder too.
          </Text>
          <Button title="Send it again" onPress={sendLink} />
          <Button title="Use a different email" variant="ghost" onPress={() => setStep("email")} />
        </>
      )}

      {step === "new_password" && (
        <>
          <Text style={[styles.title, { color: theme.text }]}>Choose a new password</Text>
          <Field
            label="New password"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={savePassword}
            returnKeyType="done"
            error={error}
          />
          <Button title={busy ? "Saving…" : "Save new password"} variant="primary" onPress={savePassword} />
        </>
      )}

      {step === "done" && (
        <>
          <Text style={[styles.title, { color: theme.text }]}>Password changed</Text>
          <Text style={body}>You&apos;re signed in, and your receipts are syncing.</Text>
          <Button title="Back to your receipts" variant="primary" onPress={() => router.replace("/")} />
        </>
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
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
});
