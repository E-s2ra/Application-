import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Home, LayoutGrid, Bookmark, User, ShieldAlert, Sparkles, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const themeColors = useTheme();
  const { isDesktop } = useResponsive();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  
  const isAdmin = user?.email?.toLowerCase() === 'esra99san@gmail.com';

  const slideAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    if (isDesktop) {
      slideAnim.setValue(0);
    } else {
      Animated.timing(slideAnim, {
        toValue: isOpen ? 0 : -300,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen, isDesktop]);

  const navItems = [
    { label: 'Home', icon: Home, route: '/' },
    { label: 'Browse', icon: LayoutGrid, route: '/search' },
    { label: 'My List', icon: Bookmark, route: '/favorites' },
    { label: 'Profile', icon: User, route: '/profile' },
  ];

  const sidebarWidth = 260;

  const content = (
    <Animated.View
      style={[
        styles.sidebarContent,
        {
          backgroundColor: themeColors.backgroundElement,
          borderRightColor: themeColors.border,
          width: sidebarWidth,
          transform: [{ translateX: isDesktop ? 0 : slideAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={[styles.brandIcon, { backgroundColor: themeColors.primary }]}>
            <Sparkles color="#fff" size={18} />
          </View>
          <Text style={styles.brandName}>
            ANI<Text style={{ color: themeColors.primary }}>FLIX</Text>
          </Text>
        </View>
        {!isDesktop && (
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X color={themeColors.text} size={24} />
          </Pressable>
        )}
      </View>

      <View style={styles.navLinks}>
        {navItems.map((item) => {
          // Expo router pathname matching
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
                isActive && [styles.navItemActive, { backgroundColor: themeColors.primary + '1A' }]
              ]}
            >
              <Icon
                color={isActive ? themeColors.primary : themeColors.textSecondary}
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text
                style={[
                  styles.navItemText,
                  { color: isActive ? themeColors.primary : themeColors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}

        {isAdmin && (
          <View style={styles.adminSection}>
            <View style={[styles.adminDivider, { backgroundColor: themeColors.border }]} />
            <Text style={[styles.adminHeader, { color: themeColors.textSecondary }]}>ADMINISTRATION</Text>
            <Pressable
              onPress={() => {
                router.push('/admin' as any);
                if (!isDesktop) onClose();
              }}
              style={styles.navItem}
            >
              <ShieldAlert color="#E50914" size={22} strokeWidth={2} />
              <Text style={[styles.navItemText, { color: '#E50914', fontWeight: '700' }]}>
                Admin Panel
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
  );

  if (isDesktop) {
    return <View style={{ width: sidebarWidth, height: '100%' }}>{content}</View>;
  }

  // Mobile overlay
  if (!isOpen && (slideAnim as any)._value === -300) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
      {isOpen && (
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        </TouchableWithoutFeedback>
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
    paddingTop: 40,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
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
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  navLinks: {
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  navItemActive: {
  },
  navItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  adminSection: {
    marginTop: 20,
  },
  adminDivider: {
    height: 1,
    marginBottom: 20,
    opacity: 0.5,
  },
  adminHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 10,
  }
});
