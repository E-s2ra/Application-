import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { CheckCircle2, Loader2, LogIn, CircleAlert } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';

export default function VerifiedScreen() {
  const router = useRouter();
  const themeColors = useTheme();
  const { session } = useAuth();
  const [dots, setDots] = useState('');
  const [showFallback, setShowFallback] = useState(false);

  // Animate dots while waiting for redirect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Show fallback navigation button after 3 seconds if no session is active
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!session) setShowFallback(true);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [session]);

  // Wait for the auth session to establish, then redirect to tabs
  useEffect(() => {
    if (session) {
      const timer = setTimeout(() => {
        router.replace('/(tabs)');
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [session, router]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.card, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}>
        {showFallback && !session ? (
          <CircleAlert color={themeColors.error} size={64} style={styles.icon} />
        ) : (
          <CheckCircle2 color={themeColors.primary} size={64} style={styles.icon} />
        )}
        <Text style={[styles.title, { color: themeColors.text }]}>
          {showFallback && !session ? 'Sign-in Required' : 'Email Verified!'}
        </Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          {showFallback && !session
            ? 'We could not establish a verified session from this link. Sign in to continue.'
            : 'Your account has been successfully verified.'}
        </Text>

        {!showFallback || session ? (
          <View style={styles.loadingContainer}>
            <Loader2 color={themeColors.textSecondary} size={20} style={styles.spinner} />
            <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
              Redirecting you to the app{dots}
            </Text>
          </View>
        ) : (
          <View style={styles.actionContainer}>
            <Pressable
              style={[styles.button, { backgroundColor: themeColors.primary }]}
              onPress={() => router.replace('/(auth)/login')}
            >
              <LogIn color="#FFF" size={18} />
              <Text style={styles.buttonText}>Sign In to Account</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  spinner: {},
  actionContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
