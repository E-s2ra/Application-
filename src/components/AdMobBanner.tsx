import React, { useState } from 'react';
import { StyleSheet, View, Text, Platform, Image, Pressable, Linking } from 'react-native';
import { ADMOB_IDS, ANDROID_BANNER_ID, IOS_BANNER_ID } from '@/constants/admob';
import { Sparkles, ExternalLink } from 'lucide-react-native';
import { useGamification } from '@/hooks/useGamification';
import { VipSubscriptionModal } from './VipSubscriptionModal';

interface AdMobBannerProps {
  placement?: 'home_bottom' | 'watch_bottom' | 'search_bottom';
  style?: any;
}

export function AdMobBanner({ placement = 'home_bottom', style }: AdMobBannerProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(true);
  const [showVipModal, setShowVipModal] = useState(false);
  const { isVIP } = useGamification();

  // Commercial-Free Experience for Active VIP Members
  if (isVIP) return null;

  // Automatically select correct platform Ad Unit ID
  const adUnitId = Platform.select({
    android: ANDROID_BANNER_ID,
    ios: IOS_BANNER_ID,
    default: ANDROID_BANNER_ID,
  });

  if (hasError) return null;

  return (
    <View style={[styles.bannerContainer, style]}>
      {/* Ad Label */}
      <View style={styles.adLabelRow}>
        <View style={styles.adTag}>
          <Text style={styles.adTagText}>Ad · Google AdMob</Text>
        </View>
        <Text style={styles.adIdText} numberOfLines={1}>
          {Platform.OS.toUpperCase()} ID: ...{adUnitId.slice(-6)}
        </Text>
      </View>

      {/* Banner Creative Display */}
      <Pressable
        style={styles.bannerCreative}
        onPress={() => setShowVipModal(true)}
      >
        <View style={styles.bannerContent}>
          <View style={styles.iconBox}>
            <Sparkles size={18} color="#FFB800" />
          </View>
          <View style={styles.textBox}>
            <Text style={styles.bannerTitle} numberOfLines={1}>
              AniFlix 4K Ultra VIP Pass
            </Text>
            <Text style={styles.bannerSubtitle} numberOfLines={1}>
              Watch commercial-free with uncapped Dolby sound!
            </Text>
          </View>
        </View>

        <View style={styles.ctaBtn}>
          <Text style={styles.ctaBtnText}>Get VIP</Text>
          <ExternalLink size={12} color="#FFF" />
        </View>
      </Pressable>

      <VipSubscriptionModal visible={showVipModal} onClose={() => setShowVipModal(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    width: '100%',
    backgroundColor: '#0F0F18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222234',
    padding: 10,
    marginVertical: 12,
    alignSelf: 'center',
  },
  adLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adTag: {
    backgroundColor: '#1E1E2C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2C2C40',
  },
  adTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8A8AA2',
  },
  adIdText: {
    fontSize: 9,
    color: '#55556C',
    fontWeight: '600',
  },
  bannerCreative: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161622',
    borderRadius: 8,
    padding: 10,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#262010',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  textBox: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#8E8EA4',
    marginTop: 1,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E50914',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  ctaBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
});
