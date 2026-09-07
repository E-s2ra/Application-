import React, { useState } from 'react';
import { StyleSheet, View, Text, Platform, Pressable } from 'react-native';
import { Sparkles, Crown, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useGamification } from '@/hooks/useGamification';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import { VipSubscriptionModal } from './VipSubscriptionModal';

interface AdMobBannerProps {
  placement?: 'home_bottom' | 'watch_bottom' | 'search_bottom';
  style?: any;
}

export function AdMobBanner({ placement = 'home_bottom', style }: AdMobBannerProps) {
  const [hasError, setHasError] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const { isVIP } = useGamification();
  const themeColors = useTheme();
  const { isXS, isSmallDevice } = useResponsive();

  // Commercial-Free Experience for Active VIP Members
  if (isVIP || hasError) return null;

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[
          styles.bannerContainer,
          {
            backgroundColor: themeColors.backgroundCard,
            borderColor: themeColors.border,
          },
        ]}
      >
        {/* Top Header Tag */}
        <View style={styles.topBar}>
          <View style={[styles.sponsorBadge, { backgroundColor: `${themeColors.primary}18`, borderColor: `${themeColors.primary}40` }]}>
            <Sparkles size={11} color={themeColors.primary} />
            <Text style={[styles.sponsorBadgeText, { color: themeColors.primary }]}>SPONSORED</Text>
          </View>

          <View style={styles.adLabelRight}>
            <ShieldCheck size={11} color={themeColors.textSecondary} />
            <Text style={[styles.adLabelText, { color: themeColors.textSecondary }]}>AdMob Verified</Text>
          </View>
        </View>

        {/* Banner Content Card */}
        <Pressable
          style={({ pressed }) => [
            styles.bannerContentRow,
            { backgroundColor: themeColors.backgroundElement },
            pressed && { opacity: 0.9, transform: [{ scale: 0.995 }] },
          ]}
          onPress={() => setShowVipModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Remove Ads with AniFlix VIP"
        >
          <View style={styles.leftInfoGroup}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 184, 0, 0.15)', borderColor: '#FFB800' }]}>
              <Crown size={isSmallDevice ? 16 : 18} color="#FFB800" />
            </View>

            <View style={styles.textGroup}>
              <Text style={[styles.bannerTitle, { color: themeColors.text }]} numberOfLines={1}>
                AniFlix Commercial-Free Pass
              </Text>
              <Text style={[styles.bannerSubtitle, { color: themeColors.textSecondary }]} numberOfLines={1}>
                {isXS ? 'Upgrade to VIP for 4K Dolby Stream' : 'Stream uninterrupted in 4K OLED with zero ads & uncapped speed'}
              </Text>
            </View>
          </View>

          <View style={[styles.ctaBtn, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.ctaBtnText}>{isSmallDevice ? 'VIP' : 'Remove Ads'}</Text>
            <ArrowRight size={12} color="#FFFFFF" />
          </View>
        </Pressable>
      </View>

      <VipSubscriptionModal visible={showVipModal} onClose={() => setShowVipModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    marginVertical: 10,
  },
  bannerContainer: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sponsorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  sponsorBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  adLabelRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adLabelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  bannerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  leftInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  textGroup: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  bannerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  ctaBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

