import { useTheme } from '@/hooks/use-theme';
import { useTranslation, useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import { useRouter } from 'expo-router';
import { AlertCircle, Eye, EyeOff, Globe, ArrowLeft, User, Mail, Lock } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { PrimaryGradient } from '@/components/PrimaryGradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isKnownDisposableEmail, isValidEmail, normalizeEmail, validatePassword } from '@/lib/password';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { useToast } from '@/hooks/useToast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { t, isRTL } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const { signUp } = useAuth();
  const { isDesktop, isTablet } = useResponsive();
  const { showError, showSuccess, showInfo } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const confirmPasswordInput = useRef<TextInput>(null);

  const handleSignUp = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      const msg = 'Please fill in all required fields.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    if (password !== confirmPassword) {
      const msg = 'Passwords do not match.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    const formattedEmail = normalizeEmail(email);
    if (!isValidEmail(formattedEmail)) {
      const msg = 'Enter a valid email address.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    if (isKnownDisposableEmail(formattedEmail)) {
      const msg = 'Disposable email addresses are not allowed.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      showError(passwordError);
      return;
    }

    setLoading(true);
    const { error, needsEmailVerification } = await signUp(formattedEmail, password, fullName.trim());
    setLoading(false);

    if (error) {
      setErrorMessage(error);
      showError(error);
      return;
    }

    if (needsEmailVerification) {
      const msg = t('checkEmailVerification', 'Account created! Please check your email inbox to verify your account.');
      setInfoMessage(msg);
      showInfo('Please verify your email address to log in.');
    } else {
      showSuccess('Account created successfully');
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* 🔮 Ambient Background Glow Orbs */}
      <View style={[styles.glowOrbTop, { backgroundColor: themeColors.primary, opacity: 0.18 }]} pointerEvents="none" />
      <View style={[styles.glowOrbBottom, { backgroundColor: '#00D2FF', opacity: 0.12 }]} pointerEvents="none" />

      {/* 🌐 Top Floating Bar: Back Button & Language Switcher */}
      <View style={[styles.topFloatingBar, { paddingTop: Math.max(insets.top + 6, 16) }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
          style={[
            styles.backBtn,
            { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back to Login"
        >
          <ArrowLeft color={themeColors.text} size={18} />
        </Pressable>

        <Pressable
          onPress={toggleLanguage}
          style={[
            styles.langPill,
            { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border },
          ]}
        >
          <Globe size={14} color={themeColors.primary} />
          <Text style={[styles.langText, { color: themeColors.text }]}>
            {language === 'ku' ? 'کوردی (سۆرانی)' : 'English (EN)'}
          </Text>
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + 50, 60) },
        ]}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
        <View style={styles.centerWrapper}>
          <View
            style={[
              styles.authCard,
              {
                backgroundColor: themeColors.backgroundCard,
                borderColor: themeColors.border,
                maxWidth: Math.min(SCREEN_WIDTH - 32, 440),
              },
            ]}
          >
            {/* 🎬 Brand Header */}
            <View style={styles.header}>
              <View style={[styles.logoContainer, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}>
                <Image
                  source={require('../../../assets/images/icon.png')}
                  style={styles.brandLogoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.brandTitle, { color: themeColors.text }]}>
                ANI<Text style={{ color: themeColors.primary }}>FLIX</Text>
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                {t('createAccountSubtitle', 'Create your free account to unlock high definition streaming')}
              </Text>
            </View>

            {/* Error / Info Banners */}
            {errorMessage && (
              <View style={[styles.errorBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
                <AlertCircle color="#EF4444" size={18} />
                <Text style={[styles.errorText, { color: '#EF4444' }]}>{errorMessage}</Text>
              </View>
            )}

            {infoMessage && (
              <View style={[styles.errorBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10B981' }]}>
                <Text style={[styles.errorText, { color: '#10B981' }]}>{infoMessage}</Text>
              </View>
            )}

            {/* 📝 Input Form */}
            <View style={styles.form}>
              {/* Full Name Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>
                  {t('fullName', 'Full Name')}
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: themeColors.backgroundElement,
                      borderColor: nameFocused ? themeColors.primary : themeColors.border,
                    },
                  ]}
                >
                  <User size={18} color={nameFocused ? themeColors.primary : themeColors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: themeColors.text }, isRTL && { textAlign: 'right' }]}
                    placeholder="John Doe"
                    placeholderTextColor={themeColors.textSecondary}
                    autoCapitalize="words"
                    value={fullName}
                    onChangeText={(val) => {
                      setFullName(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    editable={!loading}
                    returnKeyType="next"
                    onSubmitEditing={() => emailInput.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>
              </View>

              {/* Email Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>
                  {t('email', 'Email Address')}
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: themeColors.backgroundElement,
                      borderColor: emailFocused ? themeColors.primary : themeColors.border,
                    },
                  ]}
                >
                  <Mail size={18} color={emailFocused ? themeColors.primary : themeColors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    ref={emailInput}
                    style={[styles.input, { color: themeColors.text }, isRTL && { textAlign: 'right' }]}
                    placeholder="name@example.com"
                    placeholderTextColor={themeColors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    editable={!loading}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInput.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>
                  {t('password', 'Password')}
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: themeColors.backgroundElement,
                      borderColor: passwordFocused ? themeColors.primary : themeColors.border,
                    },
                  ]}
                >
                  <Lock size={18} color={passwordFocused ? themeColors.primary : themeColors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    ref={passwordInput}
                    style={[styles.input, { color: themeColors.text }, isRTL && { textAlign: 'right' }]}
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    placeholderTextColor={themeColors.textSecondary}
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    editable={!loading}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordInput.current?.focus()}
                    blurOnSubmit={false}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={themeColors.textSecondary} />
                    ) : (
                      <Eye size={18} color={themeColors.textSecondary} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Password Strength Meter */}
              {password.length > 0 && <PasswordStrengthIndicator password={password} />}

              {/* Confirm Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>
                  {t('confirmPassword', 'Confirm Password')}
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: themeColors.backgroundElement,
                      borderColor: confirmPasswordFocused ? themeColors.primary : themeColors.border,
                    },
                  ]}
                >
                  <Lock size={18} color={confirmPasswordFocused ? themeColors.primary : themeColors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    ref={confirmPasswordInput}
                    style={[styles.input, { color: themeColors.text }, isRTL && { textAlign: 'right' }]}
                    placeholder="••••••••"
                    secureTextEntry={!showConfirmPassword}
                    placeholderTextColor={themeColors.textSecondary}
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onFocus={() => setConfirmPasswordFocused(true)}
                    onBlur={() => setConfirmPasswordFocused(false)}
                    editable={!loading}
                    returnKeyType="go"
                    onSubmitEditing={() => void handleSignUp()}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} color={themeColors.textSecondary} />
                    ) : (
                      <Eye size={18} color={themeColors.textSecondary} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                style={[styles.button, { backgroundColor: themeColors.primary, opacity: loading ? 0.75 : 1 }]}
                onPress={handleSignUp}
                disabled={loading}
              >
                <PrimaryGradient borderRadius={14} />
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>{t('createAccountBtn', 'Create Account')}</Text>
                )}
              </Pressable>
            </View>

            {/* Footer Login Prompt */}
            <View style={styles.footer}>
              <Text style={{ color: themeColors.textSecondary, fontSize: 14 }}>
                {t('alreadyHaveAccount', 'Already have an account?')}{' '}
              </Text>
              <Pressable onPress={() => router.push('/(auth)/login')}>
                <Text style={{ color: themeColors.primary, fontWeight: '800', fontSize: 14 }}>
                  {t('signInBtn', 'Sign In')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  glowOrbTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  topFloatingBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  centerWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  authCard: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  brandLogoImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  form: {
    gap: 14,
  },
  fieldGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  inputWrapper: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '600',
  },
  eyeButton: {
    paddingLeft: 10,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
});
