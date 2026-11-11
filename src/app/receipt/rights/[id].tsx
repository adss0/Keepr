import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { Button, Field, Segmented } from "@/components/form";
import { useTheme } from "@/constants/theme";
import { useReceipt } from "@/data/receipts";
import { todayIso } from "@/lib/deadlines";
import { assessRights, draftClaimLetter, type Issue } from "@/lib/rights";

const ISSUE_OPTIONS: { value: Issue; label: string }[] = [
  { value: "faulty", label: "It's faulty" },
  { value: "not_as_described", label: "Not as described" },
  { value: "change_of_mind", label: "I changed my mind" },
];

export default function RightsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receipt = useReceipt(id);
  const theme = useTheme();
  const today = todayIso();
  const [issue, setIssue] = useState<Issue>("faulty");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const assessment = useMemo(
    () => (receipt ? assessRights(receipt, issue, today) : undefined),
    [receipt, issue, today],
  );

  if (!receipt || !assessment) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textMuted }}>This receipt doesn&apos;t exist any more.</Text>
      </View>
    );
  }

  const letter = draftClaimLetter(receipt, issue, assessment, { name, description, today });
  const card = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }];

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: "Your rights" }} />

      <Segmented label={`What's wrong with your ${receipt.product}?`} value={issue} options={ISSUE_OPTIONS} onChange={setIssue} />

      <View style={card}>
        <Text style={[styles.headline, { color: theme.text }]}>{assessment.headline}</Text>
        {assessment.entitlements.map((line) => (
          <Text key={line} style={[styles.body, { color: theme.text }]}>
            • {line}
          </Text>
        ))}
        <Text style={[styles.basis, { color: theme.textMuted }]}>Based on: {assessment.legalBasis}</Text>
      </View>

      <Text style={[styles.heading, { color: theme.text }]}>What to do</Text>
      <View style={card}>
        {assessment.steps.map((step, index) => (
          <Text key={step} style={[styles.body, { color: theme.text }]}>
            {index + 1}. {step}
          </Text>
        ))}
      </View>

      {assessment.extraProtection.length > 0 && (
        <>
          <Text style={[styles.heading, { color: theme.text }]}>Extra protection</Text>
          <View style={card}>
            {assessment.extraProtection.map((line) => (
              <Text key={line} style={[styles.body, { color: theme.text }]}>
                • {line}
              </Text>
            ))}
          </View>
        </>
      )}

      {letter !== "" && (
        <>
          <Text style={[styles.heading, { color: theme.text }]}>Your claim letter</Text>
          <Field label="Your name" placeholder="Sam Taylor" value={name} onChangeText={setName} />
          <Field
            label="What happened?"
            placeholder="The left earcup stopped working after a week."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
          <View style={card}>
            <Text selectable style={[styles.letter, { color: theme.text }]}>
              {letter}
            </Text>
          </View>
          <Button
            title="Send or copy the letter"
            variant="primary"
            onPress={() => {
              Share.share({ message: letter, title: `Claim for ${receipt.product}` }).catch(() => undefined);
            }}
          />
        </>
      )}

      <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
        This is general information about UK consumer law, not legal advice. For complex disputes, Citizens Advice
        (0808 223 1133) can help.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  headline: {
    fontSize: 18,
    fontWeight: "700",
  },
  heading: {
    fontSize: 17,
    fontWeight: "600",
    marginTop: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  basis: {
    fontSize: 12,
  },
  letter: {
    fontSize: 14,
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
});
