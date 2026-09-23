import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  Platform,
  Dimensions,
  AccessibilityInfo,
} from 'react-native';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';
import {
  X,
  Flame,
  Gift,
  Sparkles,
  Trophy,
  Award,
  Crown,
  Coins,
  Palette,
  CheckCircle,
  Film,
  Zap,
  ChevronRight,
  Info,
  Target,
} from 'lucide-react-native';
import { useGamification, SPIN_REWARDS, SpinReward } from '@/hooks/useGamification';
import { useAdMob } from '@/hooks/useAdMob';
import { VipSubscriptionModal } from './VipSubscriptionModal';
import { useLanguage } from '@/hooks/use-language';
import { PrimaryGradient } from '@/components/PrimaryGradient';
import { useResponsive } from '@/hooks/useResponsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function LuckyWheelSvg({ rewards, size = 210 }: { rewards: SpinReward[]; size?: number }) {
  const center = size / 2;
  const radius = center - 4;
  const numSlices = rewards.length;
  const sliceAngle = 360 / numSlices;

  const sliceColors = [
    { bg: '#261F0B', border: '#FFB800' },
    { bg: '#0A2228', border: '#00D2FF' },
    { bg: '#220A28', border: '#E040FB' },
    { bg: '#28160A', border: '#FF9800' },
    { bg: '#0A2819', border: '#00E676' },
    { bg: '#0A1628', border: '#0356C5' },
  ];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Outer Border Circle */}
      <Circle cx={center} cy={center} r={center - 2} fill="#131626" stroke="#FFB800" strokeWidth={4} />

      <G>
        {rewards.map((r, i) => {
          const startAngle = i * sliceAngle - 90;
          const endAngle = (i + 1) * sliceAngle - 90;
          const midAngle = startAngle + sliceAngle / 2;

          const rad1 = (startAngle * Math.PI) / 180;
          const rad2 = (endAngle * Math.PI) / 180;
          const radMid = (midAngle * Math.PI) / 180;

          const x1 = center + radius * Math.cos(rad1);
          const y1 = center + radius * Math.sin(rad1);
          const x2 = center + radius * Math.cos(rad2);
          const y2 = center + radius * Math.sin(rad2);

          const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;

          const textRadius = radius * 0.62;
          const tx = center + textRadius * Math.cos(radMid);
          const ty = center + textRadius * Math.sin(radMid);

          const palette = sliceColors[i % sliceColors.length];
          const isSmall = size < 190;

          return (
            <G key={r.id}>
              {/* Wedge Sector Path */}
              <Path d={pathData} fill={palette.bg} stroke="#FFB800" strokeWidth={1.5} />

              {/* Icon Emoji */}
              <SvgText
                x={tx}
                y={ty - (isSmall ? 4 : 6)}
                fill="#FFFFFF"
                fontSize={isSmall ? 13 : 16}
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {r.icon}
              </SvgText>

              {/* Label Text */}
              <SvgText
                x={tx}
                y={ty + (isSmall ? 8 : 10)}
                fill={r.color || palette.border}
                fontSize={isSmall ? 8.5 : 10}
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {r.label}
              </SvgText>
            </G>
          );
        })}
      </G>

      {/* Center Golden Hub */}
      <Circle cx={center} cy={center} r={size < 190 ? 18 : 24} fill="#0A0C14" stroke="#FFD700" strokeWidth={2.5} />
    </Svg>
  );
}

interface RewardsHubModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RewardsHubModal({ visible, onClose }: RewardsHubModalProps) {
  const themeColors = useTheme();
  const { t, language } = useLanguage();
  const { showRewardedAd } = useAdMob();
  const { isXS, isSmallDevice } = useResponsive();
  const [showVipModal, setShowVipModal] = useState(false);
  const [showSourcesInfo, setShowSourcesInfo] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const wheelSize = isSmallDevice ? 160 : isXS ? 180 : 210;
  const bulbRadius = Math.round(wheelSize / 2) + 4;

  const {
    coins,
    xp,
    level,
    levelTitle,
    nextLevelXP,
    currentLevelBaseXP,
    streakDays,
    hasClaimedDailyStreak,
    canSpinWheel,
    vipDaysRemaining,
    isVIP,
    activeEvent,
    allEvents,
    missions,
    themes,
    activeTheme,
    badges,
    walletLedger,
    isWalletSyncing,
    walletSyncError,
    walletLastVerifiedAt,
    claimDailyStreak,
    spinWheel,
    claimMission,
    unlockTheme,
    equipTheme,
    refreshGamification,
  } = useGamification();

  useEffect(() => {
    if (visible) void refreshGamification();
  }, [refreshGamification, visible]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  const [activeTab, setActiveTab] = useState<'wallet' | 'spin' | 'streak' | 'missions' | 'themes' | 'badges'>('wallet');

  const [spinAnim] = useState(() => new Animated.Value(0));
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonReward, setWonReward] = useState<SpinReward | null>(null);

