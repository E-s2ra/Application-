import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  StyleSheet,
  TextInput,
  View,
  Pressable,
  Text,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { PrimaryGradient } from '@/components/PrimaryGradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation, useLanguage } from '@/hooks/use-language';
import { AlertCircle, Eye, EyeOff, Globe, Mail, Lock, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import { useToast } from '@/hooks/useToast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { t, isRTL } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const { signIn } = useAuth();
  const { isDesktop, isTablet } = useResponsive();
  const { showError, showSuccess } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const passwordInput = useRef<TextInput>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      const msg = isRTL ? 'تکایە ئیمەیڵ و تێپەڕەوشەکەت بنووسە.' : 'Please enter your email and password.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    setLoading(true);
    let formattedEmail = email.trim();
    const { error } = await signIn(formattedEmail, password);
    setLoading(false);
    if (error) {
      setErrorMessage(error);
      showError(error);
    } else {
      showSuccess('Welcome back to AniFlix');
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* 🔮 Ambient Background Glow Orbs */}
      <View style={[styles.glowOrbTop, { backgroundColor: themeColors.primary, opacity: 0.18 }]} pointerEvents="none" />
      <View style={[styles.glowOrbBottom, { backgroundColor: '#00D2FF', opacity: 0.12 }]} pointerEvents="none" />

      {/* 🌐 Top Bar: Language Switcher Pill */}
      <View style={[styles.topFloatingBar, { paddingTop: Math.max(insets.top + 6, 16) }]}>
        <Pressable
          onPress={toggleLanguage}
          accessibilityRole="button"
          accessibilityLabel={language === 'ku' ? 'Switch to English' : 'گۆڕین بۆ کوردی'}
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
                {t('signInToAccount', 'Sign in to continue watching your favorite movies & series')}
              </Text>
            </View>

            {/* Error Message Box */}
            {errorMessage && (
              <View style={[styles.errorBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
                <AlertCircle color="#EF4444" size={18} />
                <Text style={[styles.errorText, { color: '#EF4444' }]}>{errorMessage}</Text>
              </View>
            )}

            {/* 📝 Form Inputs */}
            <View style={styles.form}>
              {/* Email Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>
                  {t('email', 'Email Address or Username')}
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
                <View style={styles.passwordLabelRow}>
                  <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>
                    {t('password', 'Password')}
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(auth)/forgot-password')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.forgotText, { color: themeColors.primary }]}>
                      {t('forgotPassword', 'Forgot Password?')}
                    </Text>
                  </Pressable>
                </View>
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
                    returnKeyType="go"
                    onSubmitEditing={() => void handleLogin()}
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

              {/* Submit Button */}
              <Pressable
                style={[styles.button, { backgroundColor: themeColors.primary, opacity: loading ? 0.75 : 1 }]}
                onPress={handleLogin}
                disabled={loading}
              >
                <PrimaryGradient borderRadius={14} />
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>{t('signInBtn', 'Sign In')}</Text>
                )}
              </Pressable>
            </View>

            {/* Footer Register Prompt */}
            <View style={styles.footer}>
              <Text style={{ color: themeColors.textSecondary, fontSize: 14 }}>
                {t('dontHaveAccount', "Don't have an account?")}{' '}
              </Text>
              <Pressable onPress={() => router.push('/(auth)/signup')}>
                <Text style={{ color: themeColors.primary, fontWeight: '800', fontSize: 14 }}>
                  {t('createAccount', 'Sign Up')}
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
    alignItems: 'flex-end',
    zIndex: 20,
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
    marginBottom: 24,
  },
  logoContainer: {
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  brandLogoImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
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
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputWrapper: {
    height: 50,
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
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' as any }),
  },
  eyeButton: {
    paddingLeft: 10,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
  },
  button: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
  },
});
