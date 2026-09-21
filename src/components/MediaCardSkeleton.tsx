import React, { useEffect, useState } from 'react';
import { View, Animated, StyleSheet, Platform, AccessibilityInfo } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';

type MediaCardSkeletonProps = {
  width?: number;
  height?: number;
  style?: any;
};

export function MediaCardSkeleton({ width = 140, height = 200, style }: MediaCardSkeletonProps) {
  const theme = useTheme();
  const [opacityAnim] = useState(() => new Animated.Value(0.4));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacityAnim.stopAnimation();
      opacityAnim.setValue(0.6);
      return;
    }

    const isNativeDriver = Platform.OS !== 'web';
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: isNativeDriver,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: isNativeDriver,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim, reduceMotion]);

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
        <View style={[styles.titlePlaceholder, { backgroundColor: theme.backgroundSelected }]} />
        <View style={[styles.subPlaceholder, { backgroundColor: theme.backgroundSelected }]} />
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
