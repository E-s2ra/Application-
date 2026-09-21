import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCw,
} from 'lucide-react-native';
import { AppButton, AppIconButton, AppSurface, AppTextField } from '@/components/ui';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import { validatePassword } from '@/lib/password';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { language, isRTL } = useLanguage();
  const { session, updatePassword } = useAuth();
  const { pagePad, isSmallDevice } = useResponsive({ desktopRailWidth: 0 });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const confirmationInput = useRef<TextInput>(null);

  const copy = language === 'ku'
    ? {
        back: 'گەڕانەوە بۆ چوونەژوورەوە',
        title: 'تێپەڕەوشەی نوێ دابنێ',
        subtitle: 'تێپەڕەوشەی نوێت لە خوارەوە بنووسە.',
        invalidLink: 'ئەم بەستەری گەڕاندنەوەیە دروست نییە یان بەسەرچووە. تکایە بەستەرێکی نوێ داوابکە.',
        openInApp: 'بەستەری گۆڕینی تێپەڕەوشە لە ئیمەیڵەکەتەوە لە AniFlix بکەرەوە.',
        requestLink: 'داواکردنی بەستەری نوێ',
        password: 'تێپەڕەوشەی نوێ',
        confirm: 'دووبارەکردنەوەی تێپەڕەوشە',
        mismatch: 'تێپەڕەوشەکان یەکسان نین.',
        update: 'نوێکردنەوەی تێپەڕەوشە',
        success: 'تێپەڕەوشەکەت بە سەرکەوتوویی نوێکرایەوە. گەڕاندنەوەت بۆ ئەپەکە.',
        showPassword: 'نیشاندانی تێپەڕەوشە',
        hidePassword: 'شاردنەوەی تێپەڕەوشە',
        showConfirm: 'نیشاندانی دووبارەکردنەوەی تێپەڕەوشە',
        hideConfirm: 'شاردنەوەی دووبارەکردنەوەی تێپەڕەوشە',
      }
    : {
        back: 'Back to sign in',
        title: 'Choose a new password',
        subtitle: 'Enter your new password below.',
        invalidLink: 'This reset link is invalid or expired. Please request a new reset link.',
        openInApp: 'Open the password reset link from your email in AniFlix to continue.',
        requestLink: 'Request new reset link',
        password: 'New password',
        confirm: 'Confirm new password',
        mismatch: 'Passwords do not match.',
        update: 'Update password',
        success: 'Password updated successfully. Returning you to the app.',
        showPassword: 'Show password',
        hidePassword: 'Hide password',
        showConfirm: 'Show password confirmation',
        hideConfirm: 'Hide password confirmation',
      };

  useEffect(() => {
    if (!isSuccess) return;
    const timeout = setTimeout(() => router.replace('/(tabs)'), 1200);
    return () => clearTimeout(timeout);
  }, [isSuccess, router]);

  const localizePasswordError = (error: string) => {
    if (!isRTL) return error;
    if (error.includes('8 characters')) return 'تێپەڕەوشەکە دەبێت لانیکەم ٨ پیت بێت.';
    if (error.includes('number')) return 'تێپەڕەوشەکە دەبێت لانیکەم ژمارەیەکی تێدابێت.';
    if (error.includes('symbol')) return 'تێپەڕەوشەکە دەبێت لانیکەم هێمایەکی تێدابێت.';
    return error;
  };

  const submit = async () => {
    setMessage(null);
    const validationError = validatePassword(password);
    if (validationError) {
      setMessage(localizePasswordError(validationError));
      return;
    }
    if (password !== confirmPassword) {
      setMessage(copy.mismatch);
      return;
    }
    if (!session) {
      setMessage(copy.invalidLink);
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      setMessage(error);
      return;
    }

    setIsSuccess(true);
    setMessage(copy.success);
    setPassword('');
    setConfirmPassword('');
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/login');
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
          style={styles.card}
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
            <View style={[styles.icon, { backgroundColor: themeColors.primarySoft }]}>
              <KeyRound color={themeColors.primary} size={34} />
            </View>
            <Text style={[styles.title, { color: themeColors.text }, textDirection]}>
              {copy.title}
            </Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }, textDirection]}>
              {copy.subtitle}
            </Text>
          </View>

          {!session && !isSuccess ? (
            <View
              accessibilityRole="alert"
              style={[
                styles.recoveryBox,
                { backgroundColor: themeColors.warningSoft, borderColor: themeColors.warning },
              ]}
            >
              <Text style={[styles.recoveryWarning, { color: themeColors.warning }, textDirection]}>
                {copy.openInApp}
              </Text>
              <AppButton
                variant="secondary"
                label={copy.requestLink}
                fullWidth
                leftIcon={<RefreshCw color={themeColors.primary} size={17} />}
                onPress={() => router.push('/(auth)/forgot-password')}
              />
            </View>
          ) : null}

          {message ? (
            <View
              accessibilityRole={isSuccess ? undefined : 'alert'}
              accessibilityLiveRegion="polite"
              style={[
                styles.message,
                {
                  backgroundColor: isSuccess ? themeColors.successSoft : themeColors.errorSoft,
                  borderColor: isSuccess ? themeColors.success : themeColors.error,
                },
                isRTL && styles.rowRTL,
              ]}
            >
              {isSuccess
                ? <CheckCircle2 color={themeColors.success} size={18} />
                : <AlertCircle color={themeColors.error} size={18} />}
              <Text
                style={[
                  styles.messageText,
                  { color: isSuccess ? themeColors.success : themeColors.error },
                  textDirection,
                ]}
              >
                {message}
              </Text>
            </View>
          ) : null}

          {!isSuccess ? (
            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }, textDirection]}>
                  {copy.password}
                </Text>
                <AppTextField
                  inputStyle={textDirection}
                  leftIcon={<Lock size={18} color={themeColors.textSecondary} />}
                  rightIcon={
                    showPassword
                      ? <EyeOff color={themeColors.textSecondary} size={19} />
                      : <Eye color={themeColors.textSecondary} size={19} />
                  }
                  onRightIconPress={() => setShowPassword((value) => !value)}
                  rightIconLabel={showPassword ? copy.hidePassword : copy.showPassword}
                  accessibilityLabel={copy.password}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (message) setMessage(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  editable={!loading && Boolean(session)}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmationInput.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              {password.length > 0 ? <PasswordStrengthIndicator password={password} /> : null}

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }, textDirection]}>
                  {copy.confirm}
                </Text>
                <AppTextField
                  ref={confirmationInput}
                  inputStyle={textDirection}
                  leftIcon={<Lock size={18} color={themeColors.textSecondary} />}
                  rightIcon={
                    showConfirmPassword
                      ? <EyeOff color={themeColors.textSecondary} size={19} />
                      : <Eye color={themeColors.textSecondary} size={19} />
                  }
                  onRightIconPress={() => setShowConfirmPassword((value) => !value)}
                  rightIconLabel={showConfirmPassword ? copy.hideConfirm : copy.showConfirm}
                  accessibilityLabel={copy.confirm}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    if (message) setMessage(null);
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  editable={!loading && Boolean(session)}
                  returnKeyType="go"
                  onSubmitEditing={() => void submit()}
                />
              </View>

              <AppButton
                label={copy.update}
                fullWidth
                size="lg"
                loading={loading}
                disabled={!session}
                onPress={() => void submit()}
              />
            </View>
          ) : null}
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
  card: {
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
  icon: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h1,
    width: '100%',
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    width: '100%',
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  recoveryBox: {
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  recoveryWarning: {
    ...Typography.small,
    textAlign: 'center',
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  messageText: {
    ...Typography.small,
    flex: 1,
    fontWeight: '600',
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
