import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  User,
  UserPlus,
} from 'lucide-react-native';
import { AppButton, AppIconButton, AppSurface, AppTextField } from '@/components/ui';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation, useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import { useToast } from '@/hooks/useToast';
import {
  isKnownDisposableEmail,
  isValidEmail,
  normalizeEmail,
  validatePassword,
} from '@/lib/password';

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { t, isRTL } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const { signUp } = useAuth();
  const { pagePad, isSmallDevice } = useResponsive({ desktopRailWidth: 0 });
  const { showError, showSuccess, showInfo } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const confirmPasswordInput = useRef<TextInput>(null);

  const localizePasswordError = (error: string) => {
    if (!isRTL) return error;
    if (error.includes('8 characters')) return 'تێپەڕەوشەکە دەبێت لانیکەم ٨ پیت بێت.';
    if (error.includes('number')) return 'تێپەڕەوشەکە دەبێت لانیکەم ژمارەیەکی تێدابێت.';
    if (error.includes('symbol')) return 'تێپەڕەوشەکە دەبێت لانیکەم هێمایەکی تێدابێت.';
    return error;
  };

  const handleSignUp = async () => {
    setErrorMessage(null);

    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      const msg = isRTL ? 'تکایە هەموو خانە پێویستەکان پڕبکەرەوە.' : 'Please fill in all required fields.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    if (password !== confirmPassword) {
      const msg = isRTL ? 'تێپەڕەوشەکان یەکسان نین.' : 'Passwords do not match.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    const formattedEmail = normalizeEmail(email);
    if (!isValidEmail(formattedEmail)) {
      const msg = isRTL ? 'ناونیشانی ئیمەیڵێکی دروست بنووسە.' : 'Enter a valid email address.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    if (isKnownDisposableEmail(formattedEmail)) {
      const msg = isRTL
        ? 'ئیمەیڵی کاتی بۆ دروستکردنی هەژمار ڕێگەپێدراو نییە.'
        : 'Disposable email addresses are not allowed.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      const msg = localizePasswordError(passwordError);
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    setLoading(true);
    const { error, needsEmailVerification } = await signUp(
      formattedEmail,
      password,
      fullName.trim(),
    );
    setLoading(false);

    if (error) {
      setErrorMessage(error);
      showError(error);
      return;
    }

    setFullName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setErrorMessage(null);

    if (needsEmailVerification) {
      setVerificationEmail(formattedEmail);
      showInfo(
        isRTL
          ? 'تکایە ئیمەیڵەکەت پشتڕاست بکەرەوە پاشان بچۆ ژوورەوە.'
          : 'Please verify your email address to log in.',
      );
      return;
    }

    showSuccess(isRTL ? 'هەژمارەکەت بە سەرکەوتوویی دروستکرا.' : 'Account created successfully');
    router.replace('/(tabs)');
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/login');
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
          },
          isRTL && styles.rowRTL,
        ]}
      >
        <AppIconButton
          variant="surface"
          accessibilityLabel={isRTL ? 'گەڕانەوە بۆ چوونەژوورەوە' : 'Back to sign in'}
          icon={
            isRTL
              ? <ArrowRight size={19} color={themeColors.text} />
              : <ArrowLeft size={19} color={themeColors.text} />
          }
          onPress={goBack}
        />
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
            paddingBottom: Math.max(insets.bottom + Spacing.xxl, 64),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={Spacing.xxl}
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
                {isRTL
                  ? 'هەژمارێکی خۆڕایی دروست بکە و دەست بە سەیرکردن بکە.'
                  : 'Create your free account and start watching.'}
              </Text>
            </View>

            {verificationEmail ? (
              <View style={styles.verificationState}>
                <View style={[styles.successIcon, { backgroundColor: themeColors.successSoft }]}>
                  <CheckCircle2 size={32} color={themeColors.success} />
                </View>
                <Text style={[styles.stateTitle, { color: themeColors.text }, fieldText]}>
                  {isRTL ? 'ئیمەیڵەکەت بپشکنە' : 'Check your email'}
                </Text>
                <Text style={[styles.stateBody, { color: themeColors.textSecondary }, fieldText]}>
                  {t(
                    'checkEmailVerification',
                    'Account created! Please check your email inbox to verify your account.',
                  )}
                </Text>
                <Text
                  selectable
                  style={[styles.verificationEmail, { color: themeColors.primary }, fieldText]}
                >
                  {verificationEmail}
                </Text>
                <AppButton
                  fullWidth
                  size="lg"
                  label={t('signInBtn', 'Sign In')}
                  onPress={() => router.replace('/(auth)/login')}
                />
              </View>
            ) : (
              <>
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
                    <AlertCircle size={18} color={themeColors.error} />
                    <Text style={[styles.statusText, { color: themeColors.error }, fieldText]}>
                      {errorMessage}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.form}>
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }, fieldText]}>
                      {t('fullName', 'Full Name')}
                    </Text>
                    <AppTextField
                      inputStyle={fieldText}
                      leftIcon={<User size={18} color={themeColors.textSecondary} />}
                      accessibilityLabel={t('fullName', 'Full Name')}
                      placeholder={isRTL ? 'ناوی تەواو' : 'Your full name'}
                      autoCapitalize="words"
                      autoComplete="name"
                      textContentType="name"
                      value={fullName}
                      onChangeText={(value) => {
                        setFullName(value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      editable={!loading}
                      returnKeyType="next"
                      onSubmitEditing={() => emailInput.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }, fieldText]}>
                      {t('email', 'Email Address')}
                    </Text>
                    <AppTextField
                      ref={emailInput}
                      inputStyle={fieldText}
                      leftIcon={<Mail size={18} color={themeColors.textSecondary} />}
                      accessibilityLabel={t('email', 'Email Address')}
                      placeholder="name@example.com"
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
                      returnKeyType="next"
                      onSubmitEditing={() => passwordInput.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }, fieldText]}>
                      {t('password', 'Password')}
                    </Text>
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
                      autoComplete="new-password"
                      textContentType="newPassword"
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      editable={!loading}
                      returnKeyType="next"
                      onSubmitEditing={() => confirmPasswordInput.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>

                  {password.length > 0 ? <PasswordStrengthIndicator password={password} /> : null}

                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }, fieldText]}>
                      {t('confirmPassword', 'Confirm Password')}
                    </Text>
                    <AppTextField
                      ref={confirmPasswordInput}
                      inputStyle={fieldText}
                      leftIcon={<Lock size={18} color={themeColors.textSecondary} />}
                      rightIcon={
                        showConfirmPassword
                          ? <EyeOff size={19} color={themeColors.textSecondary} />
                          : <Eye size={19} color={themeColors.textSecondary} />
                      }
                      onRightIconPress={() => setShowConfirmPassword((value) => !value)}
                      rightIconLabel={
                        showConfirmPassword
                          ? (isRTL ? 'شاردنەوەی دووبارەکردنەوەی تێپەڕەوشە' : 'Hide password confirmation')
                          : (isRTL ? 'نیشاندانی دووبارەکردنەوەی تێپەڕەوشە' : 'Show password confirmation')
                      }
                      accessibilityLabel={t('confirmPassword', 'Confirm Password')}
                      placeholder="••••••••"
                      secureTextEntry={!showConfirmPassword}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      value={confirmPassword}
                      onChangeText={(value) => {
                        setConfirmPassword(value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      editable={!loading}
                      returnKeyType="go"
                      onSubmitEditing={() => void handleSignUp()}
                    />
                  </View>

                  <AppButton
                    fullWidth
                    size="lg"
                    label={t('createAccount', 'Create Account')}
                    loading={loading}
                    onPress={() => void handleSignUp()}
                    leftIcon={<UserPlus size={18} color={themeColors.buttonText} />}
                    style={styles.submitButton}
                  />
                </View>

                <View style={[styles.footer, isRTL && styles.rowRTL]}>
                  <Text style={[styles.footerText, { color: themeColors.textSecondary }, fieldText]}>
                    {isRTL ? 'هەژمارت هەیە؟' : 'Already have an account?'}
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(auth)/login')}
                    accessibilityRole="button"
                    accessibilityLabel={t('signInBtn', 'Sign In')}
                    hitSlop={6}
                    style={styles.textAction}
                  >
                    <Text style={[styles.footerLink, { color: themeColors.primary }, fieldText]}>
                      {t('signInBtn', 'Sign In')}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.legalBlock}>
                  <Text style={[styles.legalText, { color: themeColors.textSecondary }, fieldText]}>
                    {isRTL
                      ? 'بە دروستکردنی هەژمار، تۆ ڕەزامەندی دەدەیت لەسەر ئەم بەڵگە یاساییانە:'
                      : 'By creating an account, you agree to:'}
                  </Text>
                  <View style={[styles.legalLinks, isRTL && styles.rowRTL]}>
                    <Pressable
                      onPress={() => router.push('/legal/terms-of-service' as never)}
                      accessibilityRole="link"
                      accessibilityLabel={isRTL ? 'مەرجەکانی بەکارهێنان' : 'Terms of Service'}
                      style={styles.textAction}
                    >
                      <Text style={[styles.legalLink, { color: themeColors.primary }, fieldText]}>
                        {isRTL ? 'مەرجەکانی بەکارهێنان' : 'Terms of Service'}
                      </Text>
                    </Pressable>
                    <Text style={[styles.legalDivider, { color: themeColors.textMuted }]}>•</Text>
                    <Pressable
                      onPress={() => router.push('/legal/privacy-policy' as never)}
                      accessibilityRole="link"
                      accessibilityLabel={isRTL ? 'یاسای تایبەتمەندی' : 'Privacy Policy'}
                      style={styles.textAction}
                    >
                      <Text style={[styles.legalLink, { color: themeColors.primary }, fieldText]}>
                        {isRTL ? 'یاسای تایبەتمەندی' : 'Privacy Policy'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </>
            )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginBottom: Spacing.sm,
  },
  brandLogoImage: {
    width: 48,
    height: 48,
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
  textAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  legalBlock: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  legalText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  legalLink: {
    ...Typography.caption,
    fontWeight: '700',
  },
  legalDivider: {
    ...Typography.caption,
  },
  verificationState: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    ...Typography.h2,
    width: '100%',
    textAlign: 'center',
  },
  stateBody: {
    ...Typography.body,
    width: '100%',
    textAlign: 'center',
  },
  verificationEmail: {
    ...Typography.bodyBold,
    width: '100%',
    textAlign: 'center',
    marginBottom: Spacing.sm,
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
