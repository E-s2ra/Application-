import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface PrimaryGradientProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  borderRadius?: number;
}

export function PrimaryGradient({ style, children, borderRadius = 0 }: PrimaryGradientProps) {
  const theme = useTheme();

  // Kept as a compatibility layer for existing call sites. The old glossy
  // gradient was intentionally replaced by a single brand surface so primary
  // actions share one visual language across the app.
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { borderRadius, backgroundColor: theme.primary },
        style,
      ]}
    >
      {children}
    </View>
  );
}
