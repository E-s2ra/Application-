import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { ControlHeight, Interaction, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconButtonVariant = 'plain' | 'surface' | 'accent' | 'danger';

export type AppIconButtonProps = {
  icon: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  disabled?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppIconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'plain',
  disabled = false,
  selected,
  style,
}: AppIconButtonProps) {
  const theme = useTheme();
  const background =
    variant === 'accent'
      ? theme.primarySoft
      : variant === 'danger'
        ? theme.errorSoft
        : variant === 'surface'
          ? theme.backgroundElevated
          : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? theme.backgroundSelected : background,
          borderColor: variant === 'surface' ? theme.border : 'transparent',
          opacity: disabled ? Interaction.disabledOpacity : 1,
        },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: ControlHeight.md,
    height: ControlHeight.md,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
