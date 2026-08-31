import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';

type MediaCardSkeletonProps = {
  width?: number;
  height?: number;
  style?: any;
};

export function MediaCardSkeleton({ width = 140, height = 200, style }: MediaCardSkeletonProps) {
  const theme = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          opacity: opacityAnim,
        },
        style,
      ]}
    >
      <View style={styles.contentPlaceholder}>
        <View style={[styles.titlePlaceholder, { backgroundColor: theme.border }]} />
        <View style={[styles.subPlaceholder, { backgroundColor: theme.border }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: Spacing.sm,
  },
  contentPlaceholder: {
    width: '100%',
    gap: 6,
  },
  titlePlaceholder: {
    width: '80%',
    height: 12,
    borderRadius: 4,
  },
  subPlaceholder: {
    width: '50%',
    height: 10,
    borderRadius: 4,
  },
});
