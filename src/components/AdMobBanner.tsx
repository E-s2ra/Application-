import React, { useState } from 'react';
import { StyleSheet, View, Text, Platform, Pressable } from 'react-native';
import { Crown, ArrowRight } from 'lucide-react-native';
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
        <View style={styles.topBar}>
          <Text style={[styles.sponsorBadgeText, { color: themeColors.textMuted }]}>ANIFLIX VIP</Text>
          <Text style={[styles.adLabelText, { color: themeColors.textMuted }]}>Membership</Text>
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
            <View style={[styles.iconBox, { backgroundColor: themeColors.backgroundSelected }]}>
              <Crown size={isSmallDevice ? 16 : 18} color={themeColors.primary} />
            </View>

            <View style={styles.textGroup}>
              <Text style={[styles.bannerTitle, { color: themeColors.text }]} numberOfLines={1}>
                Watch without interruptions
              </Text>
              <Text style={[styles.bannerSubtitle, { color: themeColors.textSecondary }]} numberOfLines={1}>
                {isXS ? 'VIP removes ads' : 'Upgrade to VIP for an uninterrupted viewing experience'}
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
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sponsorBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  adLabelText: {
    fontSize: 10,
    fontWeight: '500',
  },
  bannerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  leftInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textGroup: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ctaBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

