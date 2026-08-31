import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Crown, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';

export default function VipSuccessScreen() {
  const router = useRouter();
  const themeColors = useTheme();
  const { refreshProfile } = useAuth();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Refresh user profile to pick up updated VIP status from server
    refreshProfile().catch(() => {});

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.replace('/(tabs)');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, refreshProfile]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.card, { backgroundColor: themeColors.backgroundElement, borderColor: '#FFB800' }]}>
        <View style={styles.iconCircle}>
          <Crown color="#FFB800" size={56} />
        </View>
        <Text style={[styles.title, { color: themeColors.text }]}>VIP Sovereign Unlocked!</Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          Thank you for subscribing to AniFlix VIP. Your account has been upgraded to Commercial-Free 4K Ultra HD access.
        </Text>

        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <CheckCircle2 color="#00E676" size={18} />
            <Text style={styles.featureText}>Ad-Free Seamless Streaming</Text>
          </View>
          <View style={styles.featureItem}>
            <CheckCircle2 color="#00E676" size={18} />
            <Text style={styles.featureText}>Uncapped Dolby Surround Sound</Text>
          </View>
          <View style={styles.featureItem}>
            <CheckCircle2 color="#00E676" size={18} />
            <Text style={styles.featureText}>Exclusive VIP Crown Badge</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.continueBtn,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Sparkles color="#FFF" size={18} />
          <Text style={styles.continueBtnText}>Start Watching Now ({countdown}s)</Text>
        </Pressable>
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
    maxWidth: 440,
    padding: 32,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  featureList: {
    width: '100%',
    gap: 10,
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0356C5',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
  },
  continueBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
