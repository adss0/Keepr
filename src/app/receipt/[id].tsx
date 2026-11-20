import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ReceiptPhotoCard } from "@/components/receipt-photo-card";
import { DeadlinePill } from "@/components/deadline-pill";
import { Button } from "@/components/form";
import { Fonts, useTheme } from "@/constants/theme";
import { useToast } from "@/components/toast";
import { useCloud } from "@/data/cloud";
import { haptics } from "@/data/haptics";
import { usePhotoUri } from "@/data/receipt-photos";
import { shareReceiptPdf } from "@/data/receipt-pdf";
import { useReceipt, useReceiptsStore } from "@/data/receipts";
import { useSpaces } from "@/data/spaces";
import { DEADLINE_EXPLANATIONS, getDeadlines, todayIso } from "@/lib/deadlines";
import { errorMessage, formatDate, formatPrice } from "@/lib/format";
import { PAYMENT_LABELS } from "@/lib/export";
import { goBack } from "@/lib/navigation";
import { CLOSED_LABELS } from "@/lib/receipt-status";
import type { ClosedReason } from "@/types/receipt";

const CLOSE_OPTIONS: { reason: ClosedReason; label: string }[] = [
  { reason: "returned", label: "Returned" },
  { reason: "claimed", label: "Claimed" },
  { reason: "archived", label: "Archive" },
];

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receipt = useReceipt(id);
  const { closeReceipt, deleteReceipt, restoreReceipt } = useReceiptsStore();
  const { showToast } = useToast();
  const theme = useTheme();
  const today = todayIso();
  const { userId } = useCloud();
  const photoUri = usePhotoUri(receipt?.photo, receipt?.ownerId ?? userId);
  const [exporting, setExporting] = useState(false);
  const spaces = useSpaces();

  if (!receipt) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: "Receipt" }} />
        <Text style={{ color: theme.textMuted }}>This receipt doesn&apos;t exist any more.</Text>
      </View>
    );
  }

  const currentYear = Number(today.slice(0, 4));
  const details: [string, string][] = [
    ["Shop", receipt.retailer],
    ["Bought", `${formatDate(receipt.purchaseDate, currentYear)} · ${receipt.channel === "online" ? "online" : "in store"}`],
    ["Paid by", PAYMENT_LABELS[receipt.paymentMethod]],
  ];
  const sharedIn = spaces.spaceName(receipt.spaceId);
  if (sharedIn) {
    details.push(["Shared in", sharedIn]);
    const addedBy = spaces.memberName(receipt.spaceId, receipt.ownerId);
    if (addedBy) details.push(["Added by", addedBy]);
  }
  if (receipt.returnWindowDays !== undefined) {
    details.push(["Shop return window", `${receipt.returnWindowDays} days`]);
  }
  if (receipt.warrantyMonths !== undefined) {
    details.push(["Warranty", `${receipt.warrantyMonths} months`]);
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: receipt.product }} />

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.price, { color: theme.text }]}>{formatPrice(receipt.pricePence)}</Text>
        {details.map(([label, value]) => (
          <View key={label} style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textMuted }]}>{label}</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
          </View>
        ))}
      </View>

      <ReceiptPhotoCard receipt={receipt} />

      {receipt.closed ? (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <DeadlinePill deadline={undefined} today={today} closed={receipt.closed} />
          <Text style={[styles.explanation, { color: theme.textMuted }]}>
            Finished with, so Keepr won&apos;t remind you about it. It stays here as a record.
          </Text>
          <Button
            title="Make active again"
            onPress={() => {
              closeReceipt(receipt.id, undefined);
              haptics.success();
            }}
          />
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Finished with it?</Text>
          <Text style={[styles.explanation, { color: theme.textMuted }]}>
            Mark it and Keepr stops reminding you. Returned items don&apos;t count towards your spending.
          </Text>
          <View style={styles.statusButtons}>
            {CLOSE_OPTIONS.map((option) => (
              <View key={option.reason} style={styles.statusButton}>
                <Button
                  title={option.label}
                  onPress={() => {
                    closeReceipt(receipt.id, { reason: option.reason, on: today });
                    haptics.success();
                    showToast({
                      message: `${CLOSED_LABELS[option.reason]}: ${receipt.product}`,
                      action: { label: "Undo", onPress: () => closeReceipt(receipt.id, undefined) },
                    });
                  }}
                />
              </View>
            ))}
          </View>
        </View>
      )}

      {!receipt.closed && <Text style={[styles.heading, { color: theme.text }]}>Your deadlines</Text>}
      {!receipt.closed && getDeadlines(receipt).map((deadline) => (
        <View
          key={deadline.kind}
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <DeadlinePill deadline={deadline} today={today} />
          <Text style={[styles.explanation, { color: theme.textMuted }]}>
            {DEADLINE_EXPLANATIONS[deadline.kind]}
          </Text>
        </View>
      ))}

      <View style={styles.actions}>
        <Button
          title="Something wrong? Check your rights"
          variant="primary"
          onPress={() => router.push({ pathname: "/receipt/rights/[id]", params: { id: receipt.id } })}
        />
        <Button
          title="Save as PDF"
          busy={exporting}
          onPress={async () => {
            setExporting(true);
            try {
              await shareReceiptPdf(receipt, today, photoUri);
            } catch (error) {
              showToast({ message: `Couldn't make the PDF: ${errorMessage(error)}` });
            } finally {
              setExporting(false);
            }
          }}
        />
        <Button
          title="Edit"
          onPress={() => router.push({ pathname: "/receipt/edit/[id]", params: { id: receipt.id } })}
        />
        <Button
          title="Delete receipt"
          variant="danger"
          onPress={() => {
            const deleted = receipt;
            deleteReceipt(deleted.id);
            haptics.warning();
            showToast({
              message: `Deleted ${deleted.product}`,
              action: { label: "Undo", onPress: () => restoreReceipt(deleted) },
            });
            goBack();
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusButtons: {
    flexDirection: "row",
    gap: 8,
  },
  statusButton: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  price: {
    fontFamily: Fonts.display,
    fontSize: 34,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
    textAlign: "right",
  },
  heading: {
    fontSize: 17,
    fontWeight: "600",
    marginTop: 8,
  },
  actions: {
    marginTop: 12,
    gap: 10,
  },
  explanation: {
    fontSize: 13,
    lineHeight: 19,
  },
});
