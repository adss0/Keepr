import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { PressScale } from "@/components/press-scale";
import { Fonts, useTheme } from "@/constants/theme";

type Action = { icon: IconName; label: string; onPress: () => void; primary?: boolean };

type Props = {
  title: string;
  subtitle?: string;
  actions?: Action[];
  children?: ReactNode;
};

/** Large title at the top of a tab, with round action buttons on the right. */
export function ScreenHeader({ title, subtitle, actions = [], children }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.row}>
        <View style={styles.titles}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text> : null}
        </View>
        <View style={styles.actions}>
          {actions.map((action) => (
            <PressScale
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              hitSlop={6}
              onPress={action.onPress}
              style={StyleSheet.flatten([
                styles.action,
                { backgroundColor: action.primary ? theme.accent : theme.card, borderColor: theme.border },
              ])}
            >
              <Icon name={action.icon} size={20} color={action.primary ? theme.onAccent : theme.text} />
            </PressScale>
          ))}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  title: {
    letterSpacing: -0.6,
    fontFamily: Fonts.display,
    fontSize: 34,
  },
  subtitle: {
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  action: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
