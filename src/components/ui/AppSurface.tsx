import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SurfaceVariant = 'plain' | 'subtle' | 'card' | 'raised';
type SurfacePadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export type AppSurfaceProps = {
  children: React.ReactNode;
  variant?: SurfaceVariant;
  padding?: SurfacePadding;
  style?: StyleProp<ViewStyle>;
};

export function AppSurface({ children, variant = 'card', padding = 'lg', style }: AppSurfaceProps) {
  const theme = useTheme();
  const paddingValue =
    padding === 'none' ? 0 :
      padding === 'sm' ? Spacing.sm :
        padding === 'md' ? Spacing.md :
          padding === 'xl' ? Spacing.xl : Spacing.lg;

  const backgroundColor =
    variant === 'plain' ? 'transparent' :
      variant === 'subtle' ? theme.backgroundElement : theme.backgroundCard;

  return (
    <View
      style={[
        styles.base,
        {
          padding: paddingValue,
          backgroundColor,
          borderColor: variant === 'plain' ? 'transparent' : theme.border,
          boxShadow: variant === 'raised' ? Shadows.raised : undefined,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
