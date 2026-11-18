import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { Button, Field, Segmented } from "@/components/form";
import { useToast } from "@/components/toast";
import { Fonts, useTheme } from "@/constants/theme";
import { useCloud } from "@/data/cloud";
import { haptics } from "@/data/haptics";
import { useReceipts } from "@/data/receipts";
import { canManage, useSpaces } from "@/data/spaces";
import { useSubscriptions } from "@/data/subscriptions";
import { formatInviteCode, KIND_LABELS, ROLE_LABELS } from "@/lib/spaces";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Asks before something that can't be undone. Browsers get their own confirm box. */
function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: action, style: "destructive", onPress: onConfirm },
  ]);
}

/** One shared space: its members, inviting people, and leaving or deleting it. */
export default function SpaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { userId } = useCloud();
  const spaces = useSpaces();
  const { showToast } = useToast();
  const receipts = useReceipts();
  const { subscriptions } = useSubscriptions();
  const space = spaces.spaces.find((item) => item.id === id);
  const me = space?.members.find((member) => member.userId === userId);

  const [invite, setInvite] = useState<string>();
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [name, setName] = useState(space?.name ?? "");
  const [myName, setMyName] = useState(me?.displayName ?? "");
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();

  if (!space) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: "Space" }} />
        <Text style={{ color: theme.textMuted }}>
          {spaces.status === "loading" ? "Loading…" : "This space doesn't exist, or you're no longer in it."}
        </Text>
      </View>
    );
  }

  const manager = canManage(space);
  const sharedReceipts = receipts.filter((receipt) => receipt.spaceId === space.id).length;
  const sharedSubscriptions = subscriptions.filter((subscription) => subscription.spaceId === space.id).length;
  const card = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }];

  async function act(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(undefined);
    try {
      await action();
    } catch (actionError) {
      haptics.error();
      setError(messageOf(actionError));
    } finally {
      setBusy(undefined);
    }
  }

  const shareInvite = (code: string) =>
    Share.share({
      message: `Join “${space.name}” on Keepr to share receipts and subscriptions. Open Keepr, go to Settings → Shared spaces, and enter this code: ${formatInviteCode(code)} (valid for 7 days).`,
    }).catch(() => undefined);

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: space.name }} />

      <View style={[styles.hero, { backgroundColor: theme.accent }]}>
        <Text style={[styles.heroKind, { color: theme.onAccent }]}>{KIND_LABELS[space.kind]}</Text>
        <Text style={[styles.heroName, { color: theme.onAccent }]}>{space.name}</Text>
        <Text style={[styles.heroMeta, { color: theme.onAccent }]}>
          {space.members.length === 1 ? "Just you so far" : `${space.members.length} people`} · {sharedReceipts}{" "}
          {sharedReceipts === 1 ? "receipt" : "receipts"} · {sharedSubscriptions}{" "}
          {sharedSubscriptions === 1 ? "subscription" : "subscriptions"}
        </Text>
      </View>

      {error && <Text style={[styles.body, { color: theme.urgentText }]}>{error}</Text>}

      {manager && (
        <View style={card}>
          <Text style={[styles.title, { color: theme.text }]}>Invite people</Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            Send a code. Anyone with it can join for the next 7 days.
          </Text>
          {space.kind === "organization" && (
            <Segmented
              label="They join as"
              value={inviteRole}
              options={[
                { value: "member", label: "Member" },
                { value: "admin", label: "Admin" },
              ]}
              onChange={setInviteRole}
            />
          )}
          {invite ? (
            <View style={[styles.codeBox, { backgroundColor: theme.accentSoft }]}>
              <Text selectable accessibilityLabel={`Invite code ${invite.split("").join(" ")}`} style={[styles.code, { color: theme.accent }]}>
                {formatInviteCode(invite)}
              </Text>
              <Text style={[styles.hint, { color: theme.textMuted }]}>Valid for 7 days</Text>
            </View>
          ) : null}
          {invite ? (
            <Button title="Share code" variant="primary" icon={undefined} onPress={() => shareInvite(invite)} />
          ) : (
            <Button
              title="Create invite code"
              variant="primary"
              busy={busy === "invite"}
              onPress={() =>
                act("invite", async () => {
                  const code = await spaces.createInvite(space.id, inviteRole);
                  setInvite(code);
                  haptics.success();
                })
              }
            />
          )}
        </View>
      )}

      <View style={card}>
        <Text style={[styles.title, { color: theme.text }]}>Members</Text>
        {space.members.map((member) => {
          const isMe = member.userId === userId;
          const displayName = isMe ? `${member.displayName || "You"} (you)` : member.displayName || "Someone";
          const removable = manager && !isMe && member.role !== "owner";
          return (
            <View key={member.userId} style={styles.member}>
              <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.avatarText, { color: theme.accent }]}>
                  {(member.displayName || "?").trim()[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>
              <View style={styles.memberText}>
                <Text style={[styles.memberName, { color: theme.text }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={[styles.hint, { color: theme.textMuted }]}>{ROLE_LABELS[member.role]}</Text>
              </View>
              {removable && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${member.displayName}`}
                  hitSlop={10}
                  onPress={() =>
                    confirm(
                      `Remove ${member.displayName || "this person"}?`,
                      "They'll no longer see this space's receipts and subscriptions.",
                      "Remove",
                      () => act(`remove-${member.userId}`, () => spaces.removeMember(space.id, member.userId)),
                    )
                  }
                >
                  <Text style={{ color: theme.urgentText, fontWeight: "600" }}>Remove</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      <View style={card}>
        <Text style={[styles.title, { color: theme.text }]}>Your details</Text>
        <Field
          label="Your name in this space"
          hint="Shown to others next to what you add."
          value={myName}
          onChangeText={setMyName}
          maxLength={60}
        />
        <Button
          title="Save name"
          busy={busy === "my-name"}
          onPress={() =>
            act("my-name", async () => {
              await spaces.setMyName(space.id, myName);
              showToast({ message: "Name saved" });
            })
          }
        />
        {manager && (
          <>
            <Field label="Space name" value={name} onChangeText={setName} maxLength={60} />
            <Button
              title="Rename space"
              busy={busy === "rename"}
              onPress={() =>
                act("rename", async () => {
                  if (!name.trim()) throw new Error("Enter a name for the space");
                  await spaces.renameSpace(space.id, name);
                  showToast({ message: "Space renamed" });
                })
              }
            />
          </>
        )}
      </View>

      {space.myRole === "owner" ? (
        <Button
          title="Delete space"
          variant="danger"
          busy={busy === "delete"}
          onPress={() =>
            confirm(
              `Delete “${space.name}”?`,
              "Everyone leaves the space. Shared items go back to whoever added them, and the others stop seeing them. This can't be undone.",
              "Delete",
              () =>
                act("delete", async () => {
                  await spaces.deleteSpace(space.id);
                  router.back();
                }),
            )
          }
        />
      ) : (
        <Button
          title="Leave space"
          variant="danger"
          busy={busy === "leave"}
          onPress={() =>
            confirm(
              `Leave “${space.name}”?`,
              "You'll stop seeing its receipts and subscriptions. Anything you added stays in the space for the others.",
              "Leave",
              () =>
                act("leave", async () => {
                  await spaces.leaveSpace(space.id);
                  router.back();
                }),
            )
          }
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  hero: {
    borderRadius: 22,
    padding: 20,
    gap: 4,
  },
  heroKind: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.8,
  },
  heroName: {
    fontSize: 28,
    letterSpacing: -0.5,
    fontFamily: Fonts.display,
  },
  heroMeta: {
    fontSize: 14,
    opacity: 0.9,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  hint: {
    fontSize: 13,
  },
  codeBox: {
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: 16,
    gap: 4,
  },
  code: {
    fontSize: 32,

    letterSpacing: 4,
    fontVariant: ["tabular-nums"],
    fontFamily: Fonts.monoBold,
  },
  member: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  memberText: {
    flex: 1,
    gap: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
  },
});
