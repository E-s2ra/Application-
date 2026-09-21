import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ControlHeight, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AppListRowProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppListRow({
  title,
  subtitle,
  icon,
  trailing,
  onPress,
  accessibilityLabel,
  destructive = false,
  style,
}: AppListRowProps) {
  const theme = useTheme();
  const titleColor = destructive ? theme.error : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
        },
        style,
      ]}
    >
      {icon ? (
        <View style={[styles.icon, { backgroundColor: destructive ? theme.errorSoft : theme.primarySoft }]}>
          {icon}
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (onPress ? <ChevronRight size={18} color={theme.textMuted} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ControlHeight.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.bodyBold,
  },
  subtitle: {
    ...Typography.caption,
  },
});
