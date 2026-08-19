import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import {
  LogOut,
  User as UserIcon,
  Shield,
  Heart,
  Sparkles,
  Tv,
  ChevronRight,
  Flame,
  Crown,
  Trophy,
  Palette,
  Award,
  Users,
  PlayCircle,
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { useResponsive } from '@/hooks/useResponsive';
import { useGamification } from '@/hooks/useGamification';
import { useSocial } from '@/hooks/useSocial';
import { useAdMob } from '@/hooks/useAdMob';
import { RewardsHubModal } from '@/components/RewardsHubModal';

export default function ProfileScreen() {
  const router = useRouter();
  const themeColors = Colors.dark;
  const { user, profile, signOut, isLoading } = useAuth();
  const { favorites } = useFavorites();
  const { isDesktop, isTablet } = useResponsive();
  const {
    coins,
    xp,
    level,
    levelTitle,
    nextLevelXP,
    currentLevelBaseXP,
    streakDays,
    isVIP,
    vipDaysRemaining,
    badges,
    activeTheme,
  } = useGamification();
  const { followingCount, followersCount } = useSocial();
  const { showRewardedAd } = useAdMob();

  const [showRewardsModal, setShowRewardsModal] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  const handleAdminPanel = () => {
    router.push('/admin' as any);
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: themeColors.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  const isAdmin = profile?.role === 'admin';
  const levelXPProgress = xp - currentLevelBaseXP;
  const levelXPTarget = nextLevelXP - currentLevelBaseXP;
  const xpPercent = Math.min(100, Math.max(0, (levelXPProgress / levelXPTarget) * 100));

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.profileCard, (isDesktop || isTablet) && styles.profileCardWide]}>
        {/* 👤 Profile Hero Card */}
        <View style={styles.header}>
          <View
            style={[
              styles.avatarGlow,
              { borderColor: isAdmin ? themeColors.primary : '#242436' },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: themeColors.backgroundCard }]}>
              <UserIcon color={isAdmin ? themeColors.primary : '#fff'} size={44} />
            </View>
          </View>

          <Text style={[styles.name, { color: themeColors.text }]}>
            {profile?.full_name ?? user?.email?.split('@')[0] ?? 'AniFlix Member'}
          </Text>
          <Text style={[styles.email, { color: themeColors.textSecondary }]}>
            {user?.email}
          </Text>

          <View
            style={[
              styles.roleBadge,
              { backgroundColor: isAdmin ? themeColors.primary : themeColors.backgroundCard },
            ]}
          >
            {isAdmin ? (
              <Sparkles color="#fff" size={14} />
            ) : (
              <Tv color={themeColors.accentCyan} size={14} />
            )}
            <Text style={styles.roleText}>
              {isAdmin ? 'PLATFORM ADMIN' : isVIP ? `VIP MEMBER (${vipDaysRemaining}d)` : 'STANDARD STREAMER'}
            </Text>
          </View>
        </View>

        {/* 🏆 User Level & XP Progress Card */}
        <View style={styles.levelCard}>
          <View style={styles.levelCardHeader}>
            <View style={styles.levelLeft}>
              <Crown size={16} color="#FFB800" />
              <Text style={styles.levelLabel}>LEVEL {level}</Text>
            </View>
            <Text style={styles.levelTitle}>{levelTitle}</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${xpPercent}%` }]} />
          </View>
          <Text style={styles.xpText}>
            {levelXPProgress} / {levelXPTarget} XP to Level {level + 1}
          </Text>
        </View>

        {/* 📊 Gamification & Social Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundCard }]}>
            <Text style={[styles.statNumber, { color: '#FFD700' }]}>💰 {coins}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Coins</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundCard }]}>
            <Text style={[styles.statNumber, { color: '#FF5722' }]}>🔥 {streakDays}d</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Streak</Text>
          </View>

          <Pressable
            style={[styles.statBox, { backgroundColor: themeColors.backgroundCard }]}
            onPress={() => router.push('/(tabs)/favorites' as any)}
          >
            <Text style={[styles.statNumber, { color: themeColors.primary }]}>
              {favorites.length}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Favorites</Text>
          </Pressable>

          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundCard }]}>
            <Text style={[styles.statNumber, { color: '#00D2FF' }]}>👥 {followingCount}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Following</Text>
          </View>
        </View>

        {/* 🎁 Rewards & Missions Banner */}
        <Pressable style={styles.rewardsBanner} onPress={() => setShowRewardsModal(true)}>
          <View style={styles.rewardsBannerLeft}>
            <View style={styles.rewardsIconBox}>
              <Trophy size={22} color="#FFB800" />
            </View>
            <View>
              <Text style={styles.rewardsBannerTitle}>Rewards & Seasonal Events</Text>
              <Text style={styles.rewardsBannerSub}>
                Spin wheel, claim daily streak, & complete festival missions
              </Text>
            </View>
          </View>
          <ChevronRight color="#FFB800" size={20} />
        </Pressable>

        {/* 🏅 Badges Showcase */}
        <View style={styles.badgesSection}>
          <View style={styles.badgesSectionHeader}>
            <Text style={styles.badgesSectionTitle}>MY ACHIEVEMENT BADGES</Text>
            <Pressable onPress={() => setShowRewardsModal(true)}>
              <Text style={styles.seeAllBadges}>View All →</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesScroll}
          >
            {badges.map((b) => (
              <View
                key={b.id}
                style={[
                  styles.badgePill,
                  !b.isUnlocked && styles.badgePillLocked,
                  { backgroundColor: themeColors.backgroundCard },
                ]}
              >
                <Text style={styles.badgePillEmoji}>{b.icon}</Text>
                <View>
                  <Text style={styles.badgePillTitle}>{b.title}</Text>
                  <Text style={styles.badgePillStatus}>
                    {b.isUnlocked ? 'Unlocked' : 'Locked'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ⚙️ Actions List */}
        <View style={styles.actionsSection}>
          {/* Admin Panel Button (Admin only) */}
          {isAdmin && (
            <Pressable
              style={[styles.adminBanner, { backgroundColor: themeColors.primary }]}
              onPress={handleAdminPanel}
            >
              <View style={styles.adminBannerLeft}>
                <Shield color="#fff" size={24} />
                <View>
                  <Text style={styles.adminBannerTitle}>Admin Control Center</Text>
                  <Text style={styles.adminBannerSub}>Publish, manage & feature anime</Text>
                </View>
              </View>
              <ChevronRight color="#fff" size={20} />
            </Pressable>
          )}

          {/* Watch Ad to Earn Coins Button */}
          <Pressable
            style={[styles.actionRow, { backgroundColor: themeColors.backgroundCard }]}
            onPress={() => showRewardedAd({ rewardCoins: 100, rewardType: 'coins' })}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
                <PlayCircle color="#FFB800" size={18} />
              </View>
              <View>
                <Text style={[styles.actionRowText, { color: '#FFD700' }]}>
                  Watch Ad & Earn 100 Coins
                </Text>
                <Text style={styles.actionSubtext}>Get +100 Coins & +150 XP instantly</Text>
              </View>
            </View>
            <ChevronRight color={themeColors.textSecondary} size={18} />
          </Pressable>

          {/* Theme Shop Button */}
          <Pressable
            style={[styles.actionRow, { backgroundColor: themeColors.backgroundCard }]}
            onPress={() => setShowRewardsModal(true)}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#1E1B2C' }]}>
                <Palette color="#00D2FF" size={18} />
              </View>
              <View>
                <Text style={[styles.actionRowText, { color: themeColors.text }]}>
                  App Theme: {activeTheme.name}
                </Text>
                <Text style={styles.actionSubtext}>Customize AniFlix colors with Coins</Text>
              </View>
            </View>
            <ChevronRight color={themeColors.textSecondary} size={18} />
          </Pressable>

          {/* My Favorites Link */}
          <Pressable
            style={[styles.actionRow, { backgroundColor: themeColors.backgroundCard }]}
            onPress={() => router.push('/(tabs)/favorites' as any)}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#33080A' }]}>
                <Heart color={themeColors.primary} size={18} fill={themeColors.primary} />
              </View>
              <Text style={[styles.actionRowText, { color: themeColors.text }]}>
                My Favorites List
              </Text>
            </View>
            <ChevronRight color={themeColors.textSecondary} size={18} />
          </Pressable>

          {/* Sign Out Button */}
          <Pressable
            style={[styles.actionRow, { backgroundColor: themeColors.backgroundCard }]}
            onPress={handleLogout}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#20202E' }]}>
                <LogOut color="#ff4444" size={18} />
              </View>
              <Text style={[styles.actionRowText, { color: '#ff6666' }]}>Sign Out</Text>
            </View>
            <ChevronRight color={themeColors.textSecondary} size={18} />
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </View>

      {/* Rewards & Quests Modal */}
      <RewardsHubModal visible={showRewardsModal} onClose={() => setShowRewardsModal(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileCard: {
    width: '100%',
    alignSelf: 'center',
  },
  profileCardWide: {
    maxWidth: 680,
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242436',
    backgroundColor: 'rgba(18, 18, 26, 0.5)',
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
  },
  avatarGlow: {
    padding: 4,
    borderRadius: 56,
    borderWidth: 2,
    marginBottom: 14,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
  },
  email: {
    fontSize: 13,
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  roleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  levelCard: {
    backgroundColor: '#12121E',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#242438',
    marginBottom: 14,
  },
  levelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#262010',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  levelLabel: {
    color: '#FFB800',
    fontWeight: '800',
    fontSize: 11,
  },
  levelTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  xpTrack: {
    height: 6,
    backgroundColor: '#202030',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#00D2FF',
    borderRadius: 3,
  },
  xpText: {
    fontSize: 10,
    color: '#7B7B92',
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242436',
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  rewardsBanner: {
    marginHorizontal: 16,
    backgroundColor: '#161410',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#3D3418',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  rewardsBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  rewardsIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#262010',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  rewardsBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 2,
  },
  rewardsBannerSub: {
    fontSize: 11,
    color: '#9E9EB4',
    lineHeight: 15,
  },
  badgesSection: {
    marginBottom: 18,
  },
  badgesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  badgesSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#707086',
    letterSpacing: 1.2,
  },
  seeAllBadges: {
    fontSize: 11,
    color: '#FFB800',
    fontWeight: '700',
  },
  badgesScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#242436',
  },
  badgePillLocked: {
    opacity: 0.45,
  },
  badgePillEmoji: {
    fontSize: 18,
  },
  badgePillTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  badgePillStatus: {
    fontSize: 10,
    color: '#00E676',
    fontWeight: '600',
  },
  actionsSection: {
    paddingHorizontal: 16,
    gap: 10,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  adminBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminBannerTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  adminBannerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242436',
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRowText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionSubtext: {
    fontSize: 11,
    color: '#8E8EA4',
    marginTop: 1,
  },
});
