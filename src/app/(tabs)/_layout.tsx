import { Tabs } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from '@/hooks/use-language';
import { Home, Search, Heart, User } from 'lucide-react-native';
import { Platform } from 'react-native';
import { NotificationsBell } from '@/components/NotificationsBell';

export default function TabLayout() {
  const themeColors = useTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: themeColors.backgroundElement,
          borderBottomColor: themeColors.border,
          borderBottomWidth: 1,
        },
        headerTintColor: themeColors.text,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        headerRight: () => <NotificationsBell />,
        tabBarStyle: {
          backgroundColor: themeColors.backgroundElement,
          borderTopColor: themeColors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome', 'Home'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Home color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabSearch', 'Search'),
          headerTitle: t('tabSearch', 'Search'),
          tabBarIcon: ({ color, focused }) => (
            <Search color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabFavorites', 'My List'),
          headerTitle: t('tabFavorites', 'My List'),
          tabBarIcon: ({ color, focused }) => (
            <Heart color={color} size={22} fill={focused ? color : 'none'} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabProfile', 'Profile'),
          headerTitle: t('tabProfile', 'Profile'),
          tabBarIcon: ({ color, focused }) => (
            <User color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}
