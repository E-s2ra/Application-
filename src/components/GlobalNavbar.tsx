import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import { useResponsive } from '@/hooks/useResponsive';
import { useGamification } from '@/hooks/useGamification';
import { useSidebar } from '@/context/SidebarContext';
import { useRouter } from 'expo-router';
import { PrimaryGradient } from '@/components/PrimaryGradient';
import { VipSubscriptionModal } from '@/components/VipSubscriptionModal';
import { Play, Menu, ArrowLeft, ArrowRight, Crown } from 'lucide-react-native';
import { Layout, Radius, Spacing, Typography } from '@/constants/theme';

export type GlobalNavbarProps = {
  title?: string;
  showBack?: boolean;
  showBrandLogo?: boolean;
  rightActions?: React.ReactNode;
  onBackPress?: () => void;
};

export function GlobalNavbar({
  title,
  showBack = false,
  showBrandLogo = true,
  rightActions,
  onBackPress,
}: GlobalNavbarProps) {
  const insets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };
  const themeColors = useTheme();
  const { isRTL } = useLanguage();
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { openSidebar } = useSidebar();

  const gamification = useGamification() || {};
  const isVIP = gamification.isVIP ?? false;
  const vipDaysRemaining = gamification.vipDaysRemaining ?? 0;

  const [showVipModal, setShowVipModal] = useState(false);

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <>
      <View
        style={[
          styles.navbarContainer,
          {
            backgroundColor: themeColors.background,
            borderBottomColor: themeColors.border,
            paddingTop: Math.max(insets.top + 2, 10),
          },
        ]}
      >
        <View style={[styles.navbarInner, isRTL && styles.rowReverse]}>
          {/* Left Section: Back Arrow or Sidebar Menu */}
          <View style={[styles.leftSection, isRTL && styles.rowReverse]}>
            {showBack ? (
              <Pressable
                onPress={handleBack}
                style={({ pressed }) => [
                  styles.iconBtn,
                  { backgroundColor: pressed ? themeColors.backgroundSelected : 'transparent' },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Go Back"
              >
                {isRTL ? (
                  <ArrowRight color={themeColors.text} size={18} />
                ) : (
                  <ArrowLeft color={themeColors.text} size={18} />
                )}
              </Pressable>
            ) : !isDesktop ? (
              <Pressable
                onPress={openSidebar}
                style={({ pressed }) => [
                  styles.iconBtn,
                  { backgroundColor: pressed ? themeColors.backgroundSelected : 'transparent' },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Open Navigation Sidebar"
              >
                <Menu color={themeColors.text} size={18} />
              </Pressable>
            ) : null}

            {/* Brand Logo or Custom Title */}
            {showBrandLogo ? (
              <View style={[styles.brandRow, isRTL && styles.rowReverse]}>
                <View style={[styles.brandIcon, { backgroundColor: themeColors.primary }]}>
                  <PrimaryGradient borderRadius={10} />
                  <Play color="#FFFFFF" fill="#FFFFFF" size={12} />
                </View>
                <Text style={[styles.brandName, { color: themeColors.text }]}>
                  ANI<Text style={{ color: themeColors.primary }}>FLIX</Text>
                </Text>
              </View>
            ) : title ? (
              <Text
                style={[styles.pageTitle, { color: themeColors.text, textAlign: isRTL ? 'right' : 'left' }]}
                numberOfLines={1}
              >
                {title}
              </Text>
            ) : null}
          </View>

          {/* Right Section: VIP Badge or Custom Actions */}
          <View style={[styles.rightSection, isRTL && styles.rowReverse]}>
            {rightActions ? (
              rightActions
            ) : (
              <>
                {/* VIP Subscription Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.vipBtn,
                    {
                      backgroundColor: pressed ? themeColors.backgroundSelected : themeColors.backgroundElement,
                      borderColor: themeColors.border,
                    },
                  ]}
                  onPress={() => setShowVipModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel={isVIP ? `VIP membership, ${vipDaysRemaining} days remaining` : 'Open VIP membership options'}
                >
                  <Crown size={14} color={themeColors.primary} />
                  <Text style={[styles.vipText, { color: themeColors.text }]}>
                    {isVIP ? `VIP (${vipDaysRemaining}d)` : 'VIP'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Modals */}
      <VipSubscriptionModal visible={showVipModal} onClose={() => setShowVipModal(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  navbarContainer: {
    width: '100%',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 9,
    zIndex: 100,
  },
  navbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: Layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  pageTitle: {
    ...Typography.h3,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 11,
    minHeight: 44,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  vipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});
