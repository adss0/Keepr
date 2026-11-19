import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";

import { Button, Field, Segmented } from "@/components/form";
import { Icon } from "@/components/icon";
import { ReceiptCard } from "@/components/receipt-card";
import { allDates, ReceiptFilters } from "@/components/receipt-filters";
import { useToast } from "@/components/toast";
import { Fonts, useTheme } from "@/constants/theme";
import { useCloud } from "@/data/cloud";
import { haptics } from "@/data/haptics";
import { useReceipts } from "@/data/receipts";
import { useSpaceActivity } from "@/data/space-activity";
import { canManage, type Space, type SpaceMember, useSpaces } from "@/data/spaces";
import { useSubscriptions } from "@/data/subscriptions";
import { todayIso } from "@/lib/deadlines";
import { boughtIn, periodRange } from "@/lib/export-range";
import { type ReceiptsSort, sortReceipts } from "@/lib/receipt-views";
import { errorMessage, formatPrice } from "@/lib/format";
import { activityDetail, activityText, timeAgo } from "@/lib/space-activity";
import { formatInviteCode, KIND_LABELS, ROLE_LABELS } from "@/lib/spaces";

type Tab = "activity" | "receipts" | "people" | "settings";
const TABS: { value: Tab; label: string }[] = [
  { value: "activity", label: "Activity" },
  { value: "receipts", label: "Receipts" },
  { value: "people", label: "People" },
  { value: "settings", label: "Settings" },
];

/** Asks before something that can't easily be undone. Browsers get their own confirm box. */
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

/**
 * One shared space, in four tabs: what's happened (Activity), its receipts, its people (invites and roles),
 * and its settings (notifications, names, leaving). `tab` in the address opens a tab, e.g. from a notification.
 */
export default function SpaceScreen() {
  const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const theme = useTheme();
  const spaces = useSpaces();
  const space = spaces.spaces.find((item) => item.id === id);
  const [tab, setTab] = useState<Tab>(TABS.some((item) => item.value === initialTab) ? (initialTab as Tab) : "activity");
  const [error, setError] = useState<string>();
  const receipts = useReceipts();

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

  const sharedReceipts = receipts.filter((receipt) => receipt.spaceId === space.id).length;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: space.name }} />

      <View style={[styles.hero, { backgroundColor: theme.primary }]}>
        <Text style={[styles.heroKind, { color: theme.onPrimary }]}>{KIND_LABELS[space.kind]}</Text>
        <Text style={[styles.heroName, { color: theme.onPrimary }]}>{space.name}</Text>
        <Text style={[styles.heroMeta, { color: theme.onPrimary }]}>
          {space.members.length === 1 ? "Just you so far" : `${space.members.length} people`} · {sharedReceipts}{" "}
          {sharedReceipts === 1 ? "receipt" : "receipts"} · You&apos;re {ROLE_LABELS[space.myRole].toLowerCase()}
        </Text>
      </View>

      <Segmented label="" value={tab} options={TABS} onChange={(value) => { setTab(value); setError(undefined); }} />

      {error && <Text style={[styles.body, { color: theme.urgentText }]}>{error}</Text>}

      {tab === "activity" && <ActivityTab space={space} onOpenPeople={() => setTab("people")} />}
      {tab === "receipts" && <ReceiptsTab space={space} />}
      {tab === "people" && <PeopleTab space={space} onError={setError} />}
      {tab === "settings" && <SettingsTab space={space} onError={setError} />}
    </ScrollView>
  );
}

