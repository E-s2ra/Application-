import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Switch, Platform, Image, AccessibilityInfo } from 'react-native';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Home, LayoutGrid, Bookmark, User, ShieldAlert, Sparkles, X,
  Film, Clapperboard, Tv, Zap, Crown, Gift, Moon, Sun, ChevronLeft, ChevronRight, LogOut, Play
} from 'lucide-react-native';
import { useTheme, useColorMode } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/use-language';
import { useGamification } from '@/hooks/useGamification';
import { Radius, Spacing } from '@/constants/theme';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRewards?: () => void;
}

export function Sidebar({ isOpen, onClose, onOpenRewards }: SidebarProps) {
  const themeColors = useTheme();
  const { isDark, toggleColorMode } = useColorMode();
  const { isDesktop } = useResponsive();
  const insets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const { user, profile, signOut } = useAuth();
  const { t, isRTL } = useTranslation();
  const { isVIP, vipDaysRemaining } = useGamification();

  const isAdmin = profile?.role === 'admin';

  const handleLogout = async () => {
    if (!isDesktop) onClose();
    try {
      await signOut();
    } catch (e) {
      console.log('Error signing out:', e);
    }
    router.replace('/(auth)/login');
  };

  const [slideAnim] = useState(new Animated.Value(isRTL ? 320 : -320));
  const [isRendered, setIsRendered] = useState(isDesktop || isOpen);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isDesktop) {
      slideAnim.stopAnimation();
      slideAnim.setValue(0);
      setIsRendered(true);
    } else {
      slideAnim.stopAnimation();
      if (isOpen) {
        setIsRendered(true);
      }
      Animated.timing(slideAnim, {
        toValue: isOpen ? 0 : isRTL ? 320 : -320,
        duration: reduceMotion ? 0 : 250,
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (finished && !isOpen) {
          setIsRendered(false);
        }
      });
    }
  }, [isOpen, isDesktop, isRTL, reduceMotion, slideAnim]);

  const navItems = [
    { label: t('tabHome', 'Home'), icon: Home, route: '/' },
    { label: t('tabSearch', 'Browse Catalog'), icon: LayoutGrid, route: '/(tabs)/search' },
    { label: t('tabFavorites', 'My List'), icon: Bookmark, route: '/(tabs)/favorites' },
  ];

  const categories = [
    { label: t('catMovies', 'Movies'), icon: Film, route: '/(tabs)/search', params: { category: 'Movies' } },
    { label: t('catAnimeMovies', 'Anime Movies'), icon: Clapperboard, route: '/(tabs)/search', params: { category: 'Anime Movies' } },
    { label: t('catKDrama', 'K-Drama'), icon: Sparkles, route: '/(tabs)/search', params: { category: 'K-Drama' } },
    { label: t('catDrama', 'Drama'), icon: Tv, route: '/(tabs)/search', params: { category: 'Drama' } },
    { label: t('catAnimeSeries', 'Anime Series'), icon: Zap, route: '/(tabs)/search', params: { category: 'Anime Series' } },
  ];

  const sidebarWidth = 280;

  const content = (
    <Animated.View
      accessibilityViewIsModal={!isDesktop}
      style={[
        styles.sidebarContent,
        {
          backgroundColor: themeColors.backgroundElement,
          ...(isRTL
            ? { right: 0, borderLeftColor: themeColors.border, borderLeftWidth: 1 }
            : { left: 0, borderRightColor: themeColors.border, borderRightWidth: 1 }),
          width: sidebarWidth,
          paddingTop: Math.max(insets.top + 10, 20),
          transform: [{ translateX: isDesktop ? 0 : slideAnim }],
        },
      ]}
    >
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <View style={[styles.brandRow, isRTL && styles.rowReverse]}>
          <View style={[styles.brandIcon, { backgroundColor: themeColors.primary }]}>
            <Play color="#FFFFFF" fill="#FFFFFF" size={13} />
          </View>
          <Text style={[styles.brandName, { color: themeColors.text }]}>
            ANI<Text style={{ color: themeColors.primary }}>FLIX</Text>
          </Text>
        </View>
        {!isDesktop && (
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeBtn,
              {
                backgroundColor: pressed ? themeColors.backgroundSelected : themeColors.backgroundCard,
                borderColor: themeColors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close navigation sidebar"
          >
            <X color={themeColors.text} size={18} />
          </Pressable>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.userProfileCard,
          isRTL && styles.rowReverse,
          { backgroundColor: pressed ? themeColors.backgroundSelected : 'transparent' },
        ]}
        onPress={() => {
          if (!isDesktop) onClose();
          router.push('/(tabs)/profile' as any);
        }}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
      >
        <View style={[styles.userAvatarBox, { backgroundColor: themeColors.backgroundSelected }]}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <User size={20} color={themeColors.primary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.userNameText, { color: themeColors.text }]} numberOfLines={1}>
            {profile?.full_name || user?.email?.split('@')[0] || 'AniFlix User'}
          </Text>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Crown size={11} color={isVIP ? themeColors.primary : themeColors.textMuted} />
            <Text style={[styles.userRoleText, { color: isVIP ? themeColors.primary : themeColors.textMuted }]}>
              {isAdmin ? 'ADMIN' : isVIP ? `VIP MEMBER (${vipDaysRemaining}d)` : 'FREE PLAN'}
            </Text>
          </View>
        </View>
        {isRTL ? (
          <ChevronLeft size={16} color={themeColors.textSecondary} />
        ) : (
          <ChevronRight size={16} color={themeColors.textSecondary} />
        )}
      </Pressable>

      <Animated.ScrollView 
        style={styles.navScroll} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60, gap: 4 }}
      >
        <Text style={[styles.sectionHeader, { color: themeColors.textMuted }]}>LIBRARY</Text>
        {navItems.map((item) => {
          const isActive = pathname === item.route || (item.route === '/' && (pathname === '/(tabs)' || pathname === '/(tabs)/index'));
          const Icon = item.icon;
          return (
            <Pressable
              key={item.route}
              onPress={() => {
                if (!isDesktop) onClose();
                router.push(item.route as any);
              }}
              style={({ pressed }) => [
                styles.navItem,
                isRTL && styles.rowReverse,
                { backgroundColor: isActive || pressed ? themeColors.backgroundSelected : 'transparent' },
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
            >
              <Icon
                color={isActive ? themeColors.primary : themeColors.textSecondary}
                size={19}
                strokeWidth={isActive ? 2.4 : 1.9}
              />
              <Text
                style={[
                  styles.navItemText,
                  { color: isActive ? themeColors.text : themeColors.textSecondary, fontWeight: isActive ? '700' : '500' },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}

        <Text style={[styles.sectionHeader, { color: themeColors.textMuted }]}>DISCOVER</Text>
        
        {categories.map((item) => {
          const isActive = pathname === item.route && params.category === item.params.category;
          const Icon = item.icon;
          return (
            <Pressable
              key={item.params.category}
              onPress={() => {
                if (!isDesktop) onClose();
                router.push({ pathname: item.route, params: item.params } as any);
              }}
              style={({ pressed }) => [
                styles.navItem,
                isRTL && styles.rowReverse,
                { backgroundColor: isActive || pressed ? themeColors.backgroundSelected : 'transparent' },
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
            >
              <Icon
                color={isActive ? themeColors.primary : themeColors.textSecondary}
                size={19}
                strokeWidth={isActive ? 2.4 : 1.9}
              />
              <Text
                style={[
                  styles.navItemText,
                  { color: isActive ? themeColors.text : themeColors.textSecondary, fontWeight: isActive ? '700' : '500' },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}

        <Text style={[styles.sectionHeader, { color: themeColors.textMuted }]}>EXTRAS</Text>
        <Pressable
          onPress={() => {
            if (onOpenRewards) onOpenRewards();
            if (!isDesktop) onClose();
          }}
          style={({ pressed }) => [
            styles.navItem,
            isRTL && styles.rowReverse,
            { backgroundColor: pressed ? themeColors.backgroundSelected : 'transparent' },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open rewards"
        >
          <Gift color={themeColors.textSecondary} size={19} strokeWidth={1.9} />
          <Text style={[styles.navItemText, { color: themeColors.textSecondary, fontWeight: '500' }]}>
            Rewards
          </Text>
        </Pressable>

        {/* 🛡️ ADMIN SECTION */}
        {isAdmin && (
          <>
            <Text style={[styles.sectionHeader, { color: themeColors.textMuted }]}>ADMIN</Text>
            <Pressable
              onPress={() => {
                if (!isDesktop) onClose();
                router.push('/admin' as any);
              }}
              style={({ pressed }) => [
                styles.navItem,
                isRTL && styles.rowReverse,
                { backgroundColor: pressed ? themeColors.errorSoft : 'transparent' },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open Admin Control Center"
            >
              <ShieldAlert color={themeColors.error} size={18} strokeWidth={2} />
              <Text style={[styles.navItemText, { color: themeColors.error, fontWeight: '800' }]}>
                Admin Control Center
              </Text>
            </Pressable>
          </>
        )}

        <Text style={[styles.sectionHeader, { color: themeColors.textMuted }]}>PREFERENCES</Text>
        <View style={[styles.navItem, isRTL && styles.rowReverse, { justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
            {isDark ? <Moon color={themeColors.textSecondary} size={18} /> : <Sun color={themeColors.textSecondary} size={18} />}
            <Text style={[styles.navItemText, { color: themeColors.textSecondary }]}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
          <Switch 
            value={isDark} 
            onValueChange={toggleColorMode} 
            trackColor={{ false: themeColors.backgroundCard, true: themeColors.primary }}
            thumbColor={'#FFFFFF'}
            accessibilityLabel="Dark mode"
          />
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.navItem,
            isRTL && styles.rowReverse,
            { backgroundColor: pressed ? themeColors.errorSoft : 'transparent' },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <LogOut color={themeColors.error} size={18} strokeWidth={2} />
          <Text style={[styles.navItemText, { color: themeColors.error, fontWeight: '800' }]}>
            Sign Out
          </Text>
        </Pressable>
      </Animated.ScrollView>
    </Animated.View>
  );

  if (isDesktop) {
    return <View style={{ width: sidebarWidth, height: '100%' }}>{content}</View>;
  }

  if (!isRendered) return null;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { zIndex: 9999, pointerEvents: isOpen ? 'box-none' : 'none' },
      ]}
    >
      {isOpen && (
        <Pressable
          onPress={onClose}
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Close navigation sidebar"
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.65)' }]} />
        </Pressable>
      )}
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebarContent: {
    height: '100%',
    position: 'absolute',
    top: 0,
    bottom: 0,
    paddingHorizontal: Spacing.md,
    zIndex: 10000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: Radius.md,
    marginBottom: 18,
    gap: 11,
  },
  userAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '700',
  },
  userRoleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  navScroll: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    paddingHorizontal: 10,
    marginTop: 16,
    marginBottom: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderRadius: Radius.md,
    position: 'relative',
  },
  navItemText: {
    fontSize: 13.5,
  },
  divider: {
    height: 1,
    marginVertical: 8,
    opacity: 0.45,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});
