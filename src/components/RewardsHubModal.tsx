import React, { useState } from 'react';
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
  const { t } = useLanguage();
  const { showRewardedAd } = useAdMob();
  const { width: windowWidth, isXS, isSmallDevice } = useResponsive();
  const [showVipModal, setShowVipModal] = useState(false);
  const [showSourcesInfo, setShowSourcesInfo] = useState(false);

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
    claimDailyStreak,
    spinWheel,
    claimMission,
    unlockTheme,
    equipTheme,
    addXPAndCoins,
  } = useGamification();

  const [activeTab, setActiveTab] = useState<'events' | 'spin' | 'streak' | 'themes' | 'badges'>('events');

  const [spinAnim] = useState(() => new Animated.Value(0));
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonReward, setWonReward] = useState<SpinReward | null>(null);

  const levelXPProgress = xp - currentLevelBaseXP;
  const levelXPTarget = Math.max(1, nextLevelXP - currentLevelBaseXP);
  const xpPercent = Math.min(100, Math.max(0, (levelXPProgress / levelXPTarget) * 100));

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
      duration: 3500,
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
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* 👑 Top Glass Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconGlow}>
                <Trophy size={20} color="#FFB800" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Rewards & Events Hub</Text>
                <Text style={styles.modalSubtitle}>Earn coins, level up & unlock exclusive themes</Text>
              </View>
            </View>

            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
              <X size={18} color="#A0A0B8" />
            </Pressable>
          </View>

          {/* 📊 User Status & XP Bar */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.userProfileInfo}>
                <View style={styles.levelBadge}>
                  <Crown size={13} color="#FFD700" />
                  <Text style={styles.levelBadgeText}>LVL {level}</Text>
                </View>
                <Text style={styles.levelTitleText} numberOfLines={1}>
                  {t(levelTitle as any, levelTitle)}
                </Text>
              </View>

              <View style={styles.statsRightGroup}>
                {isVIP ? (
                  <View style={styles.vipBadge}>
                    <Crown size={12} color="#E040FB" />
                    <Text style={styles.vipBadgeText}>VIP ({vipDaysRemaining}d)</Text>
                  </View>
                ) : (
                  <Pressable style={styles.getVipBtn} onPress={() => setShowVipModal(true)}>
                    <Crown size={12} color="#FFB800" />
                    <Text style={styles.getVipBtnText}>Get VIP</Text>
                  </Pressable>
                )}

                <View style={styles.coinPill}>
                  <Coins size={14} color="#FFB800" />
                  <Text style={styles.coinPillText}>{coins.toLocaleString()} Coins</Text>
                </View>
              </View>
            </View>

            {/* XP Progress Bar */}
            <View style={styles.xpBarSection}>
              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${xpPercent}%` }]} />
              </View>
              <View style={styles.xpInfoRow}>
                <Text style={styles.xpTextLeft}>{levelXPProgress} / {levelXPTarget} XP</Text>
                <Text style={styles.xpTextRight}>Level {level + 1} Unlocks</Text>
              </View>
            </View>
          </View>

          {/* 💰 Compact Daily Sources Banner & Ad Action */}
          <View style={styles.dailySourcesBar}>
            <View style={styles.sourcesHeaderRow}>
              <Pressable
                style={styles.sourcesToggleBtn}
                onPress={() => setShowSourcesInfo(!showSourcesInfo)}
              >
                <Zap size={14} color="#FFB800" />
                <Text style={styles.sourcesTitle}>Daily Coin Sources</Text>
                <Info size={12} color="#8E8EA4" />
              </Pressable>

              {!isVIP && (
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
                      onRewarded: () => addXPAndCoins(50, 12, true),
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Watch Rewarded Ad for 12 Coins"
                >
                  <Film size={13} color="#FFFFFF" />
                  <Text style={styles.watchAdBtnText}>Watch Ad (+12 💰)</Text>
                </Pressable>
              )}
            </View>

            {showSourcesInfo && (
              <View style={styles.sourcesChipsGrid}>
                <View style={styles.sourceChip}>
                  <Text style={styles.sourceChipValue}>+12 💰</Text>
                  <Text style={styles.sourceChipLabel}>Per Ad (Unlimited)</Text>
                </View>
                <View style={styles.sourceChip}>
                  <Text style={styles.sourceChipValue}>+15 💰</Text>
                  <Text style={styles.sourceChipLabel}>Daily Streak</Text>
                </View>
                <View style={styles.sourceChip}>
                  <Text style={styles.sourceChipValue}>+50 💰</Text>
                  <Text style={styles.sourceChipLabel}>Lucky Spin</Text>
                </View>
                <View style={styles.sourceChip}>
                  <Text style={styles.sourceChipValue}>+15 💰</Text>
                  <Text style={styles.sourceChipLabel}>Missions</Text>
                </View>
              </View>
            )}
          </View>

          {/* 🎯 Tab Selector Segment */}
          <View style={styles.navTabsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navTabsRow}>
              <Pressable
                style={[styles.tabSegment, activeTab === 'events' && styles.tabSegmentActive]}
                onPress={() => setActiveTab('events')}
              >
                <Zap size={15} color={activeTab === 'events' ? '#FFB800' : '#7D7D9A'} />
                <Text style={[styles.tabSegmentText, activeTab === 'events' && styles.tabSegmentTextActive]}>
                  Events & Missions
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabSegment, activeTab === 'spin' && styles.tabSegmentActive]}
                onPress={() => setActiveTab('spin')}
              >
                <Gift size={15} color={activeTab === 'spin' ? '#FFF' : '#7D7D9A'} />
                <Text style={[styles.tabSegmentText, activeTab === 'spin' && styles.tabSegmentTextActive]}>
                  Lucky Spin
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabSegment, activeTab === 'streak' && styles.tabSegmentActive]}
                onPress={() => setActiveTab('streak')}
              >
                <Flame size={15} color={activeTab === 'streak' ? '#FF5722' : '#7D7D9A'} />
                <Text style={[styles.tabSegmentText, activeTab === 'streak' && styles.tabSegmentTextActive]}>
                  Streak ({streakDays}d)
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabSegment, activeTab === 'themes' && styles.tabSegmentActive]}
                onPress={() => setActiveTab('themes')}
              >
                <Palette size={15} color={activeTab === 'themes' ? '#00D2FF' : '#7D7D9A'} />
                <Text style={[styles.tabSegmentText, activeTab === 'themes' && styles.tabSegmentTextActive]}>
                  Theme Shop
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabSegment, activeTab === 'badges' && styles.tabSegmentActive]}
                onPress={() => setActiveTab('badges')}
              >
                <Award size={15} color={activeTab === 'badges' ? '#FFB800' : '#7D7D9A'} />
                <Text style={[styles.tabSegmentText, activeTab === 'badges' && styles.tabSegmentTextActive]}>
                  Badges
                </Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* 📜 Main Content Area */}
          <ScrollView style={styles.mainScrollView} contentContainerStyle={styles.mainScrollContent}>
            {/* ⚡ EVENTS & MISSIONS TAB */}
            {activeTab === 'events' && (
              <View style={styles.eventsSection}>
                {/* Active Seasonal Event Banner */}
                {activeEvent && (
                  <View style={[styles.eventBannerCard, { borderColor: activeEvent.themeColor || '#FF3D00' }]}>
                    <View style={styles.eventHeaderRow}>
                      <View style={[styles.eventBadgeBox, { backgroundColor: `${activeEvent.themeColor || '#FF3D00'}22` }]}>
                        <Text style={styles.eventBadgeEmoji}>{activeEvent.badgeIcon || '🔥'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.eventTitleText}>{activeEvent.title}</Text>
                        <Text style={styles.eventSubText}>{activeEvent.subtitle}</Text>
                      </View>
                    </View>
                    <View style={styles.eventFooterRow}>
                      <Text style={styles.eventEndDateText}>Ends: {activeEvent.endDate}</Text>
                      <View style={[styles.eventActivePill, { backgroundColor: activeEvent.themeColor || '#FF3D00' }]}>
                        <Text style={styles.eventActivePillText}>ACTIVE EVENT</Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.sectionHeaderLeft}>
                  <Text style={styles.sectionTitle}>Daily & Event Missions</Text>
                  <Text style={styles.sectionSub}>Complete goals to earn Coins, XP & rank up fast</Text>
                </View>

                <View style={styles.missionsList}>
                  {missions.map((m) => {
                    const progress = Math.min(100, Math.max(0, (m.current / m.target) * 100));
                    return (
                      <View key={m.id} style={styles.missionCard}>
                        <View style={styles.missionHeaderRow}>
                          <View style={styles.missionTitleGroup}>
                            <Target size={16} color="#FFB800" />
                            <Text style={styles.missionTitle}>{m.title}</Text>
                          </View>
                          <View style={styles.missionRewardPills}>
                            {m.rewardCoins > 0 && (
                              <View style={styles.missionCoinPill}>
                                <Text style={styles.missionCoinText}>+{m.rewardCoins} 💰</Text>
                              </View>
                            )}
                            {m.rewardXP > 0 && (
                              <View style={styles.missionXpPill}>
                                <Text style={styles.missionXpText}>+{m.rewardXP} XP</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <Text style={styles.missionDesc}>{m.description}</Text>

                        <View style={styles.missionActionRow}>
                          <View style={styles.missionTrackSection}>
                            <View style={styles.missionTrack}>
                              <View style={[styles.missionFill, { width: `${progress}%` }]} />
                            </View>
                            <Text style={styles.missionProgressText}>
                              {m.current} / {m.target} ({Math.round(progress)}%)
                            </Text>
                          </View>

                          <Pressable
                            style={[
                              styles.claimMissionBtn,
                              (!m.completed || m.claimed) && styles.claimMissionBtnDisabled,
                            ]}
                            disabled={!m.completed || m.claimed}
                            onPress={() => claimMission(m.id)}
                          >
                            <Text style={styles.claimMissionBtnText}>
                              {m.claimed ? '✓ Claimed' : m.completed ? 'Claim' : 'In Progress'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 🎡 LUCKY SPIN TAB */}
            {activeTab === 'spin' && (
              <View style={styles.spinSection}>
                <View style={styles.sectionHeaderCenter}>
                  <Text style={styles.heroTitle}>Daily Lucky Cinema Wheel</Text>
                  <Text style={styles.heroSubtitle}>
                    Spin once every day for free Coins, XP, and VIP Passes!
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
                      ? '⚡ Spinning Wheel...'
                      : canSpinWheel
                      ? '🎡 SPIN WHEEL NOW (FREE)'
                      : '✓ Spun Today - Return Tomorrow!'}
                  </Text>
                </Pressable>

                {/* Winner Celebration Banner */}
                {wonReward && (
                  <View style={[styles.wonRewardBanner, { borderColor: wonReward.color || '#FFB800' }]}>
                    <Sparkles size={18} color={wonReward.color || '#FFD700'} />
                    <Text style={[styles.wonRewardText, { color: wonReward.color || '#FFD700' }]}>
                      🎉 Congratulations! You won {wonReward.label}!
                    </Text>
                  </View>
                )}

                {/* Wheel Rewards Pool Legend Grid */}
                <View style={styles.prizesLegendBox}>
                  <Text style={styles.prizesLegendTitle}>AVAILABLE PRIZES ON WHEEL</Text>
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
                  <Text style={styles.streakTitle}>{streakDays} DAY STREAK!</Text>
                  <Text style={styles.streakDesc}>
                    Log in daily to keep your streak alive and earn scaling coin rewards.
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
                              <Text style={styles.streakDayNum}>D{day}</Text>
                            )}
                          </View>
                          <Text style={styles.streakCoinReward}>+15 💰</Text>
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
                  >
                    <PrimaryGradient borderRadius={12} />
                    <Text style={styles.claimStreakBtnText}>
                      {hasClaimedDailyStreak
                        ? '✓ Today Claimed - Come Back Tomorrow!'
                        : `Claim Today (+15 Coins, +${150 + Math.min(streakDays, 7) * 50} XP)`}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* 🎨 THEME SHOP TAB */}
            {activeTab === 'themes' && (
              <View style={styles.themesSection}>
                <View style={styles.sectionHeaderLeft}>
                  <Text style={styles.sectionTitle}>AniFlix Cinema Themes</Text>
                  <Text style={styles.sectionSub}>Custom accent colors and styles for your app</Text>
                </View>

                <View style={styles.themesCardsList}>
                  {themes.map((th) => {
                    const isEquipped = activeTheme.id === th.id;
                    const canAfford = coins >= th.costCoins;
                    return (
                      <View key={th.id} style={styles.themeCardItem}>
                        <View style={[styles.themeAccentStripe, { backgroundColor: th.primary }]} />
                        <View style={styles.themeCardContent}>
                          <View style={styles.themeHeaderRow}>
                            <Text style={styles.themeName}>{th.name}</Text>
                            {isEquipped && (
                              <View style={styles.equippedPill}>
                                <CheckCircle size={11} color="#00E676" />
                                <Text style={styles.equippedPillText}>Active</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.themeDesc}>{th.description}</Text>

                          <View style={styles.themeActionRow}>
                            {th.isUnlocked ? (
                              <Pressable
                                style={[styles.themeBtn, isEquipped && styles.themeBtnActive]}
                                disabled={isEquipped}
                                onPress={() => equipTheme(th.id)}
                              >
                                <Text style={styles.themeBtnText}>
                                  {isEquipped ? 'Equipped' : 'Equip Theme'}
                                </Text>
                              </Pressable>
                            ) : (
                              <Pressable
                                style={[styles.themeBuyBtn, !canAfford && styles.themeBuyBtnDisabled]}
                                disabled={!canAfford}
                                onPress={() => unlockTheme(th.id)}
                              >
                                <Text style={styles.themeBuyBtnText}>
                                  Unlock for {th.costCoins} 💰
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
                  <Text style={styles.sectionTitle}>Prestige Badges</Text>
                  <Text style={styles.sectionSub}>Unlock badges as you watch, review & streak</Text>
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
                        <Text style={styles.badgeEmoji}>{b.icon}</Text>
                      </View>
                      <View style={styles.badgeTextDetails}>
                        <View style={styles.badgeTitleRow}>
                          <Text style={styles.badgeTitleText}>{t(b.title as any, b.title)}</Text>
                          {b.isUnlocked ? (
                            <Text style={styles.unlockedTag}>✓ Unlocked</Text>
                          ) : (
                            <Text style={styles.lockedTag}>🔒 Locked</Text>
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
    backgroundColor: 'rgba(5, 7, 14, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  modalCard: {
    width: '100%',
    maxWidth: 580,
    height: '88%',
    maxHeight: 740,
    backgroundColor: '#0F121E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#24283C',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 24px rgba(0, 0, 0, 0.4)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
    }),
    elevation: 12,
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
    borderBottomColor: '#1A1E2F',
    backgroundColor: '#121524',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconGlow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.25)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#8E8EA6',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C2032',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2E44',
  },
  statusCard: {
    backgroundColor: '#141829',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252940',
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
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  levelBadgeText: {
    color: '#FFD700',
    fontWeight: '900',
    fontSize: 11,
  },
  levelTitleText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    backgroundColor: 'rgba(224, 64, 251, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E040FB',
  },
  vipBadgeText: {
    color: '#E040FB',
    fontSize: 10,
    fontWeight: '800',
  },
  getVipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  getVipBtnText: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '800',
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1C2035',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D3250',
  },
  coinPillText: {
    color: '#FFD700',
    fontWeight: '800',
    fontSize: 12,
  },
  xpBarSection: {
    gap: 4,
  },
  xpTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#1F243A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#00D2FF',
    borderRadius: 3,
  },
  xpInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpTextLeft: {
    fontSize: 10,
    color: '#A0A0C0',
    fontWeight: '600',
  },
  xpTextRight: {
    fontSize: 10,
    color: '#00D2FF',
    fontWeight: '700',
  },
  dailySourcesBar: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#121524',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#202438',
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
    fontWeight: '700',
    color: '#FFB800',
  },
  watchAdCompactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0356C5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  watchAdBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
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
    backgroundColor: '#141728',
    borderWidth: 1,
    borderColor: '#22263C',
  },
  tabSegmentActive: {
    backgroundColor: '#0356C5',
    borderColor: '#0356C5',
  },
  tabSegmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8EA6',
  },
  tabSegmentTextActive: {
    color: '#FFFFFF',
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
    ...Platform.select({
      web: {
        boxShadow: '0px 0px 6px rgba(255, 184, 0, 0.9)',
      },
      default: {
        shadowColor: '#FFB800',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 6,
      },
    }),
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
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 6px rgba(255, 215, 0, 0.8)',
      },
      default: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
      },
    }),
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
    ...Platform.select({
      web: {
        boxShadow: '0px 0px 8px rgba(255, 215, 0, 0.8)',
      },
      default: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
    }),
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
    backgroundColor: '#22263C',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  themeBtnActive: {
    backgroundColor: '#181C2E',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  themeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  themeBuyBtn: {
    backgroundColor: '#0356C5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  themeBuyBtnDisabled: {
    backgroundColor: '#1F2338',
  },
  themeBuyBtnText: {
    color: '#FFFFFF',
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
    backgroundColor: '#0356C5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
