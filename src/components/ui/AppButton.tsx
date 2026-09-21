import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { ControlHeight, Interaction, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export type AppButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  accessibilityLabel,
  style,
}: AppButtonProps) {
  const theme = useTheme();
  const blocked = disabled || loading;
  const height = ControlHeight[size];

  const palette =
    variant === 'primary'
      ? { bg: theme.primary, pressedBg: theme.primaryPressed, border: theme.primary, text: theme.buttonText }
      : variant === 'danger'
        ? { bg: theme.errorSoft, pressedBg: theme.errorSoft, border: theme.errorSoft, text: theme.error }
        : variant === 'secondary'
          ? { bg: theme.backgroundElevated, pressedBg: theme.backgroundSelected, border: theme.border, text: theme.text }
          : { bg: 'transparent', pressedBg: theme.backgroundSelected, border: 'transparent', text: theme.textSecondary };

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: height,
          paddingHorizontal: size === 'sm' ? Spacing.md : size === 'lg' ? Spacing.xl : Spacing.lg,
          backgroundColor: pressed && !blocked ? palette.pressedBg : palette.bg,
          borderColor: palette.border,
          opacity: blocked ? Interaction.disabledOpacity : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : (
        <View style={styles.content}>
          {leftIcon}
          <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
            {label}
          </Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  label: {
    ...Typography.button,
  },
});
