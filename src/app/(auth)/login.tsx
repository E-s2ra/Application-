import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Eye, EyeOff, Globe, Lock, LogIn, Mail } from 'lucide-react-native';
import { AppButton, AppSurface, AppTextField } from '@/components/ui';
import { Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation, useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import { useToast } from '@/hooks/useToast';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { t, isRTL } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const { signIn } = useAuth();
  const { pagePad, isSmallDevice } = useResponsive({ desktopRailWidth: 0 });
  const { showError, showSuccess } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const passwordInput = useRef<TextInput>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      const msg = isRTL
        ? 'تکایە ئیمەیڵ و تێپەڕەوشەکەت بنووسە.'
        : 'Please enter your email and password.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);

    if (error) {
      setErrorMessage(error);
      showError(error);
      return;
    }

    showSuccess(isRTL ? 'بەخێربێیتەوە بۆ AniFlix' : 'Welcome back to AniFlix');
    setEmail('');
    setPassword('');
    router.replace('/(tabs)');
  };

  const fieldText = isRTL ? styles.rtlText : styles.ltrText;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View
        style={[styles.glowOrbTop, { backgroundColor: themeColors.primary, opacity: themeColors.mode === 'dark' ? 0.14 : 0.08, pointerEvents: 'none' }]}
      />
      <View
        style={[styles.glowOrbBottom, { backgroundColor: themeColors.primary, opacity: themeColors.mode === 'dark' ? 0.09 : 0.05, pointerEvents: 'none' }]}
      />

      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top + Spacing.sm, Spacing.lg),
            paddingHorizontal: pagePad,
            alignItems: isRTL ? 'flex-start' : 'flex-end',
          },
        ]}
      >
        <AppButton
          variant="secondary"
          size="md"
          label={language === 'ku' ? 'کوردی (سۆرانی)' : 'English (EN)'}
          accessibilityLabel={language === 'ku' ? 'Switch to English' : 'گۆڕین بۆ کوردی'}
          leftIcon={<Globe size={16} color={themeColors.primary} />}
          onPress={toggleLanguage}
        />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: pagePad,
            paddingTop: Math.max(insets.top + 64, 72),
            paddingBottom: Math.max(insets.bottom + Spacing.xl, Spacing.xxl),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={Spacing.xl}
      >
        <View style={styles.centerWrapper}>
          <AppSurface
            variant="raised"
            padding={isSmallDevice ? 'lg' : 'xl'}
            style={styles.authCard}
          >
            <View style={styles.header}>
              <View
                style={[
                  styles.logoContainer,
                  {
                    backgroundColor: themeColors.backgroundElement,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <Image
                  source={require('../../../assets/images/icon.png')}
                  style={styles.brandLogoImage}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              </View>
              <Text style={[styles.brandTitle, { color: themeColors.text }]}>
                ANI<Text style={{ color: themeColors.primary }}>FLIX</Text>
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: themeColors.textSecondary },
                  isRTL && styles.rtlText,
                ]}
              >
                {t('signInToAccount', 'Sign in to continue watching your favorite movies & series')}
              </Text>
            </View>

            {errorMessage ? (
              <View
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={[
                  styles.statusBanner,
                  {
                    backgroundColor: themeColors.errorSoft,
                    borderColor: themeColors.error,
                  },
                  isRTL && styles.rowRTL,
                ]}
              >
                <AlertCircle color={themeColors.error} size={18} />
                <Text style={[styles.statusText, { color: themeColors.error }, fieldText]}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }, fieldText]}>
                  {t('email', 'Email Address or Username')}
                </Text>
                <AppTextField
                  inputStyle={fieldText}
                  leftIcon={<Mail size={18} color={themeColors.textSecondary} />}
                  accessibilityLabel={t('email', 'Email Address or Username')}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!loading}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInput.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.fieldGroup}>
                <View style={[styles.passwordLabelRow, isRTL && styles.rowRTL]}>
                  <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }, fieldText]}>
                    {t('password', 'Password')}
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(auth)/forgot-password')}
                    accessibilityRole="button"
                    accessibilityLabel={t('forgotPassword', 'Forgot Password?')}
                    hitSlop={6}
                    style={styles.textAction}
                  >
                    <Text style={[styles.textActionLabel, { color: themeColors.primary }, fieldText]}>
                      {t('forgotPassword', 'Forgot Password?')}
                    </Text>
                  </Pressable>
                </View>
                <AppTextField
                  ref={passwordInput}
                  inputStyle={fieldText}
                  leftIcon={<Lock size={18} color={themeColors.textSecondary} />}
                  rightIcon={
                    showPassword
                      ? <EyeOff size={19} color={themeColors.textSecondary} />
                      : <Eye size={19} color={themeColors.textSecondary} />
                  }
                  onRightIconPress={() => setShowPassword((value) => !value)}
                  rightIconLabel={
                    showPassword
                      ? (isRTL ? 'شاردنەوەی تێپەڕەوشە' : 'Hide password')
                      : (isRTL ? 'نیشاندانی تێپەڕەوشە' : 'Show password')
                  }
                  accessibilityLabel={t('password', 'Password')}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  textContentType="password"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  editable={!loading}
                  returnKeyType="go"
                  onSubmitEditing={() => void handleLogin()}
                />
              </View>

              <AppButton
                label={t('signInBtn', 'Sign In')}
                onPress={() => void handleLogin()}
                loading={loading}
                fullWidth
                size="lg"
                leftIcon={<LogIn size={18} color={themeColors.buttonText} />}
                style={styles.submitButton}
              />
            </View>

            <View style={[styles.footer, isRTL && styles.rowRTL]}>
              <Text style={[styles.footerText, { color: themeColors.textSecondary }, fieldText]}>
                {isRTL ? 'هەژمارت نییە؟' : "Don't have an account?"}
              </Text>
              <Pressable
                onPress={() => router.push('/(auth)/signup')}
                accessibilityRole="button"
                accessibilityLabel={t('createAccount', 'Create Account')}
                hitSlop={6}
                style={styles.textAction}
              >
                <Text style={[styles.footerLink, { color: themeColors.primary }, fieldText]}>
                  {t('createAccount', 'Create Account')}
                </Text>
              </Pressable>
            </View>
          </AppSurface>
        </View>
      </KeyboardAwareScrollView>
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
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  authCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: Radius.xl,
    boxShadow: Shadows.raised,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.md,
  },
  brandLogoImage: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
  },
  brandTitle: {
    ...Typography.h1,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    ...Typography.small,
    marginTop: Spacing.sm,
    textAlign: 'center',
    maxWidth: 300,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  statusText: {
    ...Typography.small,
    fontWeight: '600',
    flex: 1,
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
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  textAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  textActionLabel: {
    ...Typography.caption,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
  },
  footerText: {
    ...Typography.small,
  },
  footerLink: {
    ...Typography.small,
    fontWeight: '800',
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
