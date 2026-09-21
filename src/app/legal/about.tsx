import React from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import { CheckCircle, Globe, Mail, MessageCircle, Send, Sparkles } from 'lucide-react-native';
import { AppButton, AppSurface } from '@/components/ui';
import { LegalPage } from '@/components/legal/LegalScaffold';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/useToast';

export default function AboutScreen() {
  const themeColors = useTheme();
  const { language, isRTL } = useLanguage();
  const { showError } = useToast();
  const isKu = language === 'ku';

  const content = isKu
    ? {
        title: 'دەربارەی ئەنیفلیکس',
        versionLabel: 'وەشانی ئەپڵیکەیشن: 1.0.0 (پڕۆداکشن)',
        tagline: 'جیهانی تایبەتی سینەما و ئەنیمێ بە زمانی کوردی و ئینگلیزی',
        description:
          'ئەنیفلیکس (AniFlix) پلاتفۆرمێکی سینەماییە بۆ بینینی فیلم، ئەنیمێ، درامای کۆری و زنجیرە جیهانییەکان بە زمانی کوردی سۆرانی و ئینگلیزی.',
        featuresTitle: 'تایبەتمەندییە بەرزەکانی ئەنیفلیکس',
        features: [
          'ژێرنووس و دووبلاژی زووی کوردی (سۆرانی) و ئینگلیزی',
          'سەیرکردن بە باشترین کوالێتی بەردەست بۆ هەر ناوەڕۆکێک',
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

  const openSupportLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      showError(
        isKu
          ? 'نەتوانرا بەستەری پشتیوانی بکرێتەوە. تکایە دووبارە هەوڵبدەرەوە.'
          : 'Could not open this support link. Please try again.',
      );
    }
  };

  const textDirection = isRTL ? styles.rtlText : styles.ltrText;

  return (
    <LegalPage title={content.title} meta={content.versionLabel}>
      <AppSurface variant="card" padding="xl" style={styles.brandCard}>
        <View
          style={[
            styles.logoCircle,
            { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border },
          ]}
        >
          <Image
            source={require('../../../assets/images/icon.png')}
            style={styles.logoImg}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
        <Text style={[styles.brandName, { color: themeColors.text }]}>
          ANI<Text style={{ color: themeColors.primary }}>FLIX</Text>
        </Text>
        <Text style={[styles.tagline, { color: themeColors.primary }, textDirection]}>
          {content.tagline}
        </Text>
        <Text style={[styles.description, { color: themeColors.textSecondary }, textDirection]}>
          {content.description}
        </Text>
      </AppSurface>

      <AppSurface variant="card" padding="lg">
        <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
          <Sparkles size={20} color={themeColors.primary} />
          <Text style={[styles.sectionTitle, { color: themeColors.text }, textDirection]}>
            {content.featuresTitle}
          </Text>
        </View>
        <View style={styles.featureGrid}>
          {content.features.map((feature) => (
            <View key={feature} style={[styles.featureItem, isRTL && styles.rowRTL]}>
              <CheckCircle size={17} color={themeColors.success} style={styles.featureIcon} />
              <Text style={[styles.featureText, { color: themeColors.text }, textDirection]}>
                {feature}
              </Text>
            </View>
          ))}
        </View>
      </AppSurface>

      <AppSurface variant="card" padding="lg">
        <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
          <Globe size={20} color={themeColors.primary} />
          <Text style={[styles.sectionTitle, { color: themeColors.text }, textDirection]}>
            {content.contactTitle}
          </Text>
        </View>
        <Text style={[styles.contactIntro, { color: themeColors.textSecondary }, textDirection]}>
          {content.contactText}
        </Text>

        <View style={styles.contactButtons}>
          <AppButton
            variant="secondary"
            fullWidth
            size="lg"
            label={content.telegramText}
            leftIcon={<Send size={18} color={themeColors.primary} />}
            onPress={() => void openSupportLink('https://t.me/esmahil219')}
          />
          <AppButton
            variant="secondary"
            fullWidth
            size="lg"
            label={content.whatsappText}
            leftIcon={<MessageCircle size={18} color={themeColors.primary} />}
            onPress={() => void openSupportLink('https://wa.me/9647824076461')}
          />
          <AppButton
            variant="ghost"
            fullWidth
            size="lg"
            label={content.emailText}
            leftIcon={<Mail size={18} color={themeColors.textSecondary} />}
            onPress={() => void openSupportLink('mailto:support@aniflix.app')}
          />
        </View>
      </AppSurface>

      <Text style={[styles.copyright, { color: themeColors.textMuted }, textDirection]}>
        {content.copyrightText}
      </Text>
    </LegalPage>
  );
}

const styles = StyleSheet.create({
  brandCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  logoImg: {
    width: 60,
    height: 60,
  },
  brandName: {
    ...Typography.h1,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  tagline: {
    ...Typography.small,
    fontWeight: '700',
    width: '100%',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  description: {
    ...Typography.body,
    width: '100%',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    flex: 1,
  },
  featureGrid: {
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  featureIcon: {
    marginTop: 2,
  },
  featureText: {
    ...Typography.small,
    fontWeight: '600',
    flex: 1,
  },
  contactIntro: {
    ...Typography.small,
    marginBottom: Spacing.md,
  },
  contactButtons: {
    gap: Spacing.sm,
  },
  copyright: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ltrText: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
});
