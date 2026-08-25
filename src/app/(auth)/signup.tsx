import { useTheme } from '@/hooks/use-theme';
import { useTranslation, useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import { useRouter } from 'expo-router';
import { AlertCircle, CheckCircle, Eye, EyeOff, Globe } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PrimaryGradient } from '@/components/PrimaryGradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isKnownDisposableEmail, isValidEmail, normalizeEmail, PASSWORD_REQUIREMENTS, validatePassword } from '@/lib/password';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { t, isRTL } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const { signUp } = useAuth();
  const { isDesktop, isTablet } = useResponsive();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);
  const confirmPasswordInput = useRef<TextInput>(null);

  const handleSignUp = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    const formattedEmail = normalizeEmail(email);
    if (!isValidEmail(formattedEmail)) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    if (isKnownDisposableEmail(formattedEmail)) {
      setErrorMessage('Disposable email addresses are not allowed. Use a regular email provider.');
      return;
    }

    // Validate password strength for all users equally - no bypasses allowed
    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    setLoading(true);
    const { error, needsEmailVerification } = await signUp(formattedEmail, password, fullName.trim());
    setLoading(false);

    if (error) {
      setErrorMessage(error);
      return;
    }

    if (needsEmailVerification) {
      setInfoMessage(t('checkEmailVerification', 'Account created! Please check your email inbox to verify your account before logging in.'));
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          (isDesktop || isTablet) && styles.scrollCentered,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={[styles.authCard, (isDesktop || isTablet) && styles.authCardDesktop]}>
          {/* ðŸŒ Top Right Language Switcher on First Screen */}
          <View style={{ width: '100%', alignItems: 'flex-end', marginBottom: 12 }}>
            <Pressable
              onPress={toggleLanguage}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: themeColors.backgroundElement,
                borderColor: '#00D2FF',
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >
              <Globe size={14} color="#00D2FF" />
              <Text style={{ color: '#00D2FF', fontSize: 12, fontWeight: '700' }}>
                {language === 'ku' ? 'Ú©ÙˆØ±Ø¯ÛŒ (Ø³Û†Ø±Ø§Ù†ÛŒ)' : 'English (EN)'}
              </Text>
            </Pressable>
          </View>
          
          <View style={styles.header}>
            <Image
              source={require('../../../assets/images/icon.png')}
              style={styles.brandLogoImage}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>
              ANI<Text style={{ color: themeColors.primary }}>FLIX</Text>
            </Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
              {t('createFreeAccount', 'Create your free account & start streaming')}
            </Text>
          </View>

          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle color="#ff4d4d" size={20} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {infoMessage && (
            <View style={styles.infoBox}>
              <CheckCircle color="#4BB543" size={20} />
              <Text style={styles.infoText}>{infoMessage}</Text>
            </View>
          )}

          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.backgroundElement, color: themeColors.text }, isRTL && { textAlign: 'right' }]}
              placeholder={t('fullName', 'Full Name')}
              placeholderTextColor={themeColors.textSecondary}
              value={fullName}
              onChangeText={setFullName}
              editable={!loading}
              returnKeyType="next"
              onSubmitEditing={() => emailInput.current?.focus()}
            />
            <TextInput
              ref={emailInput}
              style={[styles.input, { backgroundColor: themeColors.backgroundElement, color: themeColors.text }, isRTL && { textAlign: 'right' }]}
              placeholder={t('email', 'Email address')}
              placeholderTextColor={themeColors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              returnKeyType="next"
              onSubmitEditing={() => passwordInput.current?.focus()}
            />
            <View style={[styles.passwordWrapper, { backgroundColor: themeColors.backgroundElement }]}>
              <TextInput
                ref={passwordInput}
                style={[styles.passwordInput, { color: themeColors.text }, isRTL && { textAlign: 'right' }]}
                placeholder={`${t('password', 'Password')} (5+ chars, number, symbol)`}
                secureTextEntry={!showPassword}
                placeholderTextColor={themeColors.textSecondary}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordInput.current?.focus()}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={20} color={themeColors.textSecondary} />
                ) : (
                  <Eye size={20} color={themeColors.textSecondary} />
                )}
              </Pressable>
            </View>

            {/* ðŸŒ¸ Cute Password Strength & Condition Checklist */}
            <PasswordStrengthIndicator password={password} />
            <View style={[styles.passwordWrapper, { backgroundColor: themeColors.backgroundElement }]}>
              <TextInput
                ref={confirmPasswordInput}
                style={[styles.passwordInput, { color: themeColors.text }, isRTL && { textAlign: 'right' }]}
                placeholder={t('confirmPassword', 'Confirm Password')}
                secureTextEntry={!showConfirmPassword}
                placeholderTextColor={themeColors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
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
                  <EyeOff size={20} color={themeColors.textSecondary} />
                ) : (
                  <Eye size={20} color={themeColors.textSecondary} />
                )}
              </Pressable>
            </View>

            <Pressable
              style={[styles.button, { backgroundColor: themeColors.primary, opacity: loading ? 0.7 : 1, overflow: 'hidden' }]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <PrimaryGradient borderRadius={12} />
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t('signUpBtn', 'Create AniFlix Account')}</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={{ color: themeColors.textSecondary }}>{t('alreadyHaveAccount', 'Already have an account?')}{' '}</Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>{t('signInBtn', 'Sign In')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  scrollCentered: {
    alignItems: 'center',
  },
  authCard: {
    width: '100%',
  },
  authCardDesktop: {
    maxWidth: 480,
    padding: 32,
    borderRadius: 20,
    backgroundColor: 'rgba(18, 18, 26, 0.75)',
    borderWidth: 1,
    borderColor: '#242436',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandLogoImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#381010',
    borderColor: '#ff4d4d',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#ff9999',
    fontSize: 14,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d3315',
    borderColor: '#4BB543',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    color: '#a3f0b0',
    fontSize: 14,
    flex: 1,
  },
  form: {
    gap: 14,
  },
  input: {
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#242436',
  },
  passwordWrapper: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#242436',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 15,
  },
  eyeButton: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordHint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: -6,
  },
  button: {
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});
