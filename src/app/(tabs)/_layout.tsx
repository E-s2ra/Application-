import { Tabs } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Home, Search, Heart, User } from 'lucide-react-native';
import { Platform } from 'react-native';

export default function TabLayout() {
  const themeColors = Colors.dark;

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
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Home color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          headerTitle: 'Discover Anime',
          tabBarIcon: ({ color, focused }) => (
            <Search color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'My List',
          headerTitle: 'My Favorites',
          tabBarIcon: ({ color, focused }) => (
            <Heart color={color} size={22} fill={focused ? color : 'none'} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Account & Settings',
          tabBarIcon: ({ color, focused }) => (
            <User color={color} size={22} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}
