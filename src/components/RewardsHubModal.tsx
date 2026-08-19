import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import { Colors } from '@/constants/theme';
import {
  X,
  Flame,
  Zap,
  Gift,
  Sparkles,
  Trophy,
  Check,
  Calendar,
  Award,
  Crown,
  ChevronRight,
} from 'lucide-react-native';
import { useGamification, SPIN_REWARDS, SpinReward } from '@/hooks/useGamification';

interface RewardsHubModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RewardsHubModal({ visible, onClose }: RewardsHubModalProps) {
  const themeColors = Colors.dark;
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
    activeEvent,
    missions,
    claimDailyStreak,
    spinWheel,
    claimMission,
  } = useGamification();

  const [activeTab, setActiveTab] = useState<'missions' | 'spin' | 'streak' | 'event'>('missions');
  const [missionFilter, setMissionFilter] = useState<'all' | 'daily' | 'weekly' | 'event'>('all');

  // Spin Wheel Animation
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonReward, setWonReward] = useState<SpinReward | null>(null);

  // Level XP Progress
  const levelXPProgress = xp - currentLevelBaseXP;
  const levelXPTarget = nextLevelXP - currentLevelBaseXP;
  const xpPercent = Math.min(100, Math.max(0, (levelXPProgress / levelXPTarget) * 100));

  const handleSpinPress = () => {
    if (isSpinning || !canSpinWheel) return;
    setIsSpinning(true);
    setWonReward(null);

    // Spin 5 to 8 full rotations + target angle
    const targetReward = spinWheel();
    const targetIdx = SPIN_REWARDS.findIndex((r) => r.id === targetReward.id);
    const sliceAngle = 360 / SPIN_REWARDS.length;
    const finalDegree = 360 * 5 + (360 - targetIdx * sliceAngle);

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: finalDegree,
      duration: 3500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsSpinning(false);
      setWonReward(targetReward);
    });
  };

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const filteredMissions = missions.filter((m) => {
    if (missionFilter === 'all') return true;
    return m.category === missionFilter;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: '#0C0C12' }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Trophy size={22} color="#FFB800" />
              <Text style={styles.modalTitle}>AniFlix Rewards & Quests</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#FFF" />
            </Pressable>
          </View>

          {/* User Level & Coins Status Bar */}
          <View style={styles.userStatusBanner}>
            <View style={styles.statusRow}>
              <View style={styles.levelBadge}>
                <Crown size={14} color="#FFB800" />
                <Text style={styles.levelText}>LVL {level}</Text>
              </View>
              <Text style={styles.levelTitleText}>{levelTitle}</Text>
              <View style={styles.coinBadge}>
                <Text style={styles.coinText}>💰 {coins}</Text>
              </View>
            </View>

            {/* Level XP Progress Bar */}
            <View style={styles.xpProgressContainer}>
              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${xpPercent}%` }]} />
              </View>
              <Text style={styles.xpSubtext}>
                {levelXPProgress} / {levelXPTarget} XP to Level {level + 1}
              </Text>
            </View>
          </View>

          {/* Navigation Pills */}
          <View style={styles.tabsRow}>
            <Pressable
              style={[styles.tabBtn, activeTab === 'missions' && styles.tabBtnActive]}
              onPress={() => setActiveTab('missions')}
            >
              <Zap size={14} color={activeTab === 'missions' ? '#FFF' : '#8C8CA2'} />
              <Text
                style={[styles.tabBtnText, activeTab === 'missions' && styles.tabBtnTextActive]}
              >
                Missions
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, activeTab === 'streak' && styles.tabBtnActive]}
              onPress={() => setActiveTab('streak')}
            >
              <Flame size={14} color={activeTab === 'streak' ? '#FFF' : '#8C8CA2'} />
              <Text
                style={[styles.tabBtnText, activeTab === 'streak' && styles.tabBtnTextActive]}
              >
                Streak ({streakDays}d)
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, activeTab === 'spin' && styles.tabBtnActive]}
              onPress={() => setActiveTab('spin')}
            >
              <Gift size={14} color={activeTab === 'spin' ? '#FFF' : '#8C8CA2'} />
              <Text
                style={[styles.tabBtnText, activeTab === 'spin' && styles.tabBtnTextActive]}
              >
                Lucky Spin
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, activeTab === 'event' && styles.tabBtnActive]}
              onPress={() => setActiveTab('event')}
            >
              <Sparkles size={14} color={activeTab === 'event' ? '#FFF' : '#8C8CA2'} />
              <Text
                style={[styles.tabBtnText, activeTab === 'event' && styles.tabBtnTextActive]}
              >
                Event
              </Text>
            </Pressable>
          </View>

          {/* Tab Content */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 🎯 MISSIONS TAB */}
            {activeTab === 'missions' && (
              <View>
                {/* Subfilter */}
                <View style={styles.subfilterRow}>
                  {(['all', 'daily', 'weekly', 'event'] as const).map((cat) => (
                    <Pressable
                      key={cat}
                      style={[
                        styles.subfilterChip,
                        missionFilter === cat && styles.subfilterChipActive,
                      ]}
                      onPress={() => setMissionFilter(cat)}
                    >
                      <Text
                        style={[
                          styles.subfilterText,
                          missionFilter === cat && styles.subfilterTextActive,
                        ]}
                      >
                        {cat.toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Missions List */}
                <View style={styles.missionsList}>
                  {filteredMissions.map((m) => (
                    <View key={m.id} style={styles.missionCard}>
                      <View style={styles.missionHeader}>
                        <View style={styles.missionTitleBox}>
                          <Text style={styles.missionTitle}>{m.title}</Text>
                          <Text style={styles.missionDesc}>{m.description}</Text>
                        </View>
                        <View style={styles.rewardTag}>
                          <Text style={styles.rewardTagText}>
                            +{m.rewardCoins} 💰 · +{m.rewardXP} ⚡
                          </Text>
                        </View>
                      </View>

                      {/* Progress Bar & Claim Button */}
                      <View style={styles.missionFooter}>
                        <View style={styles.missionProgressBox}>
                          <View style={styles.missionTrack}>
                            <View
                              style={[
                                styles.missionFill,
                                {
                                  width: `${Math.min(100, (m.current / m.target) * 100)}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.progressCounter}>
                            {m.current} / {m.target}
                          </Text>
                        </View>

                        {m.claimed ? (
                          <View style={styles.claimedBadge}>
                            <Check size={12} color="#00E676" />
                            <Text style={styles.claimedText}>Claimed</Text>
                          </View>
                        ) : (
                          <Pressable
                            style={[
                              styles.claimBtn,
                              !m.completed && styles.claimBtnDisabled,
                              m.completed && { backgroundColor: themeColors.primary },
                            ]}
                            disabled={!m.completed}
                            onPress={() => claimMission(m.id)}
                          >
                            <Text style={styles.claimBtnText}>
                              {m.completed ? 'Claim' : 'In Progress'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 🔥 DAILY STREAK TAB */}
            {activeTab === 'streak' && (
              <View style={styles.streakContainer}>
                <View style={styles.streakHeroCard}>
                  <Flame size={44} color="#FF5722" />
                  <Text style={styles.streakDaysCount}>{streakDays} DAY STREAK</Text>
                  <Text style={styles.streakSubtitle}>
                    Watch movies & log in daily to build your streak multiplier!
                  </Text>

                  {/* 7-Day Roadmap */}
                  <View style={styles.streakRoadmap}>
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                      const isReached = day <= streakDays;
                      const isCurrent = day === streakDays;
                      return (
                        <View key={day} style={styles.streakDayCol}>
                          <View
                            style={[
                              styles.streakDayCircle,
                              isReached && styles.streakDayReached,
                              isCurrent && styles.streakDayCurrent,
                            ]}
                          >
                            {isReached ? (
                              <Flame size={14} color="#FFF" />
                            ) : (
                              <Text style={styles.streakDayNum}>D{day}</Text>
                            )}
                          </View>
                          <Text style={styles.streakDayReward}>+{50 + day * 10}💰</Text>
                        </View>
                      );
                    })}
                  </View>

                  <Pressable
                    style={[
                      styles.claimStreakBtn,
                      hasClaimedDailyStreak && styles.claimStreakBtnClaimed,
                    ]}
                    disabled={hasClaimedDailyStreak}
                    onPress={claimDailyStreak}
                  >
                    <Text style={styles.claimStreakBtnText}>
                      {hasClaimedDailyStreak
                        ? '✓ Today Claimed - Return Tomorrow!'
                        : `Claim Today (+${50 + streakDays * 10} Coins, +${80 + streakDays * 15} XP)`}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* 🎡 LUCKY SPIN TAB */}
            {activeTab === 'spin' && (
              <View style={styles.spinContainer}>
                <Text style={styles.spinHeaderTitle}>Daily Lucky Cinema Wheel</Text>
                <Text style={styles.spinHeaderSubtitle}>
                  Spin once every day for free Coins, XP, and VIP Passes!
                </Text>

                {/* Animated Wheel Visual */}
                <View style={styles.wheelWrapper}>
                  <View style={styles.pointerTriangle} />
                  <Animated.View
                    style={[
                      styles.wheelCircle,
                      {
                        transform: [{ rotate: spinRotation }],
                      },
                    ]}
                  >
                    {SPIN_REWARDS.map((r, i) => (
                      <View
                        key={r.id}
                        style={[
                          styles.wheelSlice,
                          {
                            transform: [{ rotate: `${i * 60}deg` }],
                          },
                        ]}
                      >
                        <Text style={styles.sliceIcon}>{r.icon}</Text>
                        <Text style={styles.sliceLabel}>{r.label.split(' ')[0]}</Text>
                      </View>
                    ))}
                  </Animated.View>
                  <View style={styles.wheelCenterHub}>
                    <Sparkles size={18} color="#FFB800" />
                  </View>
                </View>

                {/* Won Reward Banner */}
                {wonReward && (
                  <View style={styles.wonBanner}>
                    <Text style={styles.wonTitle}>🎉 You Won {wonReward.label}!</Text>
                  </View>
                )}

                {/* Spin Button */}
                <Pressable
                  style={[
                    styles.spinActionBtn,
                    (!canSpinWheel || isSpinning) && styles.spinActionBtnDisabled,
                  ]}
                  disabled={!canSpinWheel || isSpinning}
                  onPress={handleSpinPress}
                >
                  <Text style={styles.spinActionBtnText}>
                    {isSpinning
                      ? 'Spinning...'
                      : canSpinWheel
                      ? '🎰 SPIN WHEEL (FREE)'
                      : '✓ Spun Today - Come Back Tomorrow!'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* 🎉 SEASONAL EVENT TAB */}
            {activeTab === 'event' && (
              <View style={styles.eventContainer}>
                <View style={styles.eventCard}>
                  <Image source={{ uri: activeEvent.bannerImage }} style={styles.eventBannerImg} />
                  <View style={styles.eventContent}>
                    <View style={styles.eventBadgeRow}>
                      <View style={styles.liveEventTag}>
                        <Text style={styles.liveEventTagText}>🔥 LIVE EVENT</Text>
                      </View>
                      <Text style={styles.eventEndsText}>Ends {activeEvent.endDate}</Text>
                    </View>
                    <Text style={styles.eventMainTitle}>{activeEvent.title}</Text>
                    <Text style={styles.eventSubTitle}>{activeEvent.subtitle}</Text>

                    <View style={styles.perksBox}>
                      <Text style={styles.perksHeader}>EVENT PERKS & BONUSES:</Text>
                      <Text style={styles.perkItem}>• 2x AniFlix Coins on all movie streams</Text>
                      <Text style={styles.perkItem}>• Exclusive Kurdish Festival Gold Badge</Text>
                      <Text style={styles.perkItem}>• Special Event Quests with 500+ XP</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '90%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#262638',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E2C',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1E2C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userStatusBanner: {
    backgroundColor: '#12121D',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222234',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#282414',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  levelText: {
    color: '#FFB800',
    fontWeight: '800',
    fontSize: 12,
  },
  levelTitleText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
    marginLeft: 10,
  },
  coinBadge: {
    backgroundColor: '#1C1C28',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D42',
  },
  coinText: {
    color: '#FFD700',
    fontWeight: '800',
    fontSize: 13,
  },
  xpProgressContainer: {
    gap: 4,
  },
  xpTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#202030',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#00D2FF',
    borderRadius: 3,
  },
  xpSubtext: {
    fontSize: 11,
    color: '#76768E',
    textAlign: 'right',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#13131C',
    borderWidth: 1,
    borderColor: '#1D1D2C',
  },
  tabBtnActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C8CA2',
  },
  tabBtnTextActive: {
    color: '#FFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  subfilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  subfilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#151520',
  },
  subfilterChipActive: {
    backgroundColor: '#262638',
  },
  subfilterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6F6F85',
  },
  subfilterTextActive: {
    color: '#FFF',
  },
  missionsList: {
    gap: 10,
  },
  missionCard: {
    backgroundColor: '#13131D',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#202030',
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  missionTitleBox: {
    flex: 1,
    paddingRight: 10,
  },
  missionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 3,
  },
  missionDesc: {
    fontSize: 12,
    color: '#8E8EA4',
  },
  rewardTag: {
    backgroundColor: '#1E1E2C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2D2D42',
  },
  rewardTagText: {
    fontSize: 11,
    color: '#FFB800',
    fontWeight: '700',
  },
  missionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  missionProgressBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  missionTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#202030',
    borderRadius: 3,
    overflow: 'hidden',
  },
  missionFill: {
    height: '100%',
    backgroundColor: '#E50914',
    borderRadius: 3,
  },
  progressCounter: {
    fontSize: 11,
    color: '#707086',
    fontWeight: '600',
  },
  claimBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  claimBtnDisabled: {
    backgroundColor: '#202030',
  },
  claimBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  claimedText: {
    fontSize: 12,
    color: '#00E676',
    fontWeight: '700',
  },
  streakContainer: {
    alignItems: 'center',
  },
  streakHeroCard: {
    width: '100%',
    backgroundColor: '#13131D',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242436',
  },
  streakDaysCount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 8,
  },
  streakSubtitle: {
    fontSize: 12,
    color: '#8E8EA4',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  streakRoadmap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  streakDayCol: {
    alignItems: 'center',
    gap: 4,
  },
  streakDayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E1E2C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E2E42',
  },
  streakDayReached: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
  },
  streakDayCurrent: {
    borderColor: '#FFB800',
    borderWidth: 2,
  },
  streakDayNum: {
    fontSize: 11,
    color: '#717188',
    fontWeight: '700',
  },
  streakDayReward: {
    fontSize: 10,
    color: '#FFB800',
    fontWeight: '600',
  },
  claimStreakBtn: {
    width: '100%',
    backgroundColor: '#E50914',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  claimStreakBtnClaimed: {
    backgroundColor: '#202030',
  },
  claimStreakBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  spinContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  spinHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  spinHeaderSubtitle: {
    fontSize: 12,
    color: '#8E8EA4',
    textAlign: 'center',
    marginBottom: 20,
  },
  wheelWrapper: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  pointerTriangle: {
    position: 'absolute',
    top: -12,
    zIndex: 10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFB800',
  },
  wheelCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1E1E2C',
    borderWidth: 4,
    borderColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  wheelSlice: {
    position: 'absolute',
    width: 60,
    height: 80,
    top: 10,
    alignItems: 'center',
  },
  sliceIcon: {
    fontSize: 20,
  },
  sliceLabel: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: '700',
    marginTop: 2,
  },
  wheelCenterHub: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0C0C12',
    borderWidth: 3,
    borderColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wonBanner: {
    backgroundColor: '#1E1E2C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFB800',
    marginVertical: 12,
  },
  wonTitle: {
    color: '#FFD700',
    fontWeight: '800',
    fontSize: 14,
  },
  spinActionBtn: {
    width: '100%',
    backgroundColor: '#E50914',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  spinActionBtnDisabled: {
    backgroundColor: '#202030',
  },
  spinActionBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  eventContainer: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: '#13131D',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2E2818',
  },
  eventBannerImg: {
    width: '100%',
    height: 140,
  },
  eventContent: {
    padding: 16,
  },
  eventBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveEventTag: {
    backgroundColor: '#E50914',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveEventTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  eventEndsText: {
    color: '#FFB800',
    fontSize: 12,
    fontWeight: '600',
  },
  eventMainTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },
  eventSubTitle: {
    fontSize: 13,
    color: '#B0B0C4',
    marginBottom: 14,
  },
  perksBox: {
    backgroundColor: '#1A1812',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3D3418',
  },
  perksHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFB800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  perkItem: {
    fontSize: 12,
    color: '#D8D8E6',
    lineHeight: 18,
  },
});
