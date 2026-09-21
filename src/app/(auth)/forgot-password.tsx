import { useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  ShieldCheck,
} from 'lucide-react-native';
import { AppButton, AppIconButton, AppSurface, AppTextField } from '@/components/ui';
import { Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import { useToast } from '@/hooks/useToast';
import { isValidEmail, normalizeEmail } from '@/lib/password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { language, isRTL } = useLanguage();
  const { resetPassword } = useAuth();
  const { pagePad, isSmallDevice } = useResponsive({ desktopRailWidth: 0 });
  const { showError, showSuccess } = useToast();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const copy = language === 'ku'
    ? {
        back: 'گەڕانەوە بۆ چوونەژوورەوە',
        title: 'گۆڕینی تێپەڕەوشە',
        subtitle: 'ئیمەیڵی هەژمارت بنووسە بۆ وەرگرتنی بەستەری گەڕاندنەوە.',
        email: 'ئیمەیڵی هەژمار',
        emailPlaceholder: 'ناونیشانی ئیمەیڵ',
        send: 'ناردنی بەستەری گەڕاندنەوە',
        emptyError: 'تکایە ناونیشانی ئیمەیڵەکەت بنووسە.',
        invalidError: 'ناونیشانی ئیمەیڵێکی دروست بنووسە.',
        success: 'بەستەری گۆڕینی تێپەڕەوشە نێردرا. تکایە ئیمەیڵەکەت بپشکنە.',
        return: 'گەڕانەوە بۆ چوونەژوورەوە',
        unknownError: 'هەڵەیەکی چاوەڕواننەکراو ڕوویدا. تکایە دووبارە هەوڵبدەرەوە.',
      }
    : {
        back: 'Back to sign in',
        title: 'Reset password',
        subtitle: 'Enter your AniFlix email to receive a secure recovery link.',
        email: 'Account email',
        emailPlaceholder: 'name@example.com',
        send: 'Send reset link',
        emptyError: 'Please enter your email address.',
        invalidError: 'Enter a valid email address.',
        success: 'Reset link sent. Check your email to continue.',
        return: 'Return to sign in',
        unknownError: 'An unexpected error occurred. Please try again.',
      };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/login');
  };

  const handleReset = async () => {
    setErrorMessage(null);
    if (!email.trim()) {
      setErrorMessage(copy.emptyError);
      showError(copy.emptyError);
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage(copy.invalidError);
      showError(copy.invalidError);
      return;
    }

    setLoading(true);
    try {
      const { error } = await resetPassword(normalizedEmail);
      if (error) {
        setErrorMessage(error);
        showError(error);
        return;
      }

      setIsSuccess(true);
      setEmail('');
      showSuccess(copy.success);
    } catch (error: unknown) {
      const message = error instanceof Error && error.message ? error.message : copy.unknownError;
      setErrorMessage(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const textDirection = isRTL ? styles.rtlText : styles.ltrText;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
      >
        <AppSurface
          variant="raised"
          padding={isSmallDevice ? 'lg' : 'xl'}
          style={styles.authCard}
        >
          <View style={[styles.cardHeaderRow, isRTL && styles.rowRTL]}>
            <AppIconButton
              variant="surface"
              accessibilityLabel={copy.back}
              icon={
                isRTL
                  ? <ArrowRight color={themeColors.text} size={19} />
                  : <ArrowLeft color={themeColors.text} size={19} />
              }
              onPress={goBack}
            />
          </View>

          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: themeColors.primarySoft }]}>
              <ShieldCheck color={themeColors.primary} size={34} />
            </View>
            <Text style={[styles.title, { color: themeColors.text }, textDirection]}>
              {copy.title}
            </Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }, textDirection]}>
              {copy.subtitle}
            </Text>
          </View>

          {isSuccess ? (
            <View
              accessibilityLiveRegion="polite"
              style={styles.successState}
            >
              <View style={[styles.successIcon, { backgroundColor: themeColors.successSoft }]}>
                <CheckCircle2 color={themeColors.success} size={30} />
              </View>
              <Text style={[styles.successText, { color: themeColors.text }, textDirection]}>
                {copy.success}
              </Text>
              <AppButton
                label={copy.return}
                fullWidth
                size="lg"
                onPress={goBack}
              />
            </View>
          ) : (
            <View style={styles.form}>
              {errorMessage ? (
                <View
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  style={[
                    styles.statusBanner,
                    { backgroundColor: themeColors.errorSoft, borderColor: themeColors.error },
                    isRTL && styles.rowRTL,
                  ]}
                >
                  <AlertCircle color={themeColors.error} size={18} />
                  <Text style={[styles.statusText, { color: themeColors.error }, textDirection]}>
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }, textDirection]}>
                  {copy.email}
                </Text>
                <AppTextField
                  inputStyle={textDirection}
                  leftIcon={<Mail size={18} color={themeColors.textSecondary} />}
                  accessibilityLabel={copy.email}
                  placeholder={copy.emailPlaceholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!loading}
                  returnKeyType="send"
                  onSubmitEditing={() => void handleReset()}
                />
              </View>

              <AppButton
                label={copy.send}
                fullWidth
                size="lg"
                loading={loading}
                onPress={() => void handleReset()}
              />
            </View>
          )}
        </AppSurface>
      </ScrollView>
    </KeyboardAvoidingView>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  authCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: Radius.xl,
    boxShadow: Shadows.raised,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h1,
    textAlign: 'center',
    width: '100%',
  },
  subtitle: {
    ...Typography.body,
    marginTop: Spacing.sm,
    textAlign: 'center',
    width: '100%',
  },
  form: {
    gap: Spacing.lg,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    ...Typography.caption,
    fontWeight: '700',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusText: {
    ...Typography.small,
    flex: 1,
    fontWeight: '600',
  },
  successState: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    ...Typography.body,
    textAlign: 'center',
    width: '100%',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
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
