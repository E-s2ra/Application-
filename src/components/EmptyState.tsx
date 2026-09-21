import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LucideIcon, Inbox } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Typography } from '@/constants/theme';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Icon size={28} color={theme.textSecondary} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: pressed ? theme.primaryPressed : theme.primary },
          ]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={[styles.actionText, { color: theme.buttonText }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xl,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    ...Typography.body,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    ...Typography.bodyBold,
  },
});
