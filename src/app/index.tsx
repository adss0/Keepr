import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Keepr</Text>
      <Text style={styles.tagline}>
        You keep your receipts. Keepr keeps your rights.
      </Text>
      <Text style={styles.empty}>
        No receipts yet. Snap your first one to get started.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
  },
  tagline: {
    fontSize: 16,
    textAlign: "center",
  },
  empty: {
    marginTop: 24,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
