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
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, useColorMode } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import {
  LogOut,
  User as UserIcon,
  Heart,
  Sparkles,
  Tv,
  ChevronLeft,
  Flame,
  Coins,
  Crown,
  Trophy,
  Award,
  Users,
  Camera,
  X,
  Sun,
  Moon,
  Globe,

  ShieldAlert,
  Disc3,
  ShieldCheck,
  FileText,
  Info,
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
import { AppButton, AppListRow, AppSurface, AppTextField } from '@/components/ui';
import { Spacing, Typography } from '@/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };
  const themeColors = useTheme();
  const { isDark, toggleColorMode } = useColorMode();
  const { language, isRTL, toggleLanguage, t } = useLanguage();
  const { user, profile, signOut, isLoading, updateProfile } = useAuth();
  const { favorites } = useFavorites();
  const { isDesktop, isTablet, isSmallDevice, pagePad } = useResponsive();
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
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <GlobalNavbar title={language === 'ku' ? 'پرۆفایل و ڕێکخستنەکان' : 'Profile & Settings'} showBrandLogo={false} />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={activeTheme?.primary || themeColors.primary} />
        </View>
      </View>
    );
  }

  const isAdmin = profile?.role === 'admin';
  const levelXPProgress = xp - currentLevelBaseXP;
  const levelXPTarget = nextLevelXP - currentLevelBaseXP;
  const xpPercent = Math.min(100, Math.max(0, (levelXPProgress / levelXPTarget) * 100));
  const primaryColor = activeTheme?.primary || themeColors.primary;
  const rtlDisclosure = isRTL ? <ChevronLeft color={themeColors.textMuted} size={18} /> : undefined;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GlobalNavbar title={language === 'ku' ? 'پرۆفایل و ڕێکخستنەکان' : 'Profile & Settings'} showBrandLogo={false} />

      <ScrollView 
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 100) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileWrapper, (isDesktop || isTablet) && styles.profileWrapperDesktop]}>
        
        <View style={[styles.heroCard, { marginHorizontal: pagePad }]}>
          <Pressable
            onPress={() => setShowAvatarModal(true)}
            style={({ pressed }) => [
              styles.avatarGlow,
              { borderColor: themeColors.border, opacity: pressed ? 0.76 : 1 },
            ]}
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
            style={({ pressed }) => [
              styles.roleBadge,
              { backgroundColor: isAdmin ? primaryColor : themeColors.backgroundSelected, opacity: pressed ? 0.76 : 1 },
            ]}
            onPress={() => (isAdmin ? handleAdminPanel() : setShowVipModal(true))}
            accessibilityRole="button"
            accessibilityLabel="Membership status"
          >
            {isAdmin ? (
              <Sparkles color="#FFFFFF" size={14} />
            ) : (
              <Tv color={primaryColor} size={14} />
            )}
            <Text style={[styles.roleText, { color: isAdmin ? '#FFFFFF' : themeColors.text }]}>
              {isAdmin ? t('platformAdmin', 'Platform Admin') : isVIP ? `VIP Member (${vipDaysRemaining}d)` : t('standardStreamerGetVip', 'Get VIP Access')}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.levelCard, { backgroundColor: themeColors.backgroundElement, marginHorizontal: pagePad }]}>
          <View style={styles.levelCardHeader}>
            <View style={[styles.levelBadge, { backgroundColor: themeColors.backgroundSelected }]}>
              <Crown size={14} color={primaryColor} />
              <Text style={[styles.levelLabel, { color: primaryColor }]}>{t('level', 'LVL')} {level}</Text>
            </View>
            <Text style={[styles.levelTitle, { color: themeColors.text }]}>{t(levelTitle as any, levelTitle)}</Text>
          </View>

          <View style={[styles.xpTrack, { backgroundColor: themeColors.backgroundSelected }]}>
            <View style={[styles.xpFill, { width: `${xpPercent}%`, backgroundColor: primaryColor }]} />
          </View>

          <Text style={[styles.xpText, { color: themeColors.textSecondary }]}>
            {levelXPProgress} / {levelXPTarget} {t('xpToLevel', 'XP to Level')} {level + 1}
          </Text>
        </View>

        <View style={[styles.statsGrid, { paddingHorizontal: pagePad }, isSmallDevice && styles.statsGridCompact]}>
          <View style={[styles.statBox, isSmallDevice && styles.statBoxCompact, { backgroundColor: themeColors.backgroundElement }]}>
            <Coins size={18} color={primaryColor} style={{ marginBottom: 4 }} />
            <Text style={[styles.statNumber, { color: themeColors.text }]}>{coins}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]} numberOfLines={1}>{t('coins', 'Coins')}</Text>
          </View>

          <View style={[styles.statBox, isSmallDevice && styles.statBoxCompact, { backgroundColor: themeColors.backgroundElement }]}>
            <Flame size={18} color={primaryColor} style={{ marginBottom: 4 }} />
            <Text style={[styles.statNumber, { color: themeColors.text }]}>{streakDays}d</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]} numberOfLines={1}>{t('streak', 'Streak')}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.statBox,
              isSmallDevice && styles.statBoxCompact,
              { backgroundColor: pressed ? themeColors.backgroundSelected : themeColors.backgroundElement },
            ]}
            onPress={() => router.push('/(tabs)/favorites' as any)}
            accessibilityRole="button"
            accessibilityLabel="View favorite titles"
          >
            <Heart size={18} color={primaryColor} style={{ marginBottom: 4 }} />
            <Text style={[styles.statNumber, { color: themeColors.text }]}>{favorites.length}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]} numberOfLines={1}>{t('favorites', 'Favorites')}</Text>
          </Pressable>

          <View style={[styles.statBox, isSmallDevice && styles.statBoxCompact, { backgroundColor: themeColors.backgroundElement }]}>
            <Users size={18} color={primaryColor} style={{ marginBottom: 4 }} />
            <Text style={[styles.statNumber, { color: themeColors.text }]}>{followingCount}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]} numberOfLines={1}>{t('following', 'Following')}</Text>
          </View>
        </View>

        <View style={styles.badgesBlock}>
          <View style={[styles.badgesHeader, { paddingHorizontal: pagePad }]}>
            <Text style={[styles.badgesTitle, { color: themeColors.textSecondary }]}>{t('myBadges', 'MY BADGES')}</Text>
            <Pressable
              onPress={() => setShowRewardsModal(true)}
              style={({ pressed }) => ({ opacity: pressed ? 0.64 : 1, minHeight: 44, justifyContent: 'center' })}
              accessibilityRole="button"
              accessibilityLabel="View all rewards and badges"
            >
              <Text style={[styles.viewAllText, { color: primaryColor }]}>{t('viewAll', 'View All')}</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.badgesScroll, { paddingHorizontal: pagePad }]}>
            {badges.map((b) => (
              <View
                key={b.id}
                style={[
                  styles.badgeChip,
                  !b.isUnlocked && styles.badgeChipLocked,
                  { backgroundColor: themeColors.backgroundElement }
                ]}
              >
                <Award size={18} color={b.isUnlocked ? primaryColor : themeColors.textMuted} />
                <View>
                  <Text style={[styles.badgeName, { color: themeColors.text }]}>{t(b.title as any, b.title)}</Text>
                  <Text style={[styles.badgeStatus, { color: b.isUnlocked ? primaryColor : themeColors.textMuted }]}>
                    {b.isUnlocked ? t('unlocked', 'Unlocked') : t('locked', 'Locked')}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.menuSection, { paddingHorizontal: pagePad }]}>
          <Text style={[styles.menuGroupLabel, { color: themeColors.textMuted }]}>
            {language === 'ku' ? 'ئەزموون' : 'EXPERIENCE'}
          </Text>
          <AppSurface variant="subtle" padding="sm" style={styles.menuGroup}>
            {isAdmin && (
              <AppListRow
                title={language === 'ku' ? 'ناوەندی بەڕێوەبردنی ئەدمین' : 'Admin Management Center'}
                subtitle={language === 'ku' ? 'کەتەلۆگ، بەکارهێنەر و ڕێکخستنەکان بەڕێوەببە' : 'Manage catalog, users, and edge settings'}
                icon={<ShieldAlert color={primaryColor} size={20} />}
                trailing={rtlDisclosure}
                onPress={handleAdminPanel}
                accessibilityLabel="Admin Management Center"
              />
            )}
            <AppListRow
              title={t('rewardsHub', 'Quests & Rewards Hub')}
              subtitle={t('rewardsSub', 'Complete daily quests and claim coins')}
              icon={<Trophy color={primaryColor} size={20} />}
              trailing={rtlDisclosure}
              onPress={() => setShowRewardsModal(true)}
              accessibilityLabel="Quests & Rewards Hub"
            />
            {!isVIP && Platform.OS !== 'web' && (
              <AppListRow
                title={t('watchAdEarn', 'Watch Ad & Earn Coins')}
                subtitle={`${t('watchAdSub', 'Watch a verified sponsored ad to earn coins')} · +12 ${t('coinsText', 'Coins')}`}
                icon={<Disc3 color={primaryColor} size={20} />}
                trailing={rtlDisclosure}
                onPress={() => showRewardedAd({ rewardCoins: 12, rewardType: 'coins' })}
                accessibilityLabel="Watch sponsored ad to earn 12 coins"
              />
            )}
          </AppSurface>

          <Text style={[styles.menuGroupLabel, { color: themeColors.textMuted }]}>
            {language === 'ku' ? 'ڕێکخستنەکان' : 'PREFERENCES'}
          </Text>
          <AppSurface variant="subtle" padding="sm" style={styles.menuGroup}>
            <AppListRow
              title={isDark
                ? (language === 'ku' ? 'ڕووکاری ڕووناک' : 'Light appearance')
                : (language === 'ku' ? 'ڕووکاری تاریک' : 'Dark appearance')}
              subtitle={language === 'ku' ? 'ڕەنگی ئەپ بگۆڕە' : 'Switch the app color mode'}
              icon={isDark ? <Sun color={primaryColor} size={20} /> : <Moon color={primaryColor} size={20} />}
              trailing={rtlDisclosure}
              onPress={toggleColorMode}
              accessibilityLabel="Toggle Dark / Light Theme Mode"
            />
            <AppListRow
              title={`${t('languageSetting', 'App Language')} · ${language === 'ku' ? 'کوردی سۆرانی' : 'English'}`}
              subtitle={t('switchLanguageSub', 'Switch between English and Kurdish')}
              icon={<Globe color={primaryColor} size={20} />}
              trailing={rtlDisclosure}
              onPress={toggleLanguage}
              accessibilityLabel="Switch language"
            />
          </AppSurface>

          <Text style={[styles.menuGroupLabel, { color: themeColors.textMuted }]}>
            {language === 'ku' ? 'زانیاری و یاسا' : 'INFORMATION'}
          </Text>
          <AppSurface variant="subtle" padding="sm" style={styles.menuGroup}>
            <AppListRow
              title={language === 'ku' ? 'یاسای تایبەتمەندی' : 'Privacy Policy'}
              subtitle={language === 'ku' ? 'پاراستنی زانیارییەکان و هەژمار' : 'Data protection and security policies'}
              icon={<ShieldCheck color={primaryColor} size={20} />}
              trailing={rtlDisclosure}
              onPress={() => router.push('/legal/privacy-policy' as any)}
            />
            <AppListRow
              title={language === 'ku' ? 'مەرجەکانی بەکارهێنان' : 'Terms of Service'}
              subtitle={language === 'ku' ? 'یاسا و مەرجەکانی بەکارهێنانی ئەپ' : 'App rules, VIP terms, and guidelines'}
              icon={<FileText color={primaryColor} size={20} />}
              trailing={rtlDisclosure}
              onPress={() => router.push('/legal/terms-of-service' as any)}
            />
            <AppListRow
              title={language === 'ku' ? 'مافی کۆپیکردن (DMCA)' : 'DMCA & Copyright'}
              subtitle={language === 'ku' ? 'ڕاگەیەندراوی مافی فکری و کۆپیکردن' : 'Intellectual property and takedown notices'}
              icon={<ShieldAlert color={primaryColor} size={20} />}
              trailing={rtlDisclosure}
              onPress={() => router.push('/legal/dmca' as any)}
            />
            <AppListRow
              title={language === 'ku' ? 'دەربارەی ئەنیفلیکس' : 'About AniFlix'}
              subtitle={language === 'ku' ? 'وەشانی ئەپ، پشتیوانی و پەیوەندی' : 'Version 1.0.0, support, and contacts'}
              icon={<Info color={primaryColor} size={20} />}
              trailing={rtlDisclosure}
              onPress={() => router.push('/legal/about' as any)}
            />
          </AppSurface>

          <AppSurface variant="subtle" padding="sm" style={styles.menuGroup}>
            <AppListRow
              title={t('signOut', 'Sign Out')}
              icon={<LogOut color={themeColors.error} size={18} />}
              trailing={rtlDisclosure}
              onPress={handleLogout}
              accessibilityLabel="Sign out of account"
              destructive
            />
          </AppSurface>
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
              <Pressable
                onPress={() => setShowAvatarModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: themeColors.backgroundElement }]}
                accessibilityRole="button"
                accessibilityLabel="Close avatar picker"
                hitSlop={6}
              >
                <X size={18} color={themeColors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18 }}>
              <Text style={[styles.modalSubTitle, { color: themeColors.textSecondary }]}>
                {language === 'ku' ? 'وێنەیەک بەکاربهێنە کە مافی بەکارهێنانیت هەیە.' : 'Use an image you own or have permission to use.'}
              </Text>
              <View style={styles.customUrlRow}>
                <AppTextField
                  label={language === 'ku' ? 'بەستەری وێنەی پرۆفایل' : 'Profile image URL'}
                  placeholder="https://example.com/photo.jpg"
                  value={customAvatarUrl}
                  onChangeText={setCustomAvatarUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Custom avatar image URL"
                  containerStyle={styles.customUrlField}
                />
                <AppButton
                  label={t('save', 'Save')}
                  disabled={!customAvatarUrl.trim() || isUpdatingAvatar}
                  loading={isUpdatingAvatar}
                  onPress={() => handleSelectAvatar(customAvatarUrl)}
                  accessibilityLabel="Save custom avatar"
                  style={styles.customSaveButton}
                />
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
    maxWidth: 760,
    marginTop: 24,
  },

  /* HERO PROFILE CARD */
  heroCard: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 18,
  },
  avatarGlow: {
    padding: 3,
    borderRadius: 54,
    borderWidth: 1,
    marginBottom: 14,
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
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* LEVEL CARD */
  levelCard: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 18,
    padding: 18,
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
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  levelLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  levelTitle: {
    fontSize: 13,
    fontWeight: '600',
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
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  statsGridCompact: {
    flexWrap: 'wrap',
  },
  statBox: {
    flex: 1,
    minHeight: 88,
    paddingVertical: 16,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBoxCompact: {
    flexGrow: 1,
    flexBasis: '46%',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },

  /* BADGES BLOCK */
  badgesBlock: {
    marginTop: 24,
  },
  badgesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  badgesTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgesScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  badgeChipLocked: {
    opacity: 0.45,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeStatus: {
    fontSize: 10,
    fontWeight: '600',
  },

  /* MENU CARDS */
  menuSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: Spacing.sm,
  },
  menuGroupLabel: {
    ...Typography.overline,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  menuGroup: {
    gap: Spacing.xs,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 13,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  menuSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 10,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
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
    gap: Spacing.sm,
    alignItems: 'flex-end',
  },
  customUrlField: {
    flex: 1,
    minWidth: 0,
  },
  customSaveButton: {
    minWidth: 84,
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
