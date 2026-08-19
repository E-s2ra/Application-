import { DarkTheme, ThemeProvider, Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '@/constants/theme';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { FavoritesProvider } from '@/hooks/useFavorites';
import { ReviewsProvider } from '@/hooks/useReviews';
import { GamificationProvider } from '@/hooks/useGamification';
import { AdMobProvider } from '@/hooks/useAdMob';
import { AniFlixSplashScreen } from '@/components/AniFlixSplashScreen';
import { AdMobRewardedModal } from '@/components/AdMobRewardedModal';

SplashScreen.preventAutoHideAsync().catch(() => {});

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

function AuthGuard({ onReady }: { onReady: () => void }) {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Hide native splash screen as our animated splash takes over
    SplashScreen.hideAsync().catch(() => {});
    onReady();
  }, []);

  useEffect(() => {
    if (isLoading) return;

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
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthProvider>
      <FavoritesProvider>
        <ReviewsProvider>
          <GamificationProvider>
            <AdMobProvider>
              <ThemeProvider value={DarkTheme}>
                <View style={{ flex: 1, backgroundColor: themeColors.background }}>
                  <AuthGuard onReady={() => {}} />
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
                    <Stack.Screen name="watch" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
                  </Stack>

                  {/* Google AdMob Rewarded Ad Modal */}
                  <AdMobRewardedModal />

                  {showSplash && (
                    <AniFlixSplashScreen onFinish={() => setShowSplash(false)} />
                  )}
                </View>
              </ThemeProvider>
            </AdMobProvider>
          </GamificationProvider>
        </ReviewsProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}


