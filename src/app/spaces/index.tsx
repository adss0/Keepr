import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button, Field, Segmented } from "@/components/form";
import { Icon } from "@/components/icon";
import { PressScale } from "@/components/press-scale";
import { useToast } from "@/components/toast";
import { Fonts, useTheme } from "@/constants/theme";
import { useCloud } from "@/data/cloud";
import { haptics } from "@/data/haptics";
import { type SpaceKind, useSpaces } from "@/data/spaces";
import { KIND_LABELS, ROLE_LABELS } from "@/lib/spaces";
import { errorMessage } from "@/lib/format";

/** Lists your shared spaces, and lets you create one or join with an invite code. */
export default function SpacesScreen() {
  const theme = useTheme();
  const cloud = useCloud();
  const spaces = useSpaces();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SpaceKind>("family");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join">();
  const [error, setError] = useState<{ create?: string; join?: string }>({});

  // Someone may have added you, renamed a space or removed you since you last looked.
  useFocusEffect(
    useCallback(() => {
      spaces.refresh().catch(() => undefined);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spaces.refresh]),
  );

  async function create() {
    if (!name.trim()) {
      setError({ create: "Give your space a name, like “The Smiths” or “Acme finance”" });
      return;
    }
    setBusy("create");
    setError({});
    try {
      const id = await spaces.createSpace(name, kind);
      haptics.success();
      setName("");
      router.push({ pathname: "/spaces/[id]", params: { id } });
    } catch (createError) {
      haptics.error();
      setError({ create: errorMessage(createError) });
    } finally {
      setBusy(undefined);
    }
  }

  async function join() {
    if (code.replace(/[\s-]/g, "").length < 8) {
      setError({ join: "Enter the 8-character code you were sent" });
      return;
    }
    setBusy("join");
    setError({});
    try {
      const id = await spaces.joinSpace(code.replace(/-/g, ""));
      haptics.success();
      setCode("");
      showToast({ message: "You've joined. Shared receipts and subscriptions are syncing now." });
      router.push({ pathname: "/spaces/[id]", params: { id } });
    } catch (joinError) {
      haptics.error();
      setError({ join: errorMessage(joinError) });
    } finally {
      setBusy(undefined);
    }
  }

  const card = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }];

  if (cloud.status === "not_set_up" || spaces.status === "signed_out") {
    return (
      <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
        <Intro />
        <View style={card}>
          <Text style={[styles.title, { color: theme.text }]}>Sign in to share</Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            Shared spaces sync through your Keepr account, so everyone needs to be signed in.
          </Text>
          {cloud.status !== "not_set_up" && <Button title="Sign in" variant="primary" onPress={() => router.push("/account")} />}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Intro />

      {spaces.status === "unavailable" && (
        <View style={[styles.notice, { backgroundColor: theme.soonBg }]}>
          <Text style={[styles.body, { color: theme.soonText }]}>
            Sharing needs a one-time database update: run the shared spaces migration from docs/cloud-setup.md.
          </Text>
        </View>
      )}
      {spaces.status === "error" && (
        <Text style={[styles.body, { color: theme.urgentText }]}>Couldn&apos;t load your spaces: {spaces.error}</Text>
      )}

      {spaces.status === "loading" && <ActivityIndicator color={theme.accent} />}

      {spaces.spaces.length > 0 && (
        <View style={styles.list}>
          <Text accessibilityRole="header" style={[styles.section, { color: theme.textMuted }]}>
            Your spaces
          </Text>
          {spaces.spaces.map((space) => (
            <PressScale
              key={space.id}
              accessibilityRole="button"
              accessibilityLabel={`${space.name}, ${KIND_LABELS[space.kind]}, ${space.members.length} members`}
              onPress={() => router.push({ pathname: "/spaces/[id]", params: { id: space.id } })}
              style={StyleSheet.flatten([styles.spaceRow, { backgroundColor: theme.card, borderColor: theme.border }])}
            >
              <View style={[styles.spaceIcon, { backgroundColor: theme.accentSoft }]}>
                <Icon name="people" size={20} color={theme.accent} />
              </View>
              <View style={styles.spaceText}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                  {space.name}
                </Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {KIND_LABELS[space.kind]} · {space.members.length === 1 ? "just you" : `${space.members.length} people`} ·{" "}
                  {ROLE_LABELS[space.myRole]}
                </Text>
              </View>
              <Icon name="chevronRight" size={16} color={theme.textMuted} />
            </PressScale>
          ))}
        </View>
      )}

      <View style={card}>
        <Text style={[styles.title, { color: theme.text }]}>Create a space</Text>
        <Field
          label="Name"
          placeholder="e.g. The Smiths"
          value={name}
          onChangeText={setName}
          maxLength={60}
          error={error.create}
        />
        <Segmented
          label="For"
          value={kind}
          options={[
            { value: "family", label: "Family or household" },
            { value: "organization", label: "Organisation" },
          ]}
          onChange={setKind}
        />
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          {kind === "family"
            ? "Everyone can add, edit and delete shared items."
            : "Everyone can add and edit. Only owners and admins can delete shared items or invite people."}
        </Text>
        <Button title="Create space" variant="primary" busy={busy === "create"} onPress={create} />
      </View>

      <View style={card}>
        <Text style={[styles.title, { color: theme.text }]}>Join with an invite code</Text>
        <Field
          label="Invite code"
          placeholder="e.g. K7MP-2QXA"
          autoCapitalize="characters"
          autoCorrect={false}
          value={code}
          onChangeText={setCode}
          maxLength={12}
          error={error.join}
        />
        <Button title="Join space" busy={busy === "join"} onPress={join} />
      </View>
    </ScrollView>
  );
}

function Intro() {
  const theme = useTheme();
  return (
    <View style={styles.intro}>
      <View style={[styles.introIcon, { backgroundColor: theme.accentSoft }]}>
        <Icon name="people" size={28} color={theme.accent} />
      </View>
      <Text style={[styles.introTitle, { color: theme.text }]}>Keep receipts together</Text>
      <Text style={[styles.body, { color: theme.textMuted, textAlign: "center" }]}>
        Share receipts and subscriptions with your family or team. Everyone in a space sees the same deadlines, gets the
        reminders, and can add to it. Personal items stay private.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },
  intro: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  introIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  introTitle: {
    fontSize: 22,
    letterSpacing: -0.3,
    fontFamily: Fonts.display,
  },
  notice: {
    borderRadius: 14,
    padding: 14,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  list: {
    gap: 8,
  },
  section: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  spaceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
  },
  spaceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  spaceText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -6,
  },
});
