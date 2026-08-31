import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Switch, Platform, Image } from 'react-native';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Home, LayoutGrid, Bookmark, User, ShieldAlert, Sparkles, X,
  Film, Clapperboard, Tv, Zap, Flame, Crown, Gift, Moon, Sun, ChevronRight, LogOut
} from 'lucide-react-native';
import { useTheme, useColorMode } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/use-language';
import { useGamification } from '@/hooks/useGamification';
import { PrimaryGradient } from '@/components/PrimaryGradient';

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
  const { t } = useTranslation();
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

  const [slideAnim] = useState(new Animated.Value(-320));

  useEffect(() => {
    if (isDesktop) {
      slideAnim.setValue(0);
    } else {
      Animated.timing(slideAnim, {
        toValue: isOpen ? 0 : -320,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [isOpen, isDesktop, slideAnim]);

  const navItems = [
    { label: t('tabHome', 'Home'), icon: Home, route: '/' },
    { label: t('tabSearch', 'Browse Catalog'), icon: LayoutGrid, route: '/search' },
    { label: t('tabFavorites', 'My List'), icon: Bookmark, route: '/favorites' },
  ];

  const categories = [
    { label: t('catMovies', 'Movies'), icon: Film, route: '/search', params: { category: 'Movies' } },
    { label: t('catAnimeMovies', 'Anime Movies'), icon: Clapperboard, route: '/search', params: { category: 'Anime Movies' } },
    { label: t('catKDrama', 'K-Drama'), icon: Sparkles, route: '/search', params: { category: 'K-Drama' } },
    { label: t('catDrama', 'Drama'), icon: Tv, route: '/search', params: { category: 'Drama' } },
    { label: t('catAnimeSeries', 'Anime Series'), icon: Zap, route: '/search', params: { category: 'Anime Series' } },
  ];

  const sidebarWidth = 280;

  const content = (
    <Animated.View
      style={[
        styles.sidebarContent,
        {
          backgroundColor: themeColors.backgroundElement,
          borderRightColor: themeColors.border,
          width: sidebarWidth,
          paddingTop: Math.max(insets.top + 10, 20),
          transform: [{ translateX: isDesktop ? 0 : slideAnim }],
        },
      ]}
    >
      {/* 🎬 Brand & Close Bar */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={[styles.brandIcon, { backgroundColor: themeColors.primary }]}>
            <PrimaryGradient borderRadius={8} />
            <Sparkles color="#FFFFFF" size={16} />
          </View>
          <Text style={[styles.brandName, { color: themeColors.text }]}>
            ANI<Text style={{ color: themeColors.primary }}>FLIX</Text>
          </Text>
        </View>
        {!isDesktop && (
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
            <X color={themeColors.text} size={18} />
          </Pressable>
        )}
      </View>

      {/* 👤 Mini User Profile Card */}
      <Pressable
        style={[styles.userProfileCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}
        onPress={() => {
          router.push('/profile');
          if (!isDesktop) onClose();
        }}
      >
        <View style={[styles.userAvatarBox, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.primary }]}>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Crown size={11} color={isVIP ? '#FFB800' : themeColors.textSecondary} />
            <Text style={[styles.userRoleText, { color: isVIP ? '#FFB800' : themeColors.textSecondary }]}>
              {isAdmin ? 'ADMIN' : isVIP ? `VIP MEMBER (${vipDaysRemaining}d)` : 'FREE PLAN'}
            </Text>
          </View>
        </View>
        <ChevronRight size={16} color={themeColors.textSecondary} />
      </Pressable>

      <Animated.ScrollView 
        style={styles.navScroll} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60, gap: 4 }}
      >
        {/* 🧭 MAIN NAVIGATION */}
        <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>MAIN MENU</Text>
        {navItems.map((item) => {
          const isActive = pathname === item.route || (item.route === '/' && (pathname === '/(tabs)' || pathname === '/(tabs)/index'));
          const Icon = item.icon;
          return (
            <Pressable
              key={item.route}
              onPress={() => {
                router.push(item.route as any);
                if (!isDesktop) onClose();
              }}
              style={[
                styles.navItem,
                { backgroundColor: isActive ? 'rgba(3, 86, 197, 0.12)' : 'transparent' },
              ]}
            >
              {isActive && <View style={[styles.activeIndicator, { backgroundColor: themeColors.primary }]} />}
              <Icon
                color={isActive ? themeColors.primary : themeColors.textSecondary}
                size={18}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text
                style={[
                  styles.navItemText,
                  { color: isActive ? themeColors.primary : themeColors.textSecondary, fontWeight: isActive ? '800' : '600' },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}

        {/* 🍿 CATEGORIES SECTION */}
        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
        <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>CATEGORIES</Text>
        
        {categories.map((item) => {
          const isActive = pathname === item.route && params.category === item.params.category;
          const Icon = item.icon;
          return (
            <Pressable
              key={item.params.category}
              onPress={() => {
                router.push({ pathname: item.route, params: item.params } as any);
                if (!isDesktop) onClose();
              }}
              style={[
                styles.navItem,
                { backgroundColor: isActive ? 'rgba(3, 86, 197, 0.12)' : 'transparent' },
              ]}
            >
              {isActive && <View style={[styles.activeIndicator, { backgroundColor: themeColors.primary }]} />}
              <Icon
                color={isActive ? themeColors.primary : themeColors.textSecondary}
                size={18}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text
                style={[
                  styles.navItemText,
                  { color: isActive ? themeColors.primary : themeColors.textSecondary, fontWeight: isActive ? '800' : '600' },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}

        {/* 🎁 REWARDS & MISSIONS */}
        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
        <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>REWARDS & GAMIFICATION</Text>
        <Pressable
          onPress={() => {
            if (onOpenRewards) onOpenRewards();
            if (!isDesktop) onClose();
          }}
          style={styles.navItem}
        >
          <Gift color={themeColors.primary} size={18} strokeWidth={2} />
          <Text style={[styles.navItemText, { color: themeColors.primary, fontWeight: '800' }]}>
            Daily Missions & Spin
          </Text>
        </Pressable>

        {/* 🛡️ ADMIN SECTION */}
        {isAdmin && (
          <>
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>ADMINISTRATION</Text>
            <Pressable
              onPress={() => {
                router.push('/admin' as any);
                if (!isDesktop) onClose();
              }}
              style={styles.navItem}
            >
              <ShieldAlert color="#EF4444" size={18} strokeWidth={2} />
              <Text style={[styles.navItemText, { color: '#EF4444', fontWeight: '800' }]}>
                Admin Control Center
              </Text>
            </Pressable>
          </>
        )}

        {/* ⚙️ PREFERENCES & THEME */}
        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
        <Text style={[styles.sectionHeader, { color: themeColors.textSecondary }]}>PREFERENCES</Text>
        <View style={[styles.navItem, { justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
          />
        </View>

        {/* 🚪 LOGOUT BUTTON */}
        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
        <Pressable
          onPress={handleLogout}
          style={[styles.navItem, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
        >
          <LogOut color="#EF4444" size={18} strokeWidth={2} />
          <Text style={[styles.navItemText, { color: '#EF4444', fontWeight: '800' }]}>
            Sign Out
          </Text>
        </Pressable>
      </Animated.ScrollView>
    </Animated.View>
  );

  if (isDesktop) {
    return <View style={{ width: sidebarWidth, height: '100%' }}>{content}</View>;
  }

  if (!isOpen && (slideAnim as any)._value === -320) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="box-none">
      {isOpen && (
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill}>
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
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    paddingHorizontal: 16,
    elevation: 10,
    zIndex: 10000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  userAvatarBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
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
    fontWeight: '800',
  },
  userRoleText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  navScroll: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
  },
  navItemText: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 10,
    opacity: 0.6,
  },
});
