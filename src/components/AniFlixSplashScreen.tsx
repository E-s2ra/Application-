import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Animated, Easing, Dimensions, Platform, Image, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import { Globe, Sparkles } from 'lucide-react-native';

const TOTAL_DURATION = 4000; // Exactly 4 seconds
const isNativeDriver = Platform.OS !== 'web';

interface AniFlixSplashScreenProps {
  onFinish: () => void;
}

export function AniFlixSplashScreen({ onFinish }: AniFlixSplashScreenProps) {
  const themeColors = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [progressAnim] = useState(() => new Animated.Value(0));
  const [logoScaleAnim] = useState(() => new Animated.Value(0.75));
  const [logoOpacityAnim] = useState(() => new Animated.Value(0));
  const [glowPulseAnim] = useState(() => new Animated.Value(0.8));
  const [screenFadeAnim] = useState(() => new Animated.Value(1));

  const [loadingText, setLoadingText] = useState(
    language === 'ku' ? '🎬 دەستپێکردنی جیهانی ئەنیفلیکس...' : '🎬 Initializing AniFlix Universe...'
  );
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    // 1. Logo Entrance Animation
    Animated.parallel([
      Animated.timing(logoScaleAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: isNativeDriver,
      }),
      Animated.timing(logoOpacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: isNativeDriver,
      }),
    ]).start();

    // 2. Pulse Glow Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: isNativeDriver,
        }),
        Animated.timing(glowPulseAnim, {
          toValue: 0.8,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: isNativeDriver,
        }),
      ])
    ).start();

    // 3. Progress Bar Animation across 4000ms
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: TOTAL_DURATION - 400, // 3600ms progress + 400ms fadeout
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();

    // 4. Progress percentage and dynamic text updates
    const textT1 = setTimeout(() => {
      setLoadingText('⚡ Loading 4K streams & catalogs...');
    }, 1200);

    const textT2 = setTimeout(() => {
      setLoadingText('🍿 Preparing your personalized cinema...');
    }, 2400);

    const textT3 = setTimeout(() => {
      setLoadingText('✨ Welcome to AniFlix!');
    }, 3600);

    const interval = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return Math.min(100, prev + 3);
      });
    }, 100);

    // 5. Fade out and transition at exactly 4 seconds
    const finishTimer = setTimeout(() => {
      Animated.timing(screenFadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: isNativeDriver,
      }).start(() => {
        onFinish();
      });
    }, TOTAL_DURATION - 400);

    return () => {
      clearTimeout(textT1);
      clearTimeout(textT2);
      clearTimeout(textT3);
      clearTimeout(finishTimer);
      clearInterval(interval);
    };
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: screenFadeAnim }]}>
      {/* 🌐 Top Language Switcher on First Screen */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.langPill}
          onPress={toggleLanguage}
        >
          <Globe size={14} color="#00D2FF" />
          <Text style={styles.langPillText}>
            {language === 'ku' ? 'کوردی' : 'English'}
          </Text>
        </Pressable>
      </View>

      {/* Background Ambience Glow */}
      <Animated.View
        style={[
          styles.glowCircle,
          {
            transform: [{ scale: glowPulseAnim }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.logoContent,
          {
            opacity: logoOpacityAnim,
            transform: [{ scale: logoScaleAnim }],
          },
        ]}
      >
        {/* New 1:1 App Logo Icon */}
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        {/* Brand Title */}
        <View style={styles.brandTitleRow}>
          <Text style={styles.brandTextWhite}>Ani</Text>
          <Text style={styles.brandTextRed}>Flix</Text>
          <Sparkles size={20} color="#FFB800" style={styles.sparkleIcon} />
        </View>

        {/* Subtitle */}
        <Text style={styles.tagline}>
          {language === 'ku' ? 'جیهانی تایبەتی سینەما و ئەنیمێی تۆ' : 'YOUR ULTIMATE CINEMA & ANIME UNIVERSE'}
        </Text>
      </Animated.View>

      {/* Bottom 4-second Progress & Loader */}
      <View style={styles.footer}>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusText}>{loadingText}</Text>
          <Text style={styles.percentText}>{percent}%</Text>
        </View>

        <Text style={styles.durationBadge}>4s Fast Cinema Loader</Text>
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
    backgroundColor: '#07070A',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: Math.min(width * 0.9, 420),
    height: Math.min(width * 0.9, 420),
    borderRadius: 210,
    backgroundColor: 'rgba(3, 86, 197, 0.18)',
  },
  logoContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoImage: {
    width: 104,
    height: 104,
    borderRadius: 24,
    marginBottom: 20,
  },
  iconBadge: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#0356C5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      web: {
        // @ts-ignore
        boxShadow: '0px 10px 20px rgba(3, 86, 197, 0.5)',
      },
      default: {
        shadowColor: '#0356C5',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 12,
      },
    }),
  },
  flameBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#1E1E2C',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1.5,
    borderColor: '#FFD700',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandTextWhite: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  brandTextRed: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0356C5',
    letterSpacing: 1.5,
  },
  sparkleIcon: {
    marginLeft: 6,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#8A8A9E',
    marginTop: 4,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    width: '84%',
    maxWidth: 360,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#1E1E2C',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0356C5',
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
    color: '#B0B0C3',
    fontWeight: '500',
  },
  percentText: {
    fontSize: 12,
    color: '#0356C5',
    fontWeight: '700',
  },
  durationBadge: {
    fontSize: 10,
    color: '#555568',
    marginTop: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 32,
    right: 20,
    zIndex: 10,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00D2FF',
  },
  langPillText: {
    color: '#00D2FF',
    fontSize: 12,
    fontWeight: '700',
  },
});
