import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, Eye, EyeOff, KeyRound } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { PASSWORD_REQUIREMENTS, validatePassword } from '@/lib/password';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = Colors.dark;
  const { session, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const confirmationInput = useRef<TextInput>(null);

  const submit = async () => {
    setMessage(null);
    const validationError = validatePassword(password);
    if (validationError) return setMessage(validationError);
    if (password !== confirmPassword) return setMessage('Passwords do not match.');
    if (!session) return setMessage('This reset link is invalid or expired. Request a new reset link.');

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) return setMessage('This reset link is invalid or expired. Request a new reset link.');

    setMessage('Password updated. You can now sign in with your new password.');
    setPassword('');
    setConfirmPassword('');
    setTimeout(() => router.replace('/(tabs)'), 900);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentInsetAdjustmentBehavior="automatic">
        <View style={styles.card}>
          <View style={[styles.icon, { backgroundColor: themeColors.backgroundElement }]}><KeyRound color={themeColors.primary} size={36} /></View>
          <Text style={[styles.title, { color: themeColors.text }]}>Choose a new password</Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>Use a password with {PASSWORD_REQUIREMENTS.join(', ')}.</Text>
          {!session && <Text style={styles.recoveryWarning}>Open the reset link from your email in the AniFlix app to continue.</Text>}
          {message && <View style={styles.message}><CheckCircle color={message.startsWith('Password updated') ? '#00E676' : '#FF8A80'} size={18} /><Text style={styles.messageText}>{message}</Text></View>}
          <View style={styles.passwordWrap}>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholder="New password" placeholderTextColor="#77778C" editable={!loading} returnKeyType="next" onSubmitEditing={() => confirmationInput.current?.focus()} />
            <Pressable style={styles.eye} onPress={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff color="#A0A0B8" size={20} /> : <Eye color="#A0A0B8" size={20} />}</Pressable>
          </View>
          <TextInput ref={confirmationInput} style={styles.confirmInput} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} placeholder="Confirm new password" placeholderTextColor="#77778C" editable={!loading} returnKeyType="go" onSubmitEditing={submit} />
          <Pressable style={[styles.button, { backgroundColor: themeColors.primary, opacity: loading ? 0.7 : 1 }]} onPress={submit} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update Password</Text>}</Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 }, card: { width: '100%', maxWidth: 440, alignSelf: 'center' }, icon: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 18 }, title: { fontSize: 26, fontWeight: '800', textAlign: 'center' }, subtitle: { marginTop: 9, textAlign: 'center', fontSize: 13, lineHeight: 19 }, recoveryWarning: { color: '#FFB74D', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 18 }, message: { flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderColor: '#34344A', backgroundColor: '#181824', borderRadius: 9, padding: 11, marginTop: 20 }, messageText: { color: '#E2E2EE', flex: 1, fontSize: 13, lineHeight: 18 }, passwordWrap: { flexDirection: 'row', alignItems: 'center', height: 52, marginTop: 24, borderRadius: 10, borderColor: '#303046', borderWidth: 1, backgroundColor: '#171722' }, input: { flex: 1, color: '#FFF', height: '100%', paddingHorizontal: 16, fontSize: 15 }, eye: { height: '100%', paddingHorizontal: 14, justifyContent: 'center' }, confirmInput: { height: 52, borderRadius: 10, borderWidth: 1, borderColor: '#303046', backgroundColor: '#171722', color: '#FFF', paddingHorizontal: 16, fontSize: 15, marginTop: 12 }, button: { height: 52, borderRadius: 10, marginTop: 18, justifyContent: 'center', alignItems: 'center' }, buttonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