function ActivityTab({ space, onOpenPeople }: { space: Space; onOpenPeople: () => void }) {
  const theme = useTheme();
  const { userId } = useCloud();
  const { items, status } = useSpaceActivity(space.id);
  const receipts = useReceipts();
  const card = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }];

  if (status === "unavailable") {
    return (
      <View style={card}>
        <Text style={[styles.body, { color: theme.textMuted }]}>
          The activity feed starts once the latest database update has been applied (see docs/cloud-setup.md).
        </Text>
      </View>
    );
  }
  if (status === "ready" && items.length === 0) {
    return (
      <View style={card}>
        <Text style={[styles.title, { color: theme.text }]}>Nothing yet</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>
          When someone adds a receipt or joins, it shows up here.
        </Text>
        {space.members.length === 1 && <Button title="Invite people" variant="primary" onPress={onOpenPeople} />}
      </View>
    );
  }

  return (
    <View style={card}>
      {status === "loading" && <Text style={[styles.body, { color: theme.textMuted }]}>Loading…</Text>}
      {status === "error" && (
        <Text style={[styles.body, { color: theme.urgentText }]}>Couldn&apos;t load the activity. Go back and open the space again.</Text>
      )}
      {items.map((item, index) => {
        const current = space.members.find((member) => member.userId === item.actorId)?.displayName;
        const text = activityText(item, userId, current);
        const detail = activityDetail(item);
        const openable = item.itemId && receipts.some((receipt) => receipt.id === item.itemId);
        const row = (
          <View style={[styles.activity, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
            <View style={[styles.avatar, { backgroundColor: theme.calmBg }]}>
              <Text style={[styles.avatarText, { color: theme.text }]}>{(text.trim()[0] ?? "?").toUpperCase()}</Text>
            </View>
            <View style={styles.memberText}>
              <Text style={[styles.activityText, { color: theme.text }]}>{text}</Text>
              {detail ? <Text style={[styles.hint, { color: theme.textMuted }]}>{detail}</Text> : null}
            </View>
            <Text style={[styles.hint, { color: theme.textMuted }]}>{timeAgo(item.createdAt)}</Text>
          </View>
        );
        return openable ? (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityHint="Opens the receipt"
            onPress={() => router.push({ pathname: "/receipt/[id]", params: { id: item.itemId! } })}
          >
            {row}
          </Pressable>
        ) : (
          <View key={item.id}>{row}</View>
        );
      })}
    </View>
  );
}

function ReceiptsTab({ space }: { space: Space }) {
  const theme = useTheme();
  const receipts = useReceipts();
  const { subscriptions } = useSubscriptions();
  const today = todayIso();
  const [sort, setSort] = useState<ReceiptsSort>("newest");
  const [dates, setDates] = useState(() => allDates(today));
  const inSpace = receipts.filter((receipt) => receipt.spaceId === space.id);
  const range = periodRange(dates.period, today, dates);
  const shared = sortReceipts(
    inSpace.filter((receipt) => boughtIn(receipt, range)),
    sort,
    today,
  );
  const total = shared.reduce((sum, receipt) => sum + receipt.pricePence, 0);
  const sharedSubscriptions = subscriptions.filter((subscription) => subscription.spaceId === space.id).length;

  return (
    <View style={styles.list}>
      <Button
        title={`Add a receipt to ${space.name}`}
        variant="primary"
        icon={<Icon name="add" size={18} color={theme.onPrimary} />}
        onPress={() => router.push({ pathname: "/receipt/new", params: { space: space.id } })}
      />
      <Text style={[styles.hint, { color: theme.textMuted }]}>
        {shared.length === 1 ? "1 receipt" : `${shared.length} receipts`} · {formatPrice(total)}
        {sharedSubscriptions > 0
          ? ` · ${sharedSubscriptions} shared ${sharedSubscriptions === 1 ? "subscription" : "subscriptions"}`
          : ""}
      </Text>
      {inSpace.length > 0 && (
        <ReceiptFilters sort={sort} onSortChange={setSort} dates={dates} onDatesChange={setDates} today={today} />
      )}
      {inSpace.length === 0 ? (
        <Text style={[styles.body, { color: theme.textMuted }]}>
          No shared receipts yet. Add one here, or pick this space under &quot;Who&apos;s it for?&quot; when you add a receipt.
        </Text>
      ) : shared.length === 0 ? (
        <Text style={[styles.body, { color: theme.textMuted }]}>No receipts bought in these dates.</Text>
      ) : (
        shared.map((receipt) => <ReceiptCard key={receipt.id} receipt={receipt} today={today} />)
      )}
    </View>
  );
}

function PeopleTab({ space, onError }: { space: Space; onError: (message: string | undefined) => void }) {
  const theme = useTheme();
  const { userId } = useCloud();
  const spaces = useSpaces();
  const { showToast } = useToast();
  const [invite, setInvite] = useState<string>();
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [busy, setBusy] = useState<string>();
  const manager = canManage(space);
  const owner = space.myRole === "owner";
  const card = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }];

  async function act(key: string, action: () => Promise<void>, done?: string) {
    setBusy(key);
    onError(undefined);
    try {
      await action();
      haptics.success();
      if (done) showToast({ message: done });
    } catch (actionError) {
      haptics.error();
      onError(errorMessage(actionError));
    } finally {
      setBusy(undefined);
    }
  }

  const shareInvite = (code: string) =>
    Share.share({
      message: `Join “${space.name}” on Keepr to share receipts and subscriptions. Open Keepr, go to Settings → Shared spaces, and enter this code: ${formatInviteCode(code)} (valid for 7 days).`,
    }).catch(() => undefined);

  function memberActions(member: SpaceMember) {
    const name = member.displayName || "this person";
    const actions: { label: string; danger?: boolean; run: () => void }[] = [];
    if (owner) {
      actions.push(
        member.role === "admin"
          ? { label: "Make member", run: () => act(`role-${member.userId}`, () => spaces.setRole(space.id, member.userId, "member"), `${name} is now a member`) }
          : { label: "Make admin", run: () => act(`role-${member.userId}`, () => spaces.setRole(space.id, member.userId, "admin"), `${name} is now an admin`) },
      );
      actions.push({
        label: "Make owner",
        run: () =>
          confirm(
            `Make ${name} the owner?`,
            "They'll be able to delete the space and change everyone's roles. You'll become an admin.",
            "Make owner",
            () => act(`owner-${member.userId}`, () => spaces.transferOwnership(space.id, member.userId), `${name} is now the owner`),
          ),
      });
    }
    if (manager && member.role !== "owner") {
      actions.push({
        label: "Remove",
        danger: true,
        run: () =>
          confirm(
            `Remove ${name}?`,
            "They'll no longer see this space's receipts and subscriptions.",
            "Remove",
            () => act(`remove-${member.userId}`, () => spaces.removeMember(space.id, member.userId), `${name} was removed`),
          ),
      });
    }
    return actions;
  }

  return (
    <View style={styles.list}>
      {manager && (
        <View style={card}>
          <Text style={[styles.title, { color: theme.text }]}>Invite people</Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>Send a code. Anyone with it can join for the next 7 days.</Text>
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
            <>
              <View style={[styles.codeBox, { backgroundColor: theme.accentSoft }]}>
                <Text
                  selectable
                  accessibilityLabel={`Invite code ${invite.split("").join(" ")}`}
                  style={[styles.code, { color: theme.accent }]}
                >
                  {formatInviteCode(invite)}
                </Text>
                <Text style={[styles.hint, { color: theme.textMuted }]}>Valid for 7 days</Text>
              </View>
              <Button title="Share code" variant="primary" onPress={() => shareInvite(invite)} />
            </>
          ) : (
            <Button
              title="Create invite code"
              variant="primary"
              busy={busy === "invite"}
              onPress={() =>
                act("invite", async () => {
                  setInvite(await spaces.createInvite(space.id, inviteRole));
                })
              }
            />
          )}
        </View>
      )}

      <View style={card}>
        <Text style={[styles.title, { color: theme.text }]}>
          {space.members.length === 1 ? "1 person" : `${space.members.length} people`}
        </Text>
        {owner && space.members.length > 1 && (
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Admins can invite and remove people{space.kind === "organization" ? " and delete shared items" : ""}. Only the owner
            changes roles.
          </Text>
        )}
        {space.members.map((member) => {
          const isMe = member.userId === userId;
          const actions = isMe ? [] : memberActions(member);
          return (
            <View key={member.userId} style={styles.memberBlock}>
              <View style={styles.member}>
                <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.avatarText, { color: theme.accent }]}>
                    {(member.displayName || "?").trim()[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>
                <View style={styles.memberText}>
                  <Text style={[styles.memberName, { color: theme.text }]} numberOfLines={1}>
                    {isMe ? `${member.displayName || "You"} (you)` : member.displayName || "Someone"}
                  </Text>
                  <Text style={[styles.hint, { color: theme.textMuted }]}>{ROLE_LABELS[member.role]}</Text>
                </View>
              </View>
              {actions.length > 0 && (
                <View style={styles.memberActions}>
                  {actions.map((action) => (
                    <Pressable
                      key={action.label}
                      accessibilityRole="button"
                      accessibilityLabel={`${action.label}: ${member.displayName || "this person"}`}
                      disabled={busy !== undefined}
                      onPress={action.run}
                      style={[styles.chip, { borderColor: action.danger ? theme.urgentText : theme.border }]}
                    >
                      <Text style={[styles.chipText, { color: action.danger ? theme.urgentText : theme.text }]}>
                        {action.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SettingsTab({ space, onError }: { space: Space; onError: (message: string | undefined) => void }) {
  const theme = useTheme();
  const { userId } = useCloud();
  const spaces = useSpaces();
  const { showToast } = useToast();
  const me = space.members.find((member) => member.userId === userId);
  const [myName, setMyName] = useState(me?.displayName ?? "");
  const [name, setName] = useState(space.name);
  const [notify, setNotify] = useState({
    notifyReceipts: me?.notifyReceipts ?? true,
    notifyMembers: me?.notifyMembers ?? true,
  });
  const [busy, setBusy] = useState<string>();
  const manager = canManage(space);
  const card = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }];

  async function act(key: string, action: () => Promise<void>) {
    setBusy(key);
    onError(undefined);
    try {
      await action();
    } catch (actionError) {
      haptics.error();
      onError(errorMessage(actionError));
    } finally {
      setBusy(undefined);
    }
  }

  /** Switches change at once and go back if saving fails. */
  async function changeNotify(next: typeof notify) {
    const before = notify;
    setNotify(next);
    onError(undefined);
    try {
      await spaces.setNotifications(space.id, next);
    } catch (saveError) {
      setNotify(before);
      onError(errorMessage(saveError));
    }
  }

  return (
    <View style={styles.list}>
      <View style={card}>
        <Text style={[styles.title, { color: theme.text }]}>Notify me when</Text>
        <ToggleRow
          label="Someone adds a receipt"
          value={notify.notifyReceipts}
          onChange={(value) => changeNotify({ ...notify, notifyReceipts: value })}
        />
        <ToggleRow
          label="Someone joins or leaves"
          value={notify.notifyMembers}
          onChange={(value) => changeNotify({ ...notify, notifyMembers: value })}
          divided
        />
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Just for you, and just for this space. Nobody is told about what you do yourself.
        </Text>
      </View>

      <View style={card}>
        <Text style={[styles.title, { color: theme.text }]}>Who can change shared items</Text>
        {manager ? (
          <Segmented
            label=""
            value={space.membersCanEdit ? "everyone" : "adder"}
            options={[
              { value: "adder", label: "Whoever added it" },
              { value: "everyone", label: "Everyone" },
            ]}
            onChange={(choice) =>
              act("edit-rights", () => spaces.setMembersCanEdit(space.id, choice === "everyone"))
            }
          />
        ) : null}
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          {space.membersCanEdit
            ? "Everyone in the space can edit, finish with or delete any shared receipt or subscription."
            : "Only whoever added a receipt or subscription, and the owner and admins, can edit, finish with or delete it. Everyone can still see and export it."}
        </Text>
      </View>

      <View style={card}>
        <Text style={[styles.title, { color: theme.text }]}>Names</Text>
        <Field
          label="Your name in this space"
          hint="Shown to others next to what you add."
          value={myName}
          onChangeText={setMyName}
          maxLength={60}
        />
        <Button
          title="Save your name"
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
        <>
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
          {space.members.length > 1 && (
            <Text style={[styles.hint, { color: theme.textMuted, textAlign: "center" }]}>
              To leave, first make someone else the owner in People.
            </Text>
          )}
        </>
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
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  divided,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  divided?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.toggle, divided && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
      <Text style={[styles.body, styles.toggleLabel, { color: theme.text }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.accent, false: theme.border }}
      />
    </View>
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
  list: {
    gap: 12,
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
    gap: 12,
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
  activity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  activityText: {
    fontSize: 15,
    lineHeight: 20,
  },
  memberBlock: {
    gap: 8,
  },
  member: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
  },
  memberActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginLeft: 48,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 34,
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
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
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  toggleLabel: {
    flex: 1,
  },
});
