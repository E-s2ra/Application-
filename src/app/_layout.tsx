import { Stack, useRouter, useSegments } from 'expo-router';
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

SplashScreen.preventAutoHideAsync().catch(() => {});

function PrivacyProtection() {
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web' || isLoading) return;

    // Use database role — not email comparison — as the source of truth.
    const isAdmin = profile?.role === 'admin';

    if (isAdmin) {
      void ScreenCapture.allowScreenCaptureAsync('app-security');
    } else {
      void ScreenCapture.preventScreenCaptureAsync('app-security');
      if (Platform.OS === 'ios') {
        // @ts-ignore
        if (ScreenCapture.enableAppSwitcherProtectionAsync) void ScreenCapture.enableAppSwitcherProtectionAsync(1);
      }
    }
  }, [user, profile, isLoading]);

  return null;
}

function AuthGuard({ onReady }: { onReady: () => void }) {
  const { session, profile, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Hide native splash screen as our animated splash takes over
    SplashScreen.hideAsync().catch(() => {});
    onReady();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    // Wait for profile to be fully loaded if there is an active session before navigating
    if (session && !profile) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isPasswordRecovery = String(segments[0]) === 'reset-password';
    const isVerified = String(segments[0]) === 'verified';

    if (!session && !inAuthGroup && !isPasswordRecovery && !isVerified) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, profile, isLoading, segments, router]);

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

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <AuthGuard onReady={() => {}} />
      <PrivacyProtection />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: themeColors.backgroundElement,
          },
          headerTintColor: themeColors.text,
          contentStyle: { backgroundColor: themeColors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="watch" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="verified" options={{ headerShown: false }} />
        <Stack.Screen name="fib-payment" options={{ headerShown: false }} />
        <Stack.Screen name="vip-success" options={{ headerShown: false }} />
      </Stack>

      {/* Google AdMob Rewarded Ad Modal */}
      <AdMobRewardedModal />

      {showSplash && <AniFlixSplashScreen onFinish={onFinishSplash} />}
    </View>
  );
}

import { ToastProvider } from '@/hooks/useToast';

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
