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
import { ShieldCheck, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import { isValidEmail, normalizeEmail } from '@/lib/password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { resetPassword } = useAuth();
  const { isDesktop, isTablet } = useResponsive();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    if (!isValidEmail(normalizeEmail(email))) {
      Alert.alert('Check your email', 'Enter a valid email address.');
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(normalizeEmail(email));
    setLoading(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    Alert.alert(
      'Reset Link Sent',
      'If an AniFlix account uses this email, a secure password-reset link will arrive shortly. Check your inbox and spam folder.',
      [{ text: 'OK', onPress: () => (router.canGoBack() ? router.back() : router.replace('/(auth)/login')) }],
    );
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

          <View style={styles.form}>
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
});
