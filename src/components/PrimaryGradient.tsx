import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PrimaryGradientProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  borderRadius?: number;
}

export function PrimaryGradient({ style, children, borderRadius = 0 }: PrimaryGradientProps) {
  // Deep blue glossy gradient
  return (
    <LinearGradient
      colors={['#02060E', '#0D47A1', '#0356C5']}
      locations={[0, 0.6, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFill, { borderRadius }, style]}
    >
      {/* Glossy overlay effect - upper half subtle highlight */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '40%',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderTopLeftRadius: borderRadius,
        borderTopRightRadius: borderRadius,
      }} />
      {children}
    </LinearGradient>
  );
}
