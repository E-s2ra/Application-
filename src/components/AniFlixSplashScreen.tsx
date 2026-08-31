import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Animated, Easing, Dimensions, Platform, Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useColorMode } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import { Globe, Sparkles, Sun, Moon } from 'lucide-react-native';
import { PrimaryGradient } from '@/components/PrimaryGradient';

const TOTAL_DURATION = 3600; // 3.6 seconds smooth launch
const isNativeDriver = Platform.OS !== 'web';

interface AniFlixSplashScreenProps {
  onFinish: () => void;
}

export function AniFlixSplashScreen({ onFinish }: AniFlixSplashScreenProps) {
  const themeColors = useTheme();
  const { isDark, toggleColorMode } = useColorMode();
  const { language, toggleLanguage } = useLanguage();
  const insets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };

  const [progressAnim] = useState(() => new Animated.Value(0));
  const [logoScaleAnim] = useState(() => new Animated.Value(0.8));
  const [logoOpacityAnim] = useState(() => new Animated.Value(0));
  const [glowPulseAnim] = useState(() => new Animated.Value(0.85));
  const [screenFadeAnim] = useState(() => new Animated.Value(1));

  const [loadingText, setLoadingText] = useState(
    language === 'ku' ? 'دەستپێکردنی جیهانی ئەنیفلیکس...' : 'Initializing AniFlix Universe...'
  );
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    // 1. Logo Entrance Animation
    Animated.parallel([
      Animated.timing(logoScaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: isNativeDriver,
      }),
      Animated.timing(logoOpacityAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: isNativeDriver,
      }),
    ]).start();

    // 2. Pulse Glow Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulseAnim, {
          toValue: 1.15,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: isNativeDriver,
        }),
        Animated.timing(glowPulseAnim, {
          toValue: 0.85,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: isNativeDriver,
        }),
      ])
    ).start();

    // 3. Progress Bar Animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: TOTAL_DURATION - 350,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();

    // 4. Status Text & Percentage Updates
    const textT1 = setTimeout(() => {
      setLoadingText(language === 'ku' ? 'بارکردنی کاتەلۆگەکان...' : 'Loading 4K streams & catalogs...');
    }, 400);

    const textT2 = setTimeout(() => {
      setLoadingText(language === 'ku' ? 'ئامادەکردنی سینەما...' : 'Preparing your personalized cinema...');
    }, 1200);

    const textT3 = setTimeout(() => {
      setLoadingText(language === 'ku' ? 'بەخێر بێیت بۆ AniFlix!' : 'Welcome to AniFlix!');
    }, 3200);

    const interval = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return Math.min(100, prev + 4);
      });
    }, 90);

    // 5. Fade Out & Finish Callback
    const finishTimer = setTimeout(() => {
      Animated.timing(screenFadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: isNativeDriver,
      }).start(() => {
        onFinish();
      });
    }, TOTAL_DURATION - 350);

    return () => {
      clearTimeout(textT1);
      clearTimeout(textT2);
      clearTimeout(textT3);
      clearTimeout(finishTimer);
      clearInterval(interval);
    };
  }, [language, onFinish, glowPulseAnim, logoOpacityAnim, logoScaleAnim, progressAnim, screenFadeAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.background,
          opacity: screenFadeAnim,
        },
      ]}
    >
      {/* 🌐 Top Bar: Theme & Language Controls */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top + 8, 20) }]}>
        <View style={styles.topActions}>
          <Pressable
            style={[styles.themePill, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}
            onPress={toggleColorMode}
          >
            {isDark ? <Moon size={14} color={themeColors.textSecondary} /> : <Sun size={14} color={themeColors.primary} />}
          </Pressable>

          <Pressable
            style={[styles.langPill, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}
            onPress={toggleLanguage}
          >
            <Globe size={14} color={themeColors.primary} />
            <Text style={[styles.langPillText, { color: themeColors.text }]}>
              {language === 'ku' ? 'کوردی' : 'English'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 🔮 Dynamic Background Ambient Pulse Glow */}
      <Animated.View
        style={[
          styles.glowCircle,
          {
            backgroundColor: isDark ? 'rgba(3, 86, 197, 0.18)' : 'rgba(3, 86, 197, 0.10)',
            transform: [{ scale: glowPulseAnim }],
          },
        ]}
      />

      {/* 🎬 Brand Logo & Title Box */}
      <Animated.View
        style={[
          styles.logoContent,
          {
            opacity: logoOpacityAnim,
            transform: [{ scale: logoScaleAnim }],
          },
        ]}
      >
        <View style={[styles.logoCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Brand Title */}
        <View style={styles.brandTitleRow}>
          <Text style={[styles.brandTextWhite, { color: themeColors.text }]}>ANI</Text>
          <Text style={[styles.brandTextRed, { color: themeColors.primary }]}>FLIX</Text>
          <Sparkles size={20} color="#FFB800" style={styles.sparkleIcon} />
        </View>

        {/* Tagline */}
        <Text style={[styles.tagline, { color: themeColors.textSecondary }]}>
          {language === 'ku' ? 'جیهانی تایبەتی سینەما و ئەنیمێی تۆ' : 'YOUR ULTIMATE CINEMA & ANIME UNIVERSE'}
        </Text>
      </Animated.View>

      {/* ⏱️ Bottom Progress Loader */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}>
        <View style={[styles.progressBarBg, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth, backgroundColor: themeColors.primary }]}>
            <PrimaryGradient borderRadius={3} />
          </Animated.View>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusText, { color: themeColors.textSecondary }]}>{loadingText}</Text>
          <Text style={[styles.percentText, { color: themeColors.primary }]}>{percent}%</Text>
        </View>

        <Text style={[styles.durationBadge, { color: themeColors.textSecondary }]}>
          AniFlix Cinema Engine
        </Text>
      </View>
    </Animated.View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    right: 20,
    zIndex: 10,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themePill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  glowCircle: {
    position: 'absolute',
    width: Math.min(width * 0.9, 420),
    height: Math.min(width * 0.9, 420),
    borderRadius: 210,
  },
  logoContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoCard: {
    width: 104,
    height: 104,
    borderRadius: 26,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 20,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandTextWhite: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  brandTextRed: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  sparkleIcon: {
    marginLeft: 6,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 2,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '84%',
    maxWidth: 360,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statusRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  percentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  durationBadge: {
    fontSize: 10,
    marginTop: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
});