  const levelXPProgress = xp - currentLevelBaseXP;
  const levelXPTarget = Math.max(1, nextLevelXP - currentLevelBaseXP);
  const xpPercent = Math.min(100, Math.max(0, (levelXPProgress / levelXPTarget) * 100));
  const curatorMission = missions.find((mission) => mission.id === 'm-daily-3');
  const walletReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      opening_balance: 'Opening balance',
      daily_login: 'Daily reward',
      mission_reward: 'Task reward',
      lucky_spin: 'Lucky spin',
      rewarded_ad: 'Verified ad reward',
      content_unlock: 'Content unlock',
      theme_unlock: 'Theme unlock',
      vip_access: 'VIP access',
      credit: 'Coin credit',
      debit: 'Coin spend',
    };
    return labels[reason] ?? reason.replace(/_/g, ' ');
  };

  const handleSpinPress = async () => {
    if (isSpinning || !canSpinWheel) return;
    setIsSpinning(true);
    setWonReward(null);

    const targetReward = await spinWheel();
    const targetIdx = SPIN_REWARDS.findIndex((r) => r.id === targetReward.id);
    const sliceAngle = 360 / SPIN_REWARDS.length;
    const finalDegree = 360 * 5 + (360 - (targetIdx < 0 ? 0 : targetIdx) * sliceAngle);

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: finalDegree,
      duration: reduceMotion ? 0 : 3500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setIsSpinning(false);
      setWonReward(targetReward);
    });
  };

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: themeColors.scrim }]}>
        <View
          accessibilityViewIsModal
          style={[styles.modalCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}
        >
          <View style={[styles.modalHeader, { backgroundColor: themeColors.backgroundCard, borderBottomColor: themeColors.border }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconGlow, { backgroundColor: themeColors.backgroundSelected }]}>
                <Trophy size={20} color={themeColors.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: themeColors.text }]}>{t('rewardsHubTitle', 'Rewards')}</Text>
                <Text style={[styles.modalSubtitle, { color: themeColors.textSecondary }]}>
                  {t('rewardsHubSubtitle', 'Earn coins, level up & unlock exclusive themes')}
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: pressed ? themeColors.backgroundSelected : themeColors.backgroundElement },
              ]}
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close rewards"
            >
              <X size={18} color={themeColors.textSecondary} />
            </Pressable>
          </View>

          <View style={[styles.statusCard, { backgroundColor: themeColors.backgroundElement }]}>
            <View style={styles.statusRow}>
              <View style={styles.userProfileInfo}>
                <View style={[styles.levelBadge, { backgroundColor: themeColors.backgroundSelected }]}>
                  <Crown size={13} color={themeColors.primary} />
                  <Text style={[styles.levelBadgeText, { color: themeColors.primary }]}>{t('level', 'LVL')} {level}</Text>
                </View>
                <Text style={[styles.levelTitleText, { color: themeColors.text }]} numberOfLines={1}>
                  {t(levelTitle as any, levelTitle)}
                </Text>
              </View>

              <View style={styles.statsRightGroup}>
                {isVIP ? (
                  <View style={[styles.vipBadge, { backgroundColor: themeColors.backgroundSelected }]}>
                    <Crown size={12} color={themeColors.primary} />
                    <Text style={[styles.vipBadgeText, { color: themeColors.primary }]}>VIP ({vipDaysRemaining}{language === 'ku' ? 'ڕ' : 'd'})</Text>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.getVipBtn, { backgroundColor: themeColors.backgroundSelected }]}
                    onPress={() => setShowVipModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Open VIP membership options"
                  >
                    <Crown size={12} color={themeColors.primary} />
                    <Text style={[styles.getVipBtnText, { color: themeColors.primary }]}>{t('getVip', 'Get VIP')}</Text>
                  </Pressable>
                )}

                <View style={[styles.coinPill, { backgroundColor: themeColors.backgroundSelected }]}>
                  <Coins size={14} color={themeColors.primary} />
                  <Text style={[styles.coinPillText, { color: themeColors.text }]}>
                    {coins.toLocaleString()} {t('coinsText', 'Coins')}
                  </Text>
                </View>
              </View>
            </View>

            {/* XP Progress Bar */}
            <View style={styles.xpBarSection}>
              <View style={[styles.xpTrack, { backgroundColor: themeColors.backgroundSelected }]}>
                <View style={[styles.xpFill, { width: `${xpPercent}%`, backgroundColor: themeColors.primary }]} />
              </View>
              <View style={styles.xpInfoRow}>
                <Text style={[styles.xpTextLeft, { color: themeColors.textSecondary }]}>{levelXPProgress} / {levelXPTarget} XP</Text>
                <Text style={[styles.xpTextRight, { color: themeColors.primary }]}>
                  {t('levelUnlocks', `Level ${level + 1} Unlocks`).replace('{level}', String(level + 1))}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.dailySourcesBar, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}>
            <View style={styles.sourcesHeaderRow}>
              <Pressable
                style={styles.sourcesToggleBtn}
                onPress={() => setShowSourcesInfo(!showSourcesInfo)}
                accessibilityRole="button"
                accessibilityLabel="Toggle reward source details"
                accessibilityState={{ expanded: showSourcesInfo }}
              >
                <Zap size={14} color={themeColors.primary} />
                <Text style={[styles.sourcesTitle, { color: themeColors.text }]}>{t('dailyCoinSources', 'Daily coin sources')}</Text>
                <Info size={12} color={themeColors.textMuted} />
              </Pressable>

              {!isVIP && Platform.OS !== 'web' && (
                <Pressable
                  style={({ pressed }) => [
                    styles.watchAdCompactBtn,
                    { backgroundColor: themeColors.primary },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                  onPress={() =>
                    showRewardedAd({
                      rewardCoins: 12,
                      rewardType: 'coins',
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Watch Rewarded Ad for 12 Coins"
                >
                  <Film size={13} color="#FFFFFF" />
                  <Text style={styles.watchAdBtnText}>{t('watchAdCoins', 'Watch Ad (+12 Coins)')}</Text>
                </Pressable>
              )}
            </View>

            {showSourcesInfo && (
              <View style={styles.sourcesChipsGrid}>
                {Platform.OS !== 'web' && (
                  <View style={styles.sourceChip}>
                    <Text style={styles.sourceChipValue}>+12 {t('coinsText', 'Coins')}</Text>
                    <Text style={styles.sourceChipLabel}>Per verified ad</Text>
                  </View>
                )}
                <View style={styles.sourceChip}>
                  <Text style={styles.sourceChipValue}>+15 {t('coinsText', 'Coins')}</Text>
                  <Text style={styles.sourceChipLabel}>{t('dailyStreakSource', 'Daily Streak')}</Text>
                </View>
                <View style={styles.sourceChip}>
                  <Text style={styles.sourceChipValue}>Variable prize</Text>
                  <Text style={styles.sourceChipLabel}>{t('luckySpinSource', 'Lucky Spin')}</Text>
                </View>
                {curatorMission && (
                  <View style={styles.sourceChip}>
                    <Text style={styles.sourceChipValue}>+{curatorMission.rewardCoins} {t('coinsText', 'Coins')}</Text>
                    <Text style={styles.sourceChipLabel}>Curator Task</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 🎯 Tab Selector Segment */}
          <View style={styles.navTabsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navTabsRow}>
              <Pressable
                style={[styles.tabSegment, activeTab === 'wallet' && styles.tabSegmentActive]}
                onPress={() => setActiveTab('wallet')}
                accessibilityRole="tab"
                accessibilityLabel="Wallet history tab"
                accessibilityState={{ selected: activeTab === 'wallet' }}
              >
                <Coins size={15} color={activeTab === 'wallet' ? themeColors.primary : themeColors.textMuted} />
                <Text style={[styles.tabSegmentText, activeTab === 'wallet' && styles.tabSegmentTextActive]}>
                  Wallet
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabSegment, activeTab === 'spin' && styles.tabSegmentActive]}
                onPress={() => setActiveTab('spin')}
                accessibilityRole="tab"
                accessibilityLabel="Lucky Spin rewards tab"
                accessibilityState={{ selected: activeTab === 'spin' }}
              >
                <Gift size={15} color={activeTab === 'spin' ? themeColors.primary : themeColors.textMuted} />
                <Text style={[styles.tabSegmentText, activeTab === 'spin' && styles.tabSegmentTextActive]}>
                  {t('tabLuckySpin', 'Lucky Spin')}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabSegment, activeTab === 'streak' && styles.tabSegmentActive]}
                onPress={() => setActiveTab('streak')}
                accessibilityRole="tab"
                accessibilityLabel="Daily streak rewards tab"
                accessibilityState={{ selected: activeTab === 'streak' }}
              >
                <Flame size={15} color={activeTab === 'streak' ? themeColors.primary : themeColors.textMuted} />
                <Text style={[styles.tabSegmentText, activeTab === 'streak' && styles.tabSegmentTextActive]}>
                  {t('tabStreak', 'Streak')} ({streakDays}{language === 'ku' ? 'ڕ' : 'd'})
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabSegment, activeTab === 'missions' && styles.tabSegmentActive]}
                onPress={() => setActiveTab('missions')}
                accessibilityRole="tab"
                accessibilityLabel="Tasks rewards tab"
                accessibilityState={{ selected: activeTab === 'missions' }}
              >
                <Target size={15} color={activeTab === 'missions' ? themeColors.primary : themeColors.textMuted} />
                <Text style={[styles.tabSegmentText, activeTab === 'missions' && styles.tabSegmentTextActive]}>
                  {t('missions', 'Tasks')}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabSegment, activeTab === 'themes' && styles.tabSegmentActive]}
                onPress={() => setActiveTab('themes')}
                accessibilityRole="tab"
                accessibilityLabel="Theme shop rewards tab"
                accessibilityState={{ selected: activeTab === 'themes' }}
              >
                <Palette size={15} color={activeTab === 'themes' ? themeColors.primary : themeColors.textMuted} />
                <Text style={[styles.tabSegmentText, activeTab === 'themes' && styles.tabSegmentTextActive]}>
                  {t('tabThemeShop', 'Theme Shop')}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabSegment, activeTab === 'badges' && styles.tabSegmentActive]}
                onPress={() => setActiveTab('badges')}
                accessibilityRole="tab"
                accessibilityLabel="Badges rewards tab"
                accessibilityState={{ selected: activeTab === 'badges' }}
              >
                <Award size={15} color={activeTab === 'badges' ? themeColors.primary : themeColors.textMuted} />
                <Text style={[styles.tabSegmentText, activeTab === 'badges' && styles.tabSegmentTextActive]}>
                  {t('tabBadges', 'Badges')}
                </Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* 📜 Main Content Area */}
          <ScrollView style={styles.mainScrollView} contentContainerStyle={styles.mainScrollContent}>
            {activeTab === 'wallet' && (
              <View style={styles.walletSection}>
                <View style={styles.sectionHeaderLeft}>
                  <Text style={styles.sectionTitle}>Coin Wallet</Text>
                  <Text style={styles.sectionSub}>Server-verified balance history for your account.</Text>
                </View>

                <View style={[styles.walletBalanceCard, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}>
                  <View>
                    <Text style={[styles.walletBalanceLabel, { color: themeColors.textSecondary }]}>Available balance</Text>
                    <Text style={[styles.walletBalanceValue, { color: themeColors.text }]}>{coins.toLocaleString()} Coins</Text>
                  </View>
                  {walletLastVerifiedAt && !walletSyncError ? (
                    <View style={[styles.walletStatusPill, { backgroundColor: themeColors.backgroundSelected }]}>
                      <CheckCircle size={13} color={themeColors.primary} />
                      <Text style={[styles.walletStatusText, { color: themeColors.primary }]}>Server verified</Text>
                    </View>
                  ) : null}
                </View>

                {isWalletSyncing ? (
                  <Text style={[styles.walletEmptyText, { color: themeColors.textSecondary }]}>Refreshing wallet history…</Text>
                ) : walletSyncError ? (
                  <View style={styles.walletErrorBox}>
                    <Text style={[styles.walletEmptyText, { color: themeColors.error, paddingVertical: 8 }]}>Wallet verification is unavailable.</Text>
                    <Pressable
                      style={[styles.walletRetryBtn, { backgroundColor: themeColors.primary }]}
                      onPress={() => void refreshGamification()}
                      accessibilityRole="button"
                      accessibilityLabel="Retry wallet verification"
                    >
                      <Text style={styles.walletRetryText}>Retry</Text>
                    </Pressable>
                  </View>
                ) : walletLedger.length === 0 ? (
                  <Text style={[styles.walletEmptyText, { color: themeColors.textSecondary }]}>No coin activity yet.</Text>
                ) : (
                  <View style={styles.walletLedgerList}>
                    {walletLedger.map((entry) => (
                      <View
                        key={entry.id}
                        style={[styles.walletLedgerRow, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}
                        accessible
                        accessibilityLabel={`${walletReasonLabel(entry.reason)}, ${entry.delta > 0 ? 'plus' : 'minus'} ${Math.abs(entry.delta)} coins, balance ${entry.balance_after}`}
                      >
                        <View style={styles.walletLedgerCopy}>
                          <Text style={[styles.walletLedgerReason, { color: themeColors.text }]}>{walletReasonLabel(entry.reason)}</Text>
                          <Text style={[styles.walletLedgerDate, { color: themeColors.textMuted }]}>
                            {new Date(entry.created_at).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.walletLedgerAmountWrap}>
                          <Text style={[styles.walletLedgerAmount, { color: entry.delta > 0 ? '#34D399' : themeColors.text }]}>
                            {entry.delta > 0 ? '+' : ''}{entry.delta}
                          </Text>
                          <Text style={[styles.walletLedgerBalance, { color: themeColors.textMuted }]}>Bal. {entry.balance_after}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* 🎡 LUCKY SPIN TAB */}
            {activeTab === 'spin' && (
              <View style={styles.spinSection}>
                <View style={styles.sectionHeaderCenter}>
                  <Text style={styles.heroTitle}>{t('luckyWheelTitle', 'Daily Lucky Cinema Wheel')}</Text>
                  <Text style={styles.heroSubtitle}>
                    {t('luckyWheelSub', 'Spin once every day for free Coins, XP, and VIP Passes!')}
                  </Text>
                </View>

                {/* 🎡 Outer Wheel Container with Perimeter Lights */}
                <View style={[styles.wheelOuterContainer, { width: wheelSize + 24, height: wheelSize + 24 }]}>
                  {/* Perimeter Light Bulbs */}
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, index) => (
                    <View
                      key={deg}
                      style={[
                        styles.wheelLightBulb,
                        {
                          transform: [
                            { rotate: `${deg}deg` },
                            { translateY: -bulbRadius },
                          ],
                          backgroundColor: index % 2 === 0 ? '#FFB800' : '#00D2FF',
                        },
                      ]}
                    />
                  ))}

                  {/* Golden Pointer Pin */}
                  <View style={styles.wheelPointerTriangle} />

                  {/* Animated Wheel Body */}
                  <Animated.View
                    style={{
                      width: wheelSize,
                      height: wheelSize,
                      justifyContent: 'center',
                      alignItems: 'center',
                      transform: [{ rotate: spinRotation }],
                    }}
                  >
                    <LuckyWheelSvg rewards={SPIN_REWARDS} size={wheelSize} />
                  </Animated.View>
                </View>

                {/* Spin CTA Button — Positioned directly below wheel for instant access */}
                <Pressable
                  style={[
                    styles.spinPrimaryBtn,
                    (!canSpinWheel || isSpinning) && styles.spinPrimaryBtnDisabled,
                  ]}
                  disabled={!canSpinWheel || isSpinning}
                  onPress={handleSpinPress}
                  accessibilityRole="button"
                  accessibilityLabel="Spin Cinema Wheel"
                >
                  <PrimaryGradient borderRadius={14} />
                  <Text style={styles.spinPrimaryBtnText}>
                    {isSpinning
                      ? t('spinningWheel', 'Spinning Wheel...')
                      : canSpinWheel
                      ? t('spinWheelNow', 'SPIN WHEEL NOW (FREE)')
                      : t('spunTodayReturnTomorrow', '✓ Spun Today - Return Tomorrow!')}
                  </Text>
                </Pressable>

                {/* Winner Celebration Banner */}
                {wonReward && (
                  <View style={[styles.wonRewardBanner, { borderColor: wonReward.color || '#FFB800' }]}>
                    <Sparkles size={18} color={wonReward.color || '#FFD700'} />
                    <Text style={[styles.wonRewardText, { color: wonReward.color || '#FFD700' }]}>
                      {t('congratsWon', 'Congratulations! You won')} {wonReward.label}!
                    </Text>
                  </View>
                )}

                {/* Wheel Rewards Pool Legend Grid */}
                <View style={styles.prizesLegendBox}>
                  <Text style={styles.prizesLegendTitle}>{t('availablePrizes', 'AVAILABLE PRIZES ON WHEEL')}</Text>
                  <View style={styles.prizesGrid}>
                    {SPIN_REWARDS.map((r) => (
                      <View key={r.id} style={[styles.prizeChip, { borderColor: `${r.color}50` }]}>
                        <Text style={styles.prizeChipIcon}>{r.icon}</Text>
                        <Text style={[styles.prizeChipText, { color: r.color }]}>{r.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* 🔥 STREAK TAB */}
            {activeTab === 'streak' && (
              <View style={styles.streakSection}>
                <View style={styles.streakHeroCard}>
                  <View style={styles.streakFlameCircle}>
                    <Flame size={36} color="#FF5722" />
                  </View>
                  <Text style={styles.streakTitle}>{streakDays} {t('dayStreakTitle', 'DAY STREAK!')}</Text>
                  <Text style={styles.streakDesc}>
                    {t('streakDesc', 'Log in daily to keep your streak alive and claim the verified daily reward.')}
                  </Text>

                  <View style={styles.streakGrid}>
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                      const isReached = day <= streakDays;
                      const isCurrent = day === streakDays;
                      return (
                        <View key={day} style={styles.streakDayCell}>
                          <View
                            style={[
                              styles.streakBadgeCircle,
                              isReached && styles.streakBadgeReached,
                              isCurrent && styles.streakBadgeCurrent,
                            ]}
                          >
                            {isReached ? (
                              <Flame size={14} color="#FFF" />
                            ) : (
                              <Text style={styles.streakDayNum}>{language === 'ku' ? 'ڕ' : 'D'}{day}</Text>
                            )}
                          </View>
                          <Text style={styles.streakCoinReward}>+15 {t('coinsText', 'Coins')}</Text>
                        </View>
                      );
                    })}
                  </View>

                  <Pressable
                    style={[
                      styles.claimStreakBtn,
                      hasClaimedDailyStreak && styles.claimStreakBtnDisabled,
                    ]}
                    disabled={hasClaimedDailyStreak}
                    onPress={claimDailyStreak}
                    accessibilityRole="button"
                    accessibilityLabel={hasClaimedDailyStreak ? 'Daily reward already claimed' : 'Claim daily reward'}
                    accessibilityState={{ disabled: hasClaimedDailyStreak }}
                  >
                    <PrimaryGradient borderRadius={12} />
                    <Text style={styles.claimStreakBtnText}>
                      {hasClaimedDailyStreak
                        ? t('todayClaimed', '✓ Today Claimed - Come Back Tomorrow!')
                        : `${t('claimToday', 'Claim Today')} (+15 ${t('coinsText', 'Coins')} + XP)`}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {activeTab === 'missions' && (
              <View style={styles.missionsList}>
                <View style={styles.sectionHeaderLeft}>
                  <Text style={styles.sectionTitle}>{t('missions', 'Daily Tasks')}</Text>
                  <Text style={styles.sectionSub}>
                    Complete verified activity to earn spendable coins.
                  </Text>
                </View>

                {missions
                  .filter((mission) => mission.id === 'm-daily-3')
                  .map((mission) => {
                    const progress = Math.min(100, Math.max(0, (mission.current / Math.max(1, mission.target)) * 100));
                    const canClaim = mission.completed && !mission.claimed;
                    return (
                      <View
                        key={mission.id}
                        style={[
                          styles.missionCard,
                          { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border },
                        ]}
                      >
                        <View style={styles.missionHeaderRow}>
                          <View style={styles.missionTitleGroup}>
                            <Target size={15} color={themeColors.primary} />
                            <Text style={[styles.missionTitle, { color: themeColors.text }]}>{mission.title}</Text>
                          </View>
                          <View style={styles.missionRewardPills}>
                            <View style={styles.missionCoinPill}>
                              <Text style={styles.missionCoinText}>+{mission.rewardCoins} Coins</Text>
                            </View>
                            <View style={styles.missionXpPill}>
                              <Text style={styles.missionXpText}>+{mission.rewardXP} XP</Text>
                            </View>
                          </View>
                        </View>

                        <Text style={[styles.missionDesc, { color: themeColors.textMuted }]}>{mission.description}</Text>

                        <View style={styles.missionActionRow}>
                          <View style={styles.missionTrackSection}>
                            <View style={[styles.missionTrack, { backgroundColor: themeColors.border }]}>
                              <View style={[styles.missionFill, { width: `${progress}%`, backgroundColor: themeColors.primary }]} />
                            </View>
                            <Text style={[styles.missionProgressText, { color: themeColors.textMuted }]}>
                              {mission.current}/{mission.target}
                            </Text>
                          </View>
                          <Pressable
                            style={[
                              styles.claimMissionBtn,
                              { backgroundColor: themeColors.primary },
                              !canClaim && styles.claimMissionBtnDisabled,
                            ]}
                            disabled={!canClaim}
                            onPress={() => void claimMission(mission.id)}
                            accessibilityRole="button"
                            accessibilityLabel={`Claim ${mission.rewardCoins} coins for ${mission.title}`}
                          >
                            <Text style={styles.claimMissionBtnText}>
                              {mission.claimed ? 'Claimed' : canClaim ? t('claimReward', 'Claim') : 'In progress'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}

            {/* 🎨 THEME SHOP TAB */}
            {activeTab === 'themes' && (
              <View style={styles.themesSection}>
                <View style={styles.sectionHeaderLeft}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('themesTitle', 'AniFlix Cinema Themes')}</Text>
                  <Text style={[styles.sectionSub, { color: themeColors.textSecondary }]}>{t('themesSub', 'Custom accent colors and styles for your app')}</Text>
                </View>

                <View style={styles.themesCardsList}>
                  {themes.map((th) => {
                    const isEquipped = activeTheme.id === th.id;
                    const canAfford = coins >= th.costCoins;
                    return (
                      <View
                        key={th.id}
                        style={[
                          styles.themeCardItem,
                          { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border },
                        ]}
                      >
                        <View style={[styles.themeAccentStripe, { backgroundColor: th.primary }]} />
                        <View style={styles.themeCardContent}>
                          <View style={styles.themeHeaderRow}>
                            <Text style={[styles.themeName, { color: themeColors.text }]}>{th.name}</Text>
                            {isEquipped && (
                              <View style={[styles.equippedPill, { backgroundColor: themeColors.successSoft }]}>
                                <CheckCircle size={11} color={themeColors.success} />
                                <Text style={[styles.equippedPillText, { color: themeColors.success }]}>{t('activeThemeLabel', 'Active')}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.themeDesc, { color: themeColors.textSecondary }]}>{th.description}</Text>

                          <View style={styles.themeActionRow}>
                            {th.isUnlocked ? (
                              <Pressable
                                style={[
                                  styles.themeBtn,
                                  {
                                    backgroundColor: themeColors.backgroundElevated,
                                    borderColor: isEquipped ? themeColors.success : themeColors.border,
                                  },
                                  isEquipped && { backgroundColor: themeColors.backgroundSelected },
                                ]}
                                disabled={isEquipped}
                                onPress={() => equipTheme(th.id)}
                                accessibilityRole="button"
                                accessibilityLabel={isEquipped ? `${th.name} theme is equipped` : `Equip ${th.name} theme`}
                                accessibilityState={{ disabled: isEquipped, selected: isEquipped }}
                              >
                                <Text style={[styles.themeBtnText, { color: themeColors.text }]}>
                                  {isEquipped ? t('equippedTheme', 'Equipped') : t('equipThemeBtn', 'Equip Theme')}
                                </Text>
                              </Pressable>
                            ) : (
                              <Pressable
                                style={[
                                  styles.themeBuyBtn,
                                  { backgroundColor: canAfford ? themeColors.primary : themeColors.backgroundSelected },
                                ]}
                                disabled={!canAfford}
                                onPress={() => unlockTheme(th.id)}
                                accessibilityRole="button"
                                accessibilityLabel={`Unlock ${th.name} theme for ${th.costCoins} coins`}
                                accessibilityState={{ disabled: !canAfford }}
                              >
                                <Text style={[styles.themeBuyBtnText, { color: canAfford ? themeColors.buttonText : themeColors.textMuted }]}>
                                  {t('unlockForCoins', `Unlock for ${th.costCoins} Coins`).replace('{coins}', String(th.costCoins))}
                                </Text>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 🏆 BADGES TAB */}
            {activeTab === 'badges' && (
              <View style={styles.badgesSection}>
                <View style={styles.sectionHeaderLeft}>
                  <Text style={styles.sectionTitle}>{t('prestigeBadges', 'Prestige Badges')}</Text>
                  <Text style={styles.sectionSub}>{t('badgesSub', 'Unlock badges as you watch, review & streak')}</Text>
                </View>

                <View style={styles.badgesGrid}>
                  {badges.map((b) => (
                    <View
                      key={b.id}
                      style={[styles.badgeCard, !b.isUnlocked && styles.badgeCardLocked]}
                    >
                      <View
                        style={[
                          styles.badgeIconBox,
                          { backgroundColor: b.isUnlocked ? '#1E1E2E' : '#14141F' },
                        ]}
                      >
                        <Award size={20} color={b.isUnlocked ? '#FFB800' : '#666'} />
                      </View>
                      <View style={styles.badgeTextDetails}>
                        <View style={styles.badgeTitleRow}>
                          <Text style={styles.badgeTitleText}>{t(b.title as any, b.title)}</Text>
                          {b.isUnlocked ? (
                            <Text style={styles.unlockedTag}>{t('badgeUnlockedTag', '✓ Unlocked')}</Text>
                          ) : (
                            <Text style={styles.lockedTag}>{t('badgeLockedTag', 'Locked')}</Text>
                          )}
                        </View>
                        <Text style={styles.badgeDescText}>{t(b.description as any, b.description)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      <VipSubscriptionModal visible={showVipModal} onClose={() => setShowVipModal(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  modalCard: {
    width: '100%',
    maxWidth: 580,
    height: '88%',
    maxHeight: 740,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0px 18px 50px rgba(0, 0, 0, 0.28)',
    elevation: 8,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconGlow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontWeight: '700',
    fontSize: 11,
  },
  levelTitleText: {
    fontWeight: '600',
    fontSize: 13,
    flex: 1,
  },
  statsRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  vipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  getVipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  getVipBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  coinPillText: {
    fontWeight: '700',
    fontSize: 12,
  },
  xpBarSection: {
    gap: 4,
  },
  xpTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpTextLeft: {
    fontSize: 10,
    fontWeight: '600',
  },
  xpTextRight: {
    fontSize: 10,
    fontWeight: '700',
  },
  dailySourcesBar: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sourcesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourcesToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourcesTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  watchAdCompactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  watchAdBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sourcesChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1A1E2F',
  },
  sourceChip: {
    backgroundColor: '#181C2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262A42',
    alignItems: 'center',
  },
  sourceChipValue: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '800',
  },
  sourceChipLabel: {
    color: '#8E8EA6',
    fontSize: 9,
  },
  navTabsWrapper: {
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1E2F',
  },
  navTabsRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  tabSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  tabSegmentActive: {
    backgroundColor: '#192235',
  },
  tabSegmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8EA6',
  },
  tabSegmentTextActive: {
    color: '#4D7CFE',
  },
  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  spinSection: {
    alignItems: 'center',
  },
  sectionHeaderCenter: {
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 11,
    color: '#8E8EA6',
    marginTop: 2,
    textAlign: 'center',
  },
  wheelOuterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    position: 'relative',
  },
  wheelLightBulb: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    boxShadow: '0px 0px 6px rgba(255, 184, 0, 0.9)',
    elevation: 6,
  },
  wheelPointerTriangle: {
    position: 'absolute',
    top: -10,
    zIndex: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFD700',
    boxShadow: '0px 2px 6px rgba(255, 215, 0, 0.8)',
    elevation: 8,
  },
  wheelCircle: {
    width: 216,
    height: 216,
    borderRadius: 108,
    backgroundColor: '#131626',
    borderWidth: 5,
    borderColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  wheelSlice: {
    position: 'absolute',
    width: 60,
    height: 85,
    top: 8,
    alignItems: 'center',
  },
  sliceContentBox: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(15, 18, 30, 0.75)',
  },
  sliceIcon: {
    fontSize: 18,
  },
  sliceLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1,
  },
  wheelHubCircle: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0A0C14',
    borderWidth: 3,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 0px 8px rgba(255, 215, 0, 0.8)',
    elevation: 8,
  },
  wonRewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  wonRewardText: {
    fontWeight: '800',
    fontSize: 13,
  },
  prizesLegendBox: {
    width: '100%',
    backgroundColor: '#121524',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#22263C',
    padding: 12,
    marginBottom: 14,
  },
  prizesLegendTitle: {
    color: '#8E8EA6',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  prizesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  prizeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#181C2E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  prizeChipIcon: {
    fontSize: 12,
  },
  prizeChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  spinPrimaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    overflow: 'hidden',
  },
  spinPrimaryBtnDisabled: {
    opacity: 0.6,
  },
  spinPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  streakSection: {},
  streakHeroCard: {
    backgroundColor: '#141829',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#24283C',
  },
  streakFlameCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 87, 34, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 34, 0.3)',
    marginBottom: 10,
  },
  streakTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  streakDesc: {
    fontSize: 12,
    color: '#8E8EA6',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  streakGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 18,
  },
  streakDayCell: {
    alignItems: 'center',
    gap: 4,
  },
  streakBadgeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C2032',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C3048',
  },
  streakBadgeReached: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
  },
  streakBadgeCurrent: {
    borderColor: '#FFB800',
    borderWidth: 2,
  },
  streakDayNum: {
    fontSize: 10,
    color: '#7B7B98',
    fontWeight: '700',
  },
  streakCoinReward: {
    fontSize: 10,
    color: '#FFB800',
    fontWeight: '700',
  },
  claimStreakBtn: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  claimStreakBtnDisabled: {
    opacity: 0.6,
  },
  claimStreakBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  themesSection: {
    gap: 12,
  },
  sectionHeaderLeft: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionSub: {
    fontSize: 11,
    color: '#8E8EA6',
    marginTop: 2,
  },
  walletSection: {
    gap: 10,
  },
  walletBalanceCard: {
    minHeight: 82,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  walletBalanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  walletBalanceValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  walletStatusPill: {
    minHeight: 32,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  walletStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  walletLedgerList: {
    gap: 8,
  },
  walletLedgerRow: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  walletLedgerCopy: {
    flex: 1,
  },
  walletLedgerReason: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  walletLedgerDate: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  walletLedgerAmountWrap: {
    alignItems: 'flex-end',
  },
  walletLedgerAmount: {
    fontSize: 14,
    fontWeight: '900',
  },
  walletLedgerBalance: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  walletEmptyText: {
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 12,
    fontWeight: '600',
  },
  walletErrorBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  walletRetryBtn: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletRetryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  themesCardsList: {
    gap: 10,
  },
  themeCardItem: {
    backgroundColor: '#141829',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#24283C',
    flexDirection: 'row',
  },
  themeAccentStripe: {
    width: 6,
  },
  themeCardContent: {
    flex: 1,
    padding: 14,
  },
  themeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  equippedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  equippedPillText: {
    fontSize: 10,
    color: '#00E676',
    fontWeight: '700',
  },
  themeDesc: {
    fontSize: 12,
    color: '#8E8EA6',
    marginBottom: 12,
  },
  themeActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  themeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  themeBtnActive: {
  },
  themeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  themeBuyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  themeBuyBtnDisabled: {
  },
  themeBuyBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  badgesSection: {
    gap: 12,
  },
  badgesGrid: {
    gap: 10,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141829',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#24283C',
    gap: 12,
  },
  badgeCardLocked: {
    opacity: 0.5,
  },
  badgeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2E44',
  },
  badgeEmoji: {
    fontSize: 20,
  },
  badgeTextDetails: {
    flex: 1,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  badgeTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  unlockedTag: {
    fontSize: 10,
    color: '#00E676',
    fontWeight: '700',
  },
  lockedTag: {
    fontSize: 10,
    color: '#717188',
    fontWeight: '700',
  },
  badgeDescText: {
    fontSize: 11,
    color: '#8E8EA6',
  },
  eventsSection: {
    gap: 14,
  },
  eventBannerCard: {
    backgroundColor: '#141829',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventBadgeBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventBadgeEmoji: {
    fontSize: 20,
  },
  eventTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  eventSubText: {
    fontSize: 11,
    color: '#8E8EA6',
    marginTop: 2,
  },
  eventFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2438',
  },
  eventEndDateText: {
    fontSize: 10,
    color: '#FFB800',
    fontWeight: '700',
  },
  eventActivePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  eventActivePillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  missionsList: {
    gap: 10,
  },
  missionCard: {
    backgroundColor: '#141829',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#24283C',
    gap: 8,
  },
  missionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  missionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  missionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  missionRewardPills: {
    flexDirection: 'row',
    gap: 4,
  },
  missionCoinPill: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  missionCoinText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800',
  },
  missionXpPill: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  missionXpText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '800',
  },
  missionDesc: {
    fontSize: 11,
    color: '#8E8EA6',
  },
  missionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  missionTrackSection: {
    flex: 1,
    gap: 4,
  },
  missionTrack: {
    height: 6,
    backgroundColor: '#1F243A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  missionFill: {
    height: '100%',
    backgroundColor: '#FFB800',
    borderRadius: 3,
  },
  missionProgressText: {
    fontSize: 10,
    color: '#8E8EA6',
    fontWeight: '600',
  },
  claimMissionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  claimMissionBtnDisabled: {
    backgroundColor: '#1F2338',
    opacity: 0.6,
  },
  claimMissionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
