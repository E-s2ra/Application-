import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, CircleAlert, LogIn } from 'lucide-react-native';
import { AppButton, AppSurface } from '@/components/ui';
import { Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';

export default function VerifiedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { language, isRTL } = useLanguage();
  const { session } = useAuth();
  const { pagePad, isSmallDevice } = useResponsive({ desktopRailWidth: 0 });
  const [showFallback, setShowFallback] = useState(false);

  const copy = language === 'ku'
    ? {
        checkingTitle: 'پشتڕاستکردنەوەی ئیمەیڵ',
        checkingBody: 'چاوەڕێ بکە تا دۆخی پشتڕاستکردنەوەی هەژمارەکەت پشکنین دەکەین.',
        successTitle: 'ئیمەیڵ پشتڕاستکرایەوە',
        successBody: 'هەژمارەکەت پشتڕاستکرا و گەڕاندنەوت بۆ ئەپەکە.',
        fallbackTitle: 'چوونەژوورەوە پێویستە',
        fallbackBody: 'نەمانتوانی دانیشتنێکی پشتڕاستکراو لەم بەستەرەوە دروست بکەین. بچۆ ژوورەوە بۆ بەردەوامبوون.',
        signIn: 'چوونەژوورەوە',
      }
    : {
        checkingTitle: 'Verifying your email',
        checkingBody: 'Please wait while we confirm your verified account session.',
        successTitle: 'Email verified',
        successBody: 'Your account is verified. Returning you to the app.',
        fallbackTitle: 'Sign-in required',
        fallbackBody: 'We could not establish a verified session from this link. Sign in to continue.',
        signIn: 'Sign in to account',
      };

  useEffect(() => {
    if (session) {
      setShowFallback(false);
      return;
    }
    const timeout = setTimeout(() => setShowFallback(true), 3000);
    return () => clearTimeout(timeout);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const timeout = setTimeout(() => router.replace('/(tabs)'), 1200);
    return () => clearTimeout(timeout);
  }, [session, router]);

  const state = session ? 'success' : showFallback ? 'fallback' : 'checking';
  const textDirection = isRTL ? styles.rtlText : styles.ltrText;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View
        style={[styles.glowOrbTop, { backgroundColor: themeColors.primary, opacity: themeColors.mode === 'dark' ? 0.14 : 0.08, pointerEvents: 'none' }]}
      />
      <View
        style={[styles.glowOrbBottom, { backgroundColor: themeColors.primary, opacity: themeColors.mode === 'dark' ? 0.09 : 0.05, pointerEvents: 'none' }]}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top + Spacing.xl, Spacing.xxl),
            paddingBottom: Math.max(insets.bottom + Spacing.xl, Spacing.xxl),
            paddingHorizontal: pagePad,
          },
        ]}
        contentInsetAdjustmentBehavior="automatic"
      >
        <AppSurface
          variant="raised"
          padding={isSmallDevice ? 'lg' : 'xl'}
          style={styles.card}
        >
          <View accessibilityLiveRegion="polite" style={styles.stateContent}>
            {state === 'checking' ? (
              <View style={[styles.iconCircle, { backgroundColor: themeColors.primarySoft }]}>
                <ActivityIndicator color={themeColors.primary} size="large" />
              </View>
            ) : state === 'success' ? (
              <View style={[styles.iconCircle, { backgroundColor: themeColors.successSoft }]}>
                <CheckCircle2 color={themeColors.success} size={38} />
              </View>
            ) : (
              <View style={[styles.iconCircle, { backgroundColor: themeColors.errorSoft }]}>
                <CircleAlert color={themeColors.error} size={38} />
              </View>
            )}

            <Text style={[styles.title, { color: themeColors.text }, textDirection]}>
              {state === 'checking'
                ? copy.checkingTitle
                : state === 'success'
                  ? copy.successTitle
                  : copy.fallbackTitle}
            </Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }, textDirection]}>
              {state === 'checking'
                ? copy.checkingBody
                : state === 'success'
                  ? copy.successBody
                  : copy.fallbackBody}
            </Text>

            {state === 'fallback' ? (
              <AppButton
                label={copy.signIn}
                fullWidth
                size="lg"
                leftIcon={<LogIn color={themeColors.buttonText} size={18} />}
                onPress={() => router.replace('/(auth)/login')}
              />
            ) : null}
          </View>
        </AppSurface>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  glowOrbTop: {
    position: 'absolute',
    top: -110,
    right: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -120,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: Radius.xl,
    boxShadow: Shadows.raised,
  },
  stateContent: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h1,
    width: '100%',
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    width: '100%',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ltrText: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
});
