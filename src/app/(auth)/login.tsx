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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { LogIn, AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = Colors.dark;
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter your email and password.');
      return;
    }
    setLoading(true);
    let formattedEmail = email.trim();
    if (!formattedEmail.includes('@')) {
      formattedEmail = `${formattedEmail}@gmail.com`;
    }
    const { error } = await signIn(formattedEmail, password);
    setLoading(false);
    if (error) {
      setErrorMessage(error);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <LogIn color={themeColors.primary} size={48} />
        <Text style={[styles.title, { color: themeColors.text }]}>Anime Stream</Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>Login to watch premium anime</Text>
      </View>

      {errorMessage && (
        <View style={styles.errorBox}>
          <AlertCircle color="#ff4d4d" size={20} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <View style={styles.form}>
        <TextInput
          style={[styles.input, { backgroundColor: themeColors.backgroundElement, color: themeColors.text }]}
          placeholder="Email"
          placeholderTextColor={themeColors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            if (errorMessage) setErrorMessage(null);
          }}
          editable={!loading}
        />
        <TextInput
          style={[styles.input, { backgroundColor: themeColors.backgroundElement, color: themeColors.text }]}
          placeholder="Password"
          secureTextEntry
          placeholderTextColor={themeColors.textSecondary}
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            if (errorMessage) setErrorMessage(null);
          }}
          editable={!loading}
        />
        <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotBtn}>
          <Text style={[styles.forgotText, { color: themeColors.textSecondary }]}>Forgot Password?</Text>
        </Pressable>

        <Pressable
          style={[styles.button, { backgroundColor: themeColors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={{ color: themeColors.textSecondary }}>{"Don't have an account? "}</Text>
        <Pressable onPress={() => router.push('/(auth)/signup')}>
          <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>Sign Up</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
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
  form: {
    gap: 16,
  },
  input: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});
