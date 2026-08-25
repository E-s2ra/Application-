import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { CheckCircle2, Loader2 } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';

export default function VerifiedScreen() {
  const router = useRouter();
  const themeColors = useTheme();
  const { session } = useAuth();
  const [dots, setDots] = useState('');

  // Animate dots while waiting for redirect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Wait for the auth session to establish, then redirect to tabs
  useEffect(() => {
    if (session) {
      const timer = setTimeout(() => {
        router.replace('/(tabs)');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [session, router]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.card, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}>
        <CheckCircle2 color={themeColors.primary} size={64} style={styles.icon} />
        <Text style={[styles.title, { color: themeColors.text }]}>Email Verified!</Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          Your account has been successfully verified.
        </Text>
        <View style={styles.loadingContainer}>
          <Loader2 color={themeColors.textSecondary} size={20} style={styles.spinner} />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            Redirecting you to the app{dots}
          </Text>
        </View>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
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
  spinner: {
  },
});
