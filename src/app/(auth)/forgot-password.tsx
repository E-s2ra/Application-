import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  StyleSheet,
  TextInput,
  View,
  Pressable,
  Text,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import { useToast } from '@/hooks/useToast';
import { isValidEmail, normalizeEmail } from '@/lib/password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { resetPassword } = useAuth();
  const { isDesktop, isTablet } = useResponsive();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showError, showSuccess } = useToast();

  const handleReset = async () => {
    setErrorMessage(null);
    if (!email.trim()) {
      const msg = 'Please enter your email address.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    if (!isValidEmail(normalizeEmail(email))) {
      const msg = 'Enter a valid email address.';
      setErrorMessage(msg);
      showError(msg);
      return;
    }
    setLoading(true);
    try {
      const { error } = await resetPassword(normalizeEmail(email));
      if (error) {
        setErrorMessage(error);
        showError(error);
        setLoading(false);
        return;
      }

      setIsSuccess(true);
      showSuccess('Check your email to reset your password!');
    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred. Please try again.';
      setErrorMessage(msg);
      showError(msg);
    } finally {
      setLoading(false);
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
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))} style={styles.backBtn}>
            <ArrowLeft color="#fff" size={20} />
            <Text style={[styles.backText, { color: themeColors.textSecondary }]}>Back to Sign In</Text>
          </Pressable>

          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: themeColors.backgroundElement }]}>
              <ShieldCheck color={themeColors.primary} size={40} />
            </View>
            <Text style={[styles.title, { color: themeColors.text }]}>Reset Password</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
              Enter your AniFlix email to receive a secure recovery link.
            </Text>
          </View>

          {isSuccess ? (
            <View style={[styles.form, { alignItems: 'center', paddingVertical: 16 }]}>
              <Text style={{ color: '#4ade80', fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 16, lineHeight: 24 }}>
                Check your email to reset your password!
              </Text>
              <Pressable
                style={[styles.button, { backgroundColor: themeColors.primary, width: '100%' }]}
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
              >
                <Text style={styles.buttonText}>Return to Login</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              {errorMessage && (
                <View style={styles.errorContainer}>
                  <AlertCircle color="#ef4444" size={16} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <TextInput
                style={[styles.input, { backgroundColor: themeColors.backgroundElement, color: themeColors.text }]}
                placeholder="Your Account Email"
                placeholderTextColor={themeColors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                returnKeyType="send"
                onSubmitEditing={() => void handleReset()}
              />

              <Pressable
                style={[styles.button, { backgroundColor: themeColors.primary, opacity: loading ? 0.7 : 1 }]}
                onPress={handleReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </Pressable>
            </View>
          )}
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
    maxWidth: 440,
    padding: 32,
    borderRadius: 20,
    backgroundColor: 'rgba(18, 18, 26, 0.75)',
    borderWidth: 1,
    borderColor: '#242436',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#242436',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  form: {
    gap: 16,
  },
  input: {
    height: 52,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#242436',
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' && { outlineStyle: 'none' as any }),
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    gap: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    flex: 1,
  },
});
