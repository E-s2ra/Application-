import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { FavoritesProvider } from '@/hooks/useFavorites';
import { ReviewsProvider } from '@/hooks/useReviews';
import { GamificationProvider } from '@/hooks/useGamification';
import { AppThemeProvider, useTheme, useColorMode } from '@/hooks/use-theme';
import { AdMobProvider } from '@/hooks/useAdMob';
import { SocialProvider } from '@/hooks/useSocial';
import { AniFlixSplashScreen } from '@/components/AniFlixSplashScreen';
import { AdMobRewardedModal } from '@/components/AdMobRewardedModal';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LanguageProvider } from '@/hooks/use-language';
import { ToastProvider } from '@/hooks/useToast';

SplashScreen.preventAutoHideAsync().catch(() => {});

const BYPASS_AUTH = __DEV__ && process.env.EXPO_PUBLIC_BYPASS_AUTH === 'true';

function PrivacyProtection() {
  const { profile, isLoading } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web' || isLoading) return;

    // Temporarily allow screenshots/screen recording everywhere per user request
    void ScreenCapture.allowScreenCaptureAsync('app-security').catch(() => {});
    if (Platform.OS === 'ios') {
      // @ts-ignore
      if (ScreenCapture.disableAppSwitcherProtectionAsync) void ScreenCapture.disableAppSwitcherProtectionAsync();
    }
  }, [profile, isLoading]);

  return null;
}

function RootNavigation({
  showSplash,
  onFinishSplash,
}: {
  showSplash: boolean;
  onFinishSplash: () => void;
}) {
  const themeColors = useTheme();
  const { isDark } = useColorMode();
  const { session, profile, isLoading, isDeviceSessionReady } = useAuth();
  const authReady = !isLoading && (!session || (!!profile && isDeviceSessionReady));

  useEffect(() => {
    if (authReady) SplashScreen.hideAsync().catch(() => {});
  }, [authReady]);

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <PrivacyProtection />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {authReady && <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: themeColors.backgroundElement,
          },
          headerTintColor: themeColors.text,
          contentStyle: { backgroundColor: themeColors.background },
        }}
      >
        <Stack.Protected guard={!session && !BYPASS_AUTH}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!session || BYPASS_AUTH}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="watch" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Protected guard={profile?.role === 'admin'}>
            <Stack.Screen name="admin" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack.Protected>
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="verified" options={{ headerShown: false }} />
        <Stack.Screen name="legal" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />

      </Stack>}

      {/* Google AdMob Rewarded Ad Modal */}
      <AdMobRewardedModal />

      {(showSplash || !authReady) && <AniFlixSplashScreen onFinish={onFinishSplash} />}
    </View>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthProvider>
      <FavoritesProvider>
        <ReviewsProvider>
          <GamificationProvider>
            <AppThemeProvider>
              <LanguageProvider>
                <SocialProvider>
                  <AdMobProvider>
                    <SafeAreaProvider>
                      <ToastProvider>
                        <RootNavigation showSplash={showSplash} onFinishSplash={() => setShowSplash(false)} />
                      </ToastProvider>
                    </SafeAreaProvider>
                  </AdMobProvider>
                </SocialProvider>
              </LanguageProvider>
            </AppThemeProvider>
          </GamificationProvider>
        </ReviewsProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}
