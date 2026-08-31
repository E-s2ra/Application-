import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useGamification } from '@/hooks/useGamification';
import { useSidebar } from '@/context/SidebarContext';
import { useRouter } from 'expo-router';
import { PrimaryGradient } from '@/components/PrimaryGradient';
import { RewardsHubModal } from '@/components/RewardsHubModal';
import { VipSubscriptionModal } from '@/components/VipSubscriptionModal';
import { Sparkles, Menu, ArrowLeft, Coins, Crown } from 'lucide-react-native';

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
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { openSidebar } = useSidebar();

  const gamification = useGamification() || {};
  const coins = gamification.coins ?? 0;
  const streakDays = gamification.streakDays ?? 0;
  const isVIP = gamification.isVIP ?? false;
  const vipDaysRemaining = gamification.vipDaysRemaining ?? 0;

  const [showRewardsModal, setShowRewardsModal] = useState(false);
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
            backgroundColor: themeColors.backgroundElement,
            borderBottomColor: themeColors.border,
            paddingTop: Math.max(insets.top + 4, 12),
          },
        ]}
      >
        <View style={styles.navbarInner}>
          {/* Left Section: Back Arrow or Sidebar Menu */}
          <View style={styles.leftSection}>
            {showBack ? (
              <Pressable
                onPress={handleBack}
                style={[styles.iconBtn, { borderColor: themeColors.border }]}
                accessibilityRole="button"
                accessibilityLabel="Go Back"
              >
                <ArrowLeft color={themeColors.text} size={18} />
              </Pressable>
            ) : !isDesktop ? (
              <Pressable
                onPress={openSidebar}
                style={[styles.iconBtn, { borderColor: themeColors.border }]}
                accessibilityRole="button"
                accessibilityLabel="Open Navigation Sidebar"
              >
                <Menu color={themeColors.text} size={18} />
              </Pressable>
            ) : null}

            {/* Brand Logo or Custom Title */}
            {showBrandLogo ? (
              <View style={styles.brandRow}>
                <View style={[styles.brandIcon, { backgroundColor: themeColors.primary }]}>
                  <PrimaryGradient borderRadius={8} />
                  <Sparkles color="#FFFFFF" size={14} />
                </View>
                <Text style={[styles.brandName, { color: themeColors.text }]}>
                  ANI<Text style={{ color: themeColors.primary }}>FLIX</Text>
                </Text>
              </View>
            ) : title ? (
              <Text style={[styles.pageTitle, { color: themeColors.text }]} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
          </View>

          {/* Right Section: VIP Badge or Custom Actions */}
          <View style={styles.rightSection}>
            {rightActions ? (
              rightActions
            ) : (
              <>
                {/* VIP Subscription Button */}
                <Pressable
                  style={styles.vipBtn}
                  onPress={() => setShowVipModal(true)}
                >
                  <Crown size={14} color="#FFB800" />
                  <Text style={styles.vipText}>
                    {isVIP ? `VIP (${vipDaysRemaining}d)` : 'VIP'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Modals */}
      <RewardsHubModal visible={showRewardsModal} onClose={() => setShowRewardsModal(false)} />
      <VipSubscriptionModal visible={showVipModal} onClose={() => setShowVipModal(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  navbarContainer: {
    width: '100%',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 100,
  },
  navbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 1,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  coinsText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '800',
  },
  dotDivider: {
    color: '#888899',
    fontSize: 11,
  },
  streakText: {
    color: '#0356C5',
    fontSize: 11,
    fontWeight: '800',
  },
  vipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFB800',
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
  },
  vipText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '900',
  },
});
