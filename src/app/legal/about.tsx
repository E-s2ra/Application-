import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Image, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import { ArrowLeft, Info, Tv, Sparkles, Globe, MessageCircle, Send, Mail, Heart, CheckCircle } from 'lucide-react-native';

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { language } = useLanguage();
  const isKu = language === 'ku';

  const content = isKu
    ? {
        title: 'دەربارەی ئەنیفلیکس',
        versionLabel: 'وەشانی ئەپڵیکەیشن: 1.0.0 (پڕۆداکشن)',
        tagline: 'جیهانی تایبەتی سینەما و ئەنیمێ بە زمانی کوردی و ئینگلیزی',
        description:
          'ئەنیفلیکس (AniFlix) بەهێزترین و پێشکەوتووترین ئەپڵیکەیشنی سینەماییە بۆ بینینی نوێترین فیلم، ئەنیمێ، درامای کۆری، و زنجیرە جیهانییەکان بە کوالێتی بەرز (Ultra HD) لەگەڵ ژێرنووس و وەرگێڕانی کوردی سۆرانی.',
        featuresTitle: 'تایبەتمەندییە بەرزەکانی ئەنیفلیکس',
        features: [
          'ژێرنووس و دووبلاژی زووی کوردی (سۆرانی) و ئینگلیزی',
          'سەیرکردنی بێ پچڕان بە کوالێتی Ultra HD و 1080p',
          'سیستەمی خەڵات و دراو (Coins)، چەرخی بەخت و مەدالیاکان',
          'ڕووکاری ئەپڵیکەیشن (Themes) بە خواستی بەکارهێنەر',
          'کۆمەڵگەی تێبینی و بۆچوونی بینەران لەسەر فیلمەکان',
          'دەستگەیشتنی خێرا بۆ هەژماری VIP',
        ],
        contactTitle: 'ناوەندی پشتیوانی و پەیوەندیکردن',
        contactText: 'بۆ کاراکردنی بەشداری VIP یان وەرگرتنی پشتیوانی ڕاستەوخۆ:',
        telegramText: 'تێلیگرامی فەرمی: @esmahil219',
        whatsappText: 'واتسئاپ: 9647824076461+',
        emailText: 'ئیمەیڵی پشتیوانی: support@aniflix.app',
        copyrightText: '© ٢٠٢٦ ئەنیفلیکس (AniFlix). سەرجەم مافەکانی پارێزراوە.',
      }
    : {
        title: 'About AniFlix',
        versionLabel: 'App Version: 1.0.0 (Production Edition)',
        tagline: 'Your Ultimate Cinema & Anime Universe in Kurdish & English',
        description:
          'AniFlix is the premiere cinema and anime streaming platform designed to deliver HD movies, popular anime series, K-Dramas, and blockbuster films with native Kurdish (Sorani) and English localized content.',
        featuresTitle: 'Key Platform Highlights',
        features: [
          'Full bilingual localization (Kurdish Sorani & English)',
          'High-definition streaming engine with fast player controls',
          'Gamification Hub with daily wheel spins, streaks & coins',
          'Theme Shop for custom accent color customization',
          'Community rating, review threads, and user discussions',
          'Exclusive VIP status with ad-free viewing privileges',
        ],
        contactTitle: 'Support & Official Contacts',
        contactText: 'For VIP subscription setup, questions, or direct support:',
        telegramText: 'Official Telegram: @esmahil219',
        whatsappText: 'WhatsApp Support: +9647824076461',
        emailText: 'Support Email: support@aniflix.app',
        copyrightText: '© 2026 AniFlix. All rights reserved.',
      };

  const handleOpenTelegram = () => {
    void Linking.openURL('https://t.me/esmahil219').catch(() => {});
  };

  const handleOpenWhatsApp = () => {
    void Linking.openURL('https://wa.me/9647824076461').catch(() => {});
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top + 10, 20),
            backgroundColor: themeColors.backgroundCard,
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: themeColors.backgroundElement }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={themeColors.text} />
        </Pressable>
        <View style={styles.headerTextWrapper}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
            {content.title}
          </Text>
          <Text style={[styles.headerSub, { color: themeColors.textSecondary }]} numberOfLines={1}>
            {content.versionLabel}
          </Text>
        </View>
      </View>

      {/* Scroll Content */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Brand Card */}
          <View
            style={[
              styles.brandCard,
              {
                backgroundColor: themeColors.backgroundCard,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={[styles.logoCircle, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}>
              <Image
                source={require('../../../assets/images/icon.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.brandName, { color: themeColors.text }]}>
              ANI<Text style={{ color: themeColors.primary }}>FLIX</Text>
            </Text>
            <Text style={[styles.tagline, { color: themeColors.primary }]}>{content.tagline}</Text>
            <Text style={[styles.description, { color: themeColors.textSecondary }]}>
              {content.description}
            </Text>
          </View>

          {/* Features Box */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: themeColors.backgroundCard,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Sparkles size={20} color={themeColors.primary} />
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                {content.featuresTitle}
              </Text>
            </View>
            <View style={styles.featureGrid}>
              {content.features.map((feat, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <CheckCircle size={16} color="#10B981" style={{ marginTop: 2 }} />
                  <Text style={[styles.featureText, { color: themeColors.text }]}>{feat}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Contact Box */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: themeColors.backgroundCard,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Globe size={20} color={themeColors.primary} />
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                {content.contactTitle}
              </Text>
            </View>
            <Text style={[styles.contactIntro, { color: themeColors.textSecondary }]}>
              {content.contactText}
            </Text>

            <View style={styles.contactButtonsRow}>
              <Pressable
                style={[styles.contactBtn, { backgroundColor: '#0088cc' }]}
                onPress={handleOpenTelegram}
                accessibilityRole="button"
                accessibilityLabel="Contact on Telegram"
              >
                <Send size={18} color="#FFFFFF" />
                <Text style={styles.contactBtnText}>Telegram (@esmahil219)</Text>
              </Pressable>

              <Pressable
                style={[styles.contactBtn, { backgroundColor: '#25D366' }]}
                onPress={handleOpenWhatsApp}
                accessibilityRole="button"
                accessibilityLabel="Contact on WhatsApp"
              >
                <MessageCircle size={18} color="#FFFFFF" />
                <Text style={styles.contactBtnText}>WhatsApp (+9647824076461)</Text>
              </Pressable>
            </View>

            <View style={[styles.emailRow, { backgroundColor: themeColors.backgroundElement }]}>
              <Mail size={16} color={themeColors.textSecondary} />
              <Text style={[styles.emailText, { color: themeColors.text }]}>{content.emailText}</Text>
            </View>
          </View>

          {/* Footer Copyright */}
          <Text style={[styles.copyright, { color: themeColors.textMuted }]}>
            {content.copyrightText}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
  },
  contentContainer: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    gap: 14,
  },
  brandCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  logoImg: {
    width: 60,
    height: 60,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
  },
  sectionCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  featureGrid: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  contactIntro: {
    fontSize: 13,
    marginBottom: 14,
  },
  contactButtonsRow: {
    gap: 10,
    marginBottom: 12,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  contactBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  emailText: {
    fontSize: 13,
    fontWeight: '600',
  },
  copyright: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
});
