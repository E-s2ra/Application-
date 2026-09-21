import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AppSectionHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AppSectionHeader({ title, subtitle, eyebrow, action, style }: AppSectionHeaderProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, style]}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: theme.primary }]}>{eyebrow.toUpperCase()}</Text> : null}
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  copy: {
    flex: 1,
    gap: Spacing.xs,
  },
  eyebrow: {
    ...Typography.overline,
  },
  title: {
    ...Typography.h2,
  },
  subtitle: {
    ...Typography.small,
  },
  action: {
    flexShrink: 0,
  },
});
