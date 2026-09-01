import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, useColorMode } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import {
  LogOut,
  User as UserIcon,
  Shield,
  Heart,
  Sparkles,
  Tv,
  ChevronRight,
  Flame,
  Coins,
  Crown,
  Trophy,
  Award,
  Users,
  Camera,
  Check,
  X,
  Sun,
  Moon,
  Globe,
  CreditCard,
  ShieldAlert,
  Disc3,
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { useResponsive } from '@/hooks/useResponsive';
import { useGamification } from '@/hooks/useGamification';
import { useSocial } from '@/hooks/useSocial';
import { useAdMob } from '@/hooks/useAdMob';
import { RewardsHubModal } from '@/components/RewardsHubModal';
import { VipSubscriptionModal } from '@/components/VipSubscriptionModal';
import { GlobalNavbar } from '@/components/GlobalNavbar';

const PRESET_AVATARS = [
  { id: '1', name: 'Original Hero', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80' },
  { id: '2', name: 'Shadow Shinobi', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80' },
  { id: '3', name: 'Cyber Samurai', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300&q=80' },
  { id: '4', name: 'Solar Legend', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80' },
  { id: '5', name: 'Neon Valkyrie', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&q=80' },
  { id: '6', name: 'Crimson Hunter', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&q=80' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };
  const themeColors = useTheme();
  const { isDark, toggleColorMode } = useColorMode();
  const { language, toggleLanguage, t } = useLanguage();
  const { user, profile, signOut, isLoading, updateProfile } = useAuth();
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
  const { followingCount } = useSocial();
  const { showRewardedAd } = useAdMob();

  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      t('signOut', 'Sign Out'),
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => await signOut() },
      ]
    );
  };

  const handleAdminPanel = () => {
    router.push('/admin' as any);
  };

  const handleSelectAvatar = async (url: string) => {
    if (!url.trim()) return;
    setIsUpdatingAvatar(true);
    const { error } = await updateProfile({ avatar_url: url.trim() });
    setIsUpdatingAvatar(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      setShowAvatarModal(false);
      setCustomAvatarUrl('');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centerLoading, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={activeTheme?.primary || themeColors.primary} />
      </View>
    );
  }

  const isAdmin = profile?.role === 'admin';
  const levelXPProgress = xp - currentLevelBaseXP;
  const levelXPTarget = nextLevelXP - currentLevelBaseXP;
  const xpPercent = Math.min(100, Math.max(0, (levelXPProgress / levelXPTarget) * 100));
  const primaryColor = activeTheme?.primary || themeColors.primary;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GlobalNavbar title="Profile & Settings" showBrandLogo={false} />

      <ScrollView 
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 100) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileWrapper, (isDesktop || isTablet) && styles.profileWrapperDesktop]}>
        
        {/* 👤 Hero Profile Card */}
        <View style={[styles.heroCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
          <Pressable
            onPress={() => setShowAvatarModal(true)}
            style={[styles.avatarGlow, { borderColor: isAdmin ? primaryColor : themeColors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Change avatar image"
          >
            <View style={[styles.avatar, { backgroundColor: themeColors.backgroundElement }]}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <UserIcon color={isAdmin ? primaryColor : themeColors.text} size={44} />
              )}
            </View>
            <View style={[styles.avatarEditBadge, { backgroundColor: primaryColor }]}>
              <Camera size={13} color="#FFFFFF" />
            </View>
          </Pressable>

          <Text style={[styles.userName, { color: themeColors.text }]}>
            {profile?.full_name ?? user?.email?.split('@')[0] ?? 'AniFlix Member'}
          </Text>
          <Text style={[styles.userEmail, { color: themeColors.textSecondary }]}>
            {user?.email}
          </Text>

          <Pressable
            style={[styles.roleBadge, { backgroundColor: isAdmin ? primaryColor : themeColors.backgroundElement, borderColor: themeColors.border }]}
            onPress={() => (isAdmin ? handleAdminPanel() : setShowVipModal(true))}
            accessibilityRole="button"
            accessibilityLabel="Membership status"
          >
            {isAdmin ? (
              <Sparkles color="#FFFFFF" size={14} />
            ) : (
              <Tv color={themeColors.accentCyan || primaryColor} size={14} />
            )}
            <Text style={[styles.roleText, { color: isAdmin ? '#FFFFFF' : themeColors.text }]}>
              {isAdmin ? t('platformAdmin', 'Platform Admin') : isVIP ? `VIP Member (${vipDaysRemaining}d)` : t('standardStreamerGetVip', 'Get VIP Access')}
            </Text>
          </Pressable>
        </View>

        {/* 🏆 User Level & XP Progress Bar Card */}
        <View style={[styles.levelCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
          <View style={styles.levelCardHeader}>
            <View style={[styles.levelBadge, { backgroundColor: themeColors.mode === 'light' ? 'rgba(217, 119, 6, 0.12)' : 'rgba(255, 184, 0, 0.12)', borderColor: themeColors.mode === 'light' ? '#D97706' : '#FFB800' }]}>
              <Crown size={14} color={themeColors.mode === 'light' ? '#D97706' : '#FFB800'} />
              <Text style={[styles.levelLabel, { color: themeColors.mode === 'light' ? '#D97706' : '#FFB800' }]}>Level {level}</Text>
            </View>
            <Text style={[styles.levelTitle, { color: themeColors.text }]}>{t(levelTitle as any, levelTitle)}</Text>
          </View>

          <View style={[styles.xpTrack, { backgroundColor: themeColors.backgroundElement }]}>
            <View style={[styles.xpFill, { width: `${xpPercent}%`, backgroundColor: primaryColor }]} />
          </View>

          <Text style={[styles.xpText, { color: themeColors.textSecondary }]}>
            {levelXPProgress} / {levelXPTarget} XP to Level {level + 1}
          </Text>
        </View>

        {/* 📊 Gamification Stats Row */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
            <Coins size={18} color={themeColors.mode === 'light' ? '#D97706' : '#FFB800'} style={{ marginBottom: 4 }} />
            <Text style={[styles.statNumber, { color: themeColors.text }]}>{coins}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Coins</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
            <Flame size={18} color={themeColors.mode === 'light' ? '#EA580C' : '#F97316'} style={{ marginBottom: 4 }} />
            <Text style={[styles.statNumber, { color: themeColors.text }]}>{streakDays}d</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Streak</Text>
          </View>

          <Pressable
            style={[styles.statBox, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}
            onPress={() => router.push('/(tabs)/favorites' as any)}
            accessibilityRole="button"
            accessibilityLabel="View favorite titles"
          >
            <Heart size={18} color={primaryColor} style={{ marginBottom: 4 }} />
            <Text style={[styles.statNumber, { color: themeColors.text }]}>{favorites.length}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Favorites</Text>
          </Pressable>

          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
            <Users size={18} color={themeColors.mode === 'light' ? '#0891B2' : '#06B6D4'} style={{ marginBottom: 4 }} />
            <Text style={[styles.statNumber, { color: themeColors.text }]}>{followingCount}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Following</Text>
          </View>
        </View>

        {/* 🏆 Achievements & Badges Strip */}
        <View style={styles.badgesBlock}>
          <View style={styles.badgesHeader}>
            <Text style={[styles.badgesTitle, { color: themeColors.textSecondary }]}>MY BADGES</Text>
            <Pressable onPress={() => setShowRewardsModal(true)}>
              <Text style={[styles.viewAllText, { color: primaryColor }]}>View All</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScroll}>
            {badges.map((b) => (
              <View
                key={b.id}
                style={[
                  styles.badgeChip,
                  !b.isUnlocked && styles.badgeChipLocked,
                  { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }
                ]}
              >
                <Text style={styles.badgeEmoji}>{b.icon}</Text>
                <View>
                  <Text style={[styles.badgeName, { color: themeColors.text }]}>{t(b.title as any, b.title)}</Text>
                  <Text style={[styles.badgeStatus, { color: b.isUnlocked ? '#00E676' : themeColors.textMuted }]}>
                    {b.isUnlocked ? 'Unlocked' : 'Locked'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ⚙️ Action Menu Options */}
        <View style={styles.menuSection}>
          
          {/* Admin Panel Button */}
          {isAdmin && (
            <Pressable 
              style={[styles.menuCard, { backgroundColor: primaryColor, borderColor: primaryColor }]}
              onPress={handleAdminPanel}
              accessibilityRole="button"
              accessibilityLabel="Admin Management Center"
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                <ShieldAlert color="#FFFFFF" size={20} />
              </View>
              <View style={styles.menuTextContent}>
                <Text style={[styles.menuTitle, { color: '#FFFFFF' }]}>Admin Management Center</Text>
                <Text style={[styles.menuSub, { color: 'rgba(255, 255, 255, 0.85)' }]}>Manage Catalog, Users & Edge Settings</Text>
              </View>
              <ChevronRight color="rgba(255,255,255,0.7)" size={20} />
            </Pressable>
          )}

          {/* FIB Payment Link */}
          {!isVIP && (
            <Pressable 
              style={[styles.menuCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}
              onPress={() => router.push('/fib-payment' as any)}
              accessibilityRole="button"
              accessibilityLabel="FIB VIP Payment"
            >
              <View style={[styles.menuIconCircle, { backgroundColor: themeColors.mode === 'light' ? 'rgba(2, 132, 199, 0.12)' : 'rgba(56, 189, 248, 0.15)' }]}>
                <CreditCard color={themeColors.mode === 'light' ? '#0284C7' : '#38BDF8'} size={20} />
              </View>
              <View style={styles.menuTextContent}>
                <Text style={[styles.menuTitle, { color: themeColors.text }]}>
                  {language === 'ku' ? 'پارەدان لە ڕێگەی FIB' : 'VIP Subscription (FIB)'}
                </Text>
                <Text style={[styles.menuSub, { color: themeColors.textSecondary }]}>
                  {language === 'ku' ? 'پارەدان بۆ VIP لە ڕێگەی بانکی یەکەمی عێراقی' : 'Upgrade to VIP using First Iraqi Bank'}
                </Text>
              </View>
              <ChevronRight color={themeColors.textSecondary} size={20} />
            </Pressable>
          )}

          {/* Rewards Hub Modal Trigger */}
          <Pressable 
            style={[styles.menuCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}
            onPress={() => setShowRewardsModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Quests & Rewards Hub"
          >
            <View style={[styles.menuIconCircle, { backgroundColor: themeColors.mode === 'light' ? 'rgba(217, 119, 6, 0.12)' : 'rgba(255, 184, 0, 0.15)' }]}>
              <Trophy color={themeColors.mode === 'light' ? '#D97706' : '#FFB800'} size={20} />
            </View>
            <View style={styles.menuTextContent}>
              <Text style={[styles.menuTitle, { color: themeColors.text }]}>{t('rewardsHub', 'Quests & Rewards Hub')}</Text>
              <Text style={[styles.menuSub, { color: themeColors.textSecondary }]}>{t('rewardsSub', 'Complete daily quests and claim coins')}</Text>
            </View>
            <ChevronRight color={themeColors.textSecondary} size={20} />
          </Pressable>

          {/* Watch Ad for Free Coins */}
          {!isVIP && (
            <Pressable 
              style={[styles.menuCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}
              onPress={() => showRewardedAd({ rewardCoins: 100, rewardType: 'coins' })}
              accessibilityRole="button"
              accessibilityLabel="Watch Ad for Coins"
            >
              <View style={[styles.menuIconCircle, { backgroundColor: themeColors.mode === 'light' ? 'rgba(5, 150, 105, 0.12)' : 'rgba(0, 230, 118, 0.15)' }]}>
                <Disc3 color={themeColors.mode === 'light' ? '#059669' : '#00E676'} size={20} />
              </View>
              <View style={styles.menuTextContent}>
                <Text style={[styles.menuTitle, { color: themeColors.text }]}>{t('watchAdEarn', 'Watch Ad & Earn Coins')}</Text>
                <Text style={[styles.menuSub, { color: themeColors.textSecondary }]}>{t('watchAdSub', 'Get +100 Coins instantly per view')}</Text>
              </View>
              <ChevronRight color={themeColors.textSecondary} size={20} />
            </Pressable>
          )}

          {/* Dark / Light Mode Toggle */}
          <Pressable 
            style={[styles.menuCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}
            onPress={toggleColorMode}
            accessibilityRole="button"
            accessibilityLabel="Toggle Dark / Light Theme Mode"
          >
            <View style={[styles.menuIconCircle, { backgroundColor: isDark ? 'rgba(255, 184, 0, 0.15)' : 'rgba(3, 86, 197, 0.15)' }]}>
              {isDark ? <Sun color="#FFB800" size={20} /> : <Moon color={primaryColor} size={20} />}
            </View>
            <View style={styles.menuTextContent}>
              <Text style={[styles.menuTitle, { color: themeColors.text }]}>
                {isDark ? 'Light Theme Mode' : 'Dark Theme Mode'}
              </Text>
              <Text style={[styles.menuSub, { color: themeColors.textSecondary }]}>
                {isDark ? 'Switch to bright clean mode' : 'Switch to sleek dark mode'}
              </Text>
            </View>
            <ChevronRight color={themeColors.textSecondary} size={20} />
          </Pressable>

          {/* Language Switcher */}
          <Pressable 
            style={[styles.menuCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}
            onPress={toggleLanguage}
            accessibilityRole="button"
            accessibilityLabel="Switch language"
          >
            <View style={[styles.menuIconCircle, { backgroundColor: themeColors.mode === 'light' ? 'rgba(8, 145, 178, 0.12)' : 'rgba(6, 182, 212, 0.15)' }]}>
              <Globe color={themeColors.mode === 'light' ? '#0891B2' : '#06B6D4'} size={20} />
            </View>
            <View style={styles.menuTextContent}>
              <Text style={[styles.menuTitle, { color: themeColors.text }]}>
                {t('languageSetting', 'App Language')} ({language === 'ku' ? 'کوردی سۆرانی' : 'English'})
              </Text>
              <Text style={[styles.menuSub, { color: themeColors.textSecondary }]}>
                {t('switchLanguageSub', 'Switch between English and Kurdish')}
              </Text>
            </View>
            <ChevronRight color={themeColors.textSecondary} size={20} />
          </Pressable>

          {/* Sign Out Button */}
          <Pressable 
            style={[styles.signOutBtn, { backgroundColor: themeColors.mode === 'light' ? 'rgba(220, 38, 38, 0.08)' : 'rgba(239, 68, 68, 0.1)', borderColor: themeColors.mode === 'light' ? 'rgba(220, 38, 38, 0.3)' : 'rgba(239, 68, 68, 0.3)' }]}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Sign out of account"
          >
            <LogOut color={themeColors.mode === 'light' ? '#DC2626' : '#EF4444'} size={18} />
            <Text style={[styles.signOutText, { color: themeColors.mode === 'light' ? '#DC2626' : '#EF4444' }]}>{t('signOut', 'Sign Out')}</Text>
          </Pressable>

        </View>

      </View>

      {/* Modals */}
      <RewardsHubModal visible={showRewardsModal} onClose={() => setShowRewardsModal(false)} />
      <VipSubscriptionModal visible={showVipModal} onClose={() => setShowVipModal(false)} />

      {/* Avatar Selection Modal */}
      <Modal
        visible={showAvatarModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitleText, { color: themeColors.text }]}>Select Profile Avatar</Text>
              <Pressable onPress={() => setShowAvatarModal(false)} style={[styles.modalCloseBtn, { backgroundColor: themeColors.backgroundElement }]}>
                <X size={18} color={themeColors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18 }}>
              <Text style={[styles.modalSubTitle, { color: themeColors.textSecondary }]}>Choose an official Anime Avatar:</Text>
              <View style={styles.presetGrid}>
                {PRESET_AVATARS.map((av) => {
                  const isSelected = profile?.avatar_url === av.url;
                  return (
                    <Pressable
                      key={av.id}
                      style={[
                        styles.presetItem,
                        { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border },
                        isSelected && { borderColor: primaryColor, borderWidth: 2 }
                      ]}
                      onPress={() => handleSelectAvatar(av.url)}
                      disabled={isUpdatingAvatar}
                    >
                      <Image source={{ uri: av.url }} style={styles.presetImg} resizeMode="cover" />
                      <Text style={[styles.presetNameText, { color: themeColors.text }]} numberOfLines={1}>{av.name}</Text>
                      {isSelected && (
                        <View style={[styles.selectedCheckBadge, { backgroundColor: primaryColor }]}>
                          <Check size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.modalSubTitle, { marginTop: 18, color: themeColors.textSecondary }]}>Or enter image URL:</Text>
              <View style={styles.customUrlRow}>
                <TextInput
                  style={[styles.customUrlInput, { color: themeColors.text, backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}
                  placeholder="https://example.com/photo.jpg"
                  placeholderTextColor={themeColors.textMuted}
                  value={customAvatarUrl}
                  onChangeText={setCustomAvatarUrl}
                  autoCapitalize="none"
                />
                <Pressable
                  style={[styles.customSaveBtn, { backgroundColor: primaryColor }, (!customAvatarUrl.trim() || isUpdatingAvatar) && { opacity: 0.5 }]}
                  disabled={!customAvatarUrl.trim() || isUpdatingAvatar}
                  onPress={() => handleSelectAvatar(customAvatarUrl)}
                >
                  {isUpdatingAvatar ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.customSaveText}>Save</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileWrapper: {
    width: '100%',
    alignSelf: 'center',
  },
  profileWrapperDesktop: {
    maxWidth: 680,
    marginTop: 20,
  },

  /* HERO PROFILE CARD */
  heroCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  avatarGlow: {
    padding: 4,
    borderRadius: 54,
    borderWidth: 2,
    marginBottom: 12,
    position: 'relative',
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  userName: {
    fontSize: 22,
    fontWeight: '900',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* LEVEL CARD */
  levelCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  levelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  levelLabel: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '800',
  },
  levelTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  xpTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  xpFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpText: {
    fontSize: 11,
    textAlign: 'right',
    fontWeight: '600',
  },

  /* STATS GRID */
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  statBox: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },

  /* BADGES BLOCK */
  badgesBlock: {
    marginTop: 16,
  },
  badgesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  badgesTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '800',
  },
  badgesScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeChipLocked: {
    opacity: 0.45,
  },
  badgeEmoji: {
    fontSize: 18,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '800',
  },
  badgeStatus: {
    fontSize: 10,
    fontWeight: '600',
  },

  /* MENU CARDS */
  menuSection: {
    paddingHorizontal: 16,
    marginTop: 18,
    gap: 10,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  menuSub: {
    fontSize: 11,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '800',
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  presetItem: {
    width: '31%',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
  },
  presetImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginBottom: 6,
  },
  presetNameText: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  selectedCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customUrlRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  customUrlInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    borderWidth: 1,
  },
  customSaveBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
