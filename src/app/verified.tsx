import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useTheme } from '@/hooks/use-theme';
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';

export default function VerifiedScreen() {
  const router = useRouter();
  const themeColors = useTheme();
  const { session } = useAuth();
  const [dots, setDots] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  // Parse error from URL on web OR from deep link on mobile
  useEffect(() => {
    const parseError = (url: string | null) => {
      if (!url) return;
      // Check hash fragment (web) or query params
      const hashIndex = url.indexOf('#');
      if (hashIndex !== -1) {
        const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
        const errorDesc = hashParams.get('error_description');
        if (errorDesc) {
          setErrorMsg(errorDesc.replace(/\+/g, ' '));
          return;
        }
      }
      // Also check query params (some flows use ? instead of #)
      const queryIndex = url.indexOf('?');
      if (queryIndex !== -1) {
        const queryParams = new URLSearchParams(url.substring(queryIndex + 1));
        const errorDesc = queryParams.get('error_description');
        if (errorDesc) {
          setErrorMsg(errorDesc.replace(/\+/g, ' '));
        }
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      parseError(window.location.href);
    } else {
      // Mobile: parse the deep link URL
      Linking.getInitialURL().then(parseError);
    }
  }, []);

  // Animate dots while waiting for redirect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Wait for the auth session to establish, then redirect to tabs
  useEffect(() => {
    if (session && !errorMsg) {
      const timer = setTimeout(() => {
        router.replace('/(tabs)');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [session, router, errorMsg]);

  // Fallback: if no session and no error after 10 seconds, show a "Go to Login" button
  useEffect(() => {
    if (errorMsg) return; // Don't set fallback if there's already an error
    const fallbackTimer = setTimeout(() => {
      if (!session) {
        setShowFallback(true);
      }
    }, 10000);
    return () => clearTimeout(fallbackTimer);
  }, [session, errorMsg]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.card, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}>
        {errorMsg ? (
          <>
            <AlertTriangle color="#FF3B30" size={64} style={styles.icon} />
            <Text style={[styles.title, { color: '#FF3B30' }]}>Verification Failed</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary, marginBottom: 20 }]}>
              {errorMsg}
            </Text>
            <Pressable
              style={[styles.button, { backgroundColor: themeColors.primary }]}
              onPress={() => router.replace('/login')}
            >
              <Text style={styles.buttonText}>Back to Login</Text>
            </Pressable>
          </>
        ) : (
          <>
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
            {showFallback && (
              <Pressable
                style={[styles.button, { backgroundColor: themeColors.primary, marginTop: 24 }]}
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.buttonText}>Go to Login</Text>
              </Pressable>
            )}
          </>
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
  button: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
