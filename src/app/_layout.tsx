import { DarkTheme, ThemeProvider, Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { FavoritesProvider } from '@/hooks/useFavorites';

SplashScreen.preventAutoHideAsync();

function PrivacyProtection() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    void ScreenCapture.preventScreenCaptureAsync('app-security');
    if (Platform.OS === 'ios') {
      void ScreenCapture.enableAppSwitcherProtectionAsync(1);
    }
  }, []);

  return null;
}

function AuthGuard() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments, router]);

  return null;
}

export default function RootLayout() {
  const themeColors = Colors.dark;

  return (
    <AuthProvider>
      <FavoritesProvider>
        <ThemeProvider value={DarkTheme}>
          <AuthGuard />
          <PrivacyProtection />
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: themeColors.backgroundElement,
              },
              headerTintColor: themeColors.text,
              contentStyle: { backgroundColor: themeColors.background },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="watch" options={{ title: 'Now Playing', presentation: 'fullScreenModal' }} />
          </Stack>
        </ThemeProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}
