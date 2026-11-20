import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { Icon, type IconName } from "@/components/icon";
import { useToast } from "@/components/toast";
import { useTheme } from "@/constants/theme";
import { haptics } from "@/data/haptics";
import { useReceiptsStore } from "@/data/receipts";
import { useSpaces } from "@/data/spaces";
import { todayIso } from "@/lib/deadlines";
import type { Receipt } from "@/types/receipt";

/** What a receipt row can do from a swipe, or from a screen reader's actions menu. */
export function useReceiptActions(receipt: Receipt) {
  const { closeReceipt, deleteReceipt, restoreReceipt } = useReceiptsStore();
  const { showToast } = useToast();
  /** Shared receipts can only be changed by whoever added them, or the space's owner and admins (unless it allows all). */
  const editable = useSpaces().canChange(receipt);

  function toggleArchive() {
    const before = receipt.closed;
    if (before) {
      closeReceipt(receipt.id, undefined);
      haptics.success();
      showToast({ message: `${receipt.product} is active again` });
      return;
    }
    closeReceipt(receipt.id, { reason: "archived", on: todayIso() });
    haptics.success();
    showToast({
      message: `Archived ${receipt.product}`,
      action: { label: "Undo", onPress: () => closeReceipt(receipt.id, undefined) },
    });
  }

  function remove() {
    const deleted = receipt;
    deleteReceipt(deleted.id);
    haptics.warning();
    showToast({ message: `Deleted ${deleted.product}`, action: { label: "Undo", onPress: () => restoreReceipt(deleted) } });
  }

  return {
    editable,
    archiveLabel: receipt.closed ? "Make active" : "Archive",
    toggleArchive,
    remove,
    accessibilityActions: editable
      ? [
          { name: "archive", label: receipt.closed ? "Make active" : "Archive" },
          { name: "delete", label: "Delete" },
        ]
      : [],
    onAccessibilityAction: (name: string) => (name === "delete" ? remove() : name === "archive" ? toggleArchive() : undefined),
  };
}

/** A receipt row that swipes left to show Archive and Delete. */
export function SwipeableReceipt({ receipt, children }: { receipt: Receipt; children: ReactNode }) {
  const theme = useTheme();
  const actions = useReceiptActions(receipt);
  if (!actions.editable) return children;

  return (
    <ReanimatedSwipeable
      friction={1.6}
      rightThreshold={48}
      overshootRight={false}
      renderRightActions={(_progress, _translation, methods) => (
        <View style={styles.actions}>
          <Action
            icon={receipt.closed ? "receipts" : "archive"}
            label={actions.archiveLabel}
            background={theme.accentSoft}
            color={theme.accent}
            onPress={() => {
              methods.close();
              actions.toggleArchive();
            }}
          />
          <Action
            icon="trash"
            label="Delete"
            background={theme.urgentBg}
            color={theme.urgentText}
            onPress={() => {
              methods.close();
              actions.remove();
            }}
          />
        </View>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

function Action({
  icon,
  label,
  background,
  color,
  onPress,
}: {
  icon: IconName;
  label: string;
  background: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, { backgroundColor: background, opacity: pressed ? 0.7 : 1 }]}
    >
      <Icon name={icon} size={20} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 8,
    paddingLeft: 8,
  },
  action: {
    width: 84,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
