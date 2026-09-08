import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  Image,
  Animated,
  Easing,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import {
  X,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Tv,
  Coins,
  ShieldCheck,
} from 'lucide-react-native';
import { useAdMob } from '@/hooks/useAdMob';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';

const AD_TOTAL_SECONDS = 8;

export function AdMobRewardedModal() {
  const {
    isAdModalVisible,
    currentRewardCoins,
    onAdCompleted,
    closeAdModal,
  } = useAdMob();

  const themeColors = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const { isXS, isSmallDevice } = useResponsive();

  const [secondsRemaining, setSecondsRemaining] = useState(AD_TOTAL_SECONDS);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progressAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!isAdModalVisible) {
      setSecondsRemaining(AD_TOTAL_SECONDS);
      setIsCompleted(false);
      progressAnim.setValue(0);
      return;
    }

    // Animate progress bar from 0 to 1 over AD_TOTAL_SECONDS
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: AD_TOTAL_SECONDS * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsCompleted(true);
          onAdCompleted();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAdModalVisible, onAdCompleted, progressAnim]);

  if (!isAdModalVisible) return null;

  const progressPercent = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isLandscapeOrShort = windowHeight < 550;

  return (
    <Modal visible={isAdModalVisible} transparent animationType="fade" onRequestClose={isCompleted ? closeAdModal : undefined}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.adContainer,
            {
              backgroundColor: themeColors.backgroundCard,
              borderColor: themeColors.border,
              maxHeight: isLandscapeOrShort ? '98%' : '90%',
            },
          ]}
        >
          {/* Top AdMob Header Bar */}
          <View style={[styles.topAdBar, { backgroundColor: themeColors.backgroundElement, borderBottomColor: themeColors.border }]}>
            <View style={styles.adBadgeRow}>
              <View style={[styles.adLabel, { backgroundColor: `${themeColors.primary}20`, borderColor: `${themeColors.primary}40` }]}>
                <ShieldCheck size={11} color={themeColors.primary} />
                <Text style={[styles.adLabelText, { color: themeColors.primary }]} numberOfLines={1}>
                  {isXS ? 'AD' : 'SPONSORED'}
                </Text>
              </View>

              <View style={styles.rewardPill}>
                <Coins size={12} color="#FFB800" />
                <Text style={styles.rewardNoticeText} numberOfLines={1}>
                  +{currentRewardCoins} {isXS ? '💰' : 'Coins'}
                </Text>
              </View>
            </View>

            <View style={styles.topRightControls}>
              <Pressable
                style={[styles.iconBtn, { backgroundColor: themeColors.backgroundCard }]}
                onPress={() => setIsMuted(!isMuted)}
                accessibilityRole="button"
                accessibilityLabel={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? (
                  <VolumeX size={15} color={themeColors.text} />
                ) : (
                  <Volume2 size={15} color={themeColors.text} />
                )}
              </Pressable>

              {isCompleted ? (
                <Pressable
                  style={[styles.closeBtn, { backgroundColor: themeColors.primary }]}
                  onPress={closeAdModal}
                  accessibilityRole="button"
                  accessibilityLabel="Close Ad Modal"
                >
                  <X size={16} color="#FFFFFF" />
                </Pressable>
              ) : (
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownText} numberOfLines={1}>
                    {isXS ? `${secondsRemaining}s` : `Reward: ${secondsRemaining}s`}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressTrack, { backgroundColor: themeColors.border }]}>
            <Animated.View style={[styles.progressFill, { width: progressPercent, backgroundColor: themeColors.primary }]} />
          </View>

          {/* Scrollable Container for small screens */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {/* Video / Creative Showcase */}
            <View style={[styles.creativeArea, isLandscapeOrShort && { height: 180 }]}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80',
                }}
                style={styles.adImage}
                resizeMode="cover"
              />
              <View style={styles.adOverlayDark} />

              {/* Ad Content Overlay */}
              <View style={styles.adHeroContent}>
                <View style={styles.sponsorRow}>
                  <Tv size={18} color="#00D2FF" />
                  <Text style={styles.sponsorName}>AniFlix Ultra HD Sponsor</Text>
                </View>
                <Text style={[styles.adHeadline, isXS && { fontSize: 16, lineHeight: 22 }]}>
                  Stream Next-Gen Anime & Movies in Pure 4K OLED
                </Text>
                {!isLandscapeOrShort && (
                  <Text style={styles.adSubtext}>
                    No buffering. Uncapped bandwidth. Available globally on all devices.
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Reward Status Bottom Banner */}
          <View style={[styles.bottomBanner, { backgroundColor: themeColors.backgroundElement, borderTopColor: themeColors.border }]}>
            {isCompleted ? (
              <View style={styles.rewardSuccessBox}>
                <View style={styles.successLeft}>
                  <CheckCircle2 size={22} color="#00E676" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.successTitle}>Reward Granted!</Text>
                    <Text style={[styles.successSubtitle, { color: themeColors.textSecondary }]} numberOfLines={1}>
                      +{currentRewardCoins} AniFlix Coins added to account
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={[styles.claimButton, { backgroundColor: themeColors.primary }]}
                  onPress={closeAdModal}
                  accessibilityRole="button"
                >
                  <Text style={styles.claimButtonText}>Claim & Return</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.waitingBox}>
                <Sparkles size={16} color="#FFB800" />
                <Text style={[styles.waitingText, { color: themeColors.textSecondary }]}>
                  Watch full ad for <Text style={{ color: '#FFD700', fontWeight: '800' }}>+{currentRewardCoins} Coins</Text>
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  adContainer: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  topAdBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 6,
  },
  adBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexShrink: 1,
  },
  adLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  adLabelText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rewardNoticeText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '800',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownBox: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  countdownText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
  },
  progressFill: {
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
  },
  creativeArea: {
    height: 260,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  adImage: {
    ...StyleSheet.absoluteFillObject,
  },
  adOverlayDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 12, 0.65)',
  },
  adHeroContent: {
    padding: 16,
    zIndex: 5,
  },
  sponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sponsorName: {
    color: '#00D2FF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  adHeadline: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    marginBottom: 4,
  },
  adSubtext: {
    color: '#D0D0E2',
    fontSize: 12,
    lineHeight: 16,
  },
  bottomBanner: {
    padding: 14,
    borderTopWidth: 1,
  },
  waitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  waitingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rewardSuccessBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  successLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  successTitle: {
    color: '#00E676',
    fontSize: 14,
    fontWeight: '800',
  },
  successSubtitle: {
    fontSize: 11,
  },
  claimButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
});

