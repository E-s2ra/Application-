import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import { ArrowLeft, ShieldCheck, Lock, Eye, Database, Bell, LifeBuoy } from 'lucide-react-native';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { language } = useLanguage();
  const isKu = language === 'ku';

  const content = isKu
    ? {
        title: 'یاسای تایبەتمەندی',
        subtitle: 'پاراستنی زانیارییەکانت لە ئەنیفلیکس (AniFlix)',
        effectiveDate: 'کاتی کارابوون: کانوونی دووەمی ٢٠٢٦',
        intro:
          'لە ئەنیفلیکس (AniFlix)، ئێمە ڕێز لە تایبەتمەندی بەکارهێنەرانمان دەگرین. ئەم یاسای تایبەتمەندییە روونیدەکاتەوە چۆن زانیارییەکانت کۆدەکەینەوە، بەکاریان دەهێنین، و دەیانپارێزین لە کاتی بەکارهێنانی ئەپڵیکەیشنەکەمانی.',
        sections: [
          {
            icon: Database,
            title: '١. زانیارییە کۆکراوەکان',
            text: 'ئێمە تەنها ئەو زانیارییانە کۆدەکەینەوە کە پێویستن بۆ پێشکەشکردنی خزمەتگوزاری سەیرکردنی فیلم و ئەنیمێ:\n\n• زانیاری هەژمار: ناوی تەواو، ناوی بەکارهێنەر، و ناونیشانی ئیمەیڵ لە کاتی تۆمارکردندا.\n• چالاکییەکانی بەکارهێنەر: لیستی دڵخوازەکان، مێژووی سەیرکردن، و پۆستەکانی بڵاوکراوە لە بەشی بۆچوونەکاندا.\n• زانیاری ئاست و خەڵاتەکان: پۆینت و دراوە بەدەستهاتووەکان، مەدالیاکان، و ڕووکارە کڕدراوەکان.\n• ئێمە بە هیچ شێوەیەک زانیاری کارت و ژمارەی حیسابی بانکی کۆناکەینەوە، چونکە بەشداری VIP بە شێوازی دەستی (Manual) لە ڕێگەی تێلیگرام یان واتسئاپەوە ئەنجام دەدرێت.',
          },
          {
            icon: Eye,
            title: '٢. چۆنیەتی بەکارهێنانی زانیارییەکان',
            text: 'زانیارییەکانت بەکاردەهێنرێن بۆ:\n\n• دابینکردنی خزمەتگوزاری سەیرکردنی فیلم و ئەنیمێ بە کوالێتی بەرز.\n• خەزنکردن و هاوکاتکردنی (Sync) لیستی دڵخوازەکان و مێژووی سەیرکردنت لەسەر هەموو ئامێرەکانت.\n• بەڕێوەبردنی سیستەمی خەڵات، ئاستەکان (Levels)، و چەرخی بەخت.\n• وەڵامدانەوەی داواکارییەکانت لە ناوەندی پشتیوانی بەکارهێنەردا.',
          },
          {
            icon: Lock,
            title: '٣. پاراستنی زانیاری و ئەمنییەت',
            text: 'زانیارییەکانی تۆ بە شێوازی پارێزراو لە ڕاژەکارەکانی Supabase تێدا کۆکراونەتەوە بە بەکارهێنانی سیستەمی Row Level Security (RLS). ئێمە وشەی تێپەڕ بوونی (Password) تۆ بە شێوازی ڕەمزکراو (Encrypted Hash) خەزن دەکەین و کەس ناتوانێت بیخوێنێتەوە.',
          },
          {
            icon: Bell,
            title: '٤. خزمەتگوزارییە دەرەکییەکان و ڕیکلام',
            text: 'ئێمە خزمەتگوزاری Google AdMob بەکاردەهێنین بۆ نیشاندانی ڕیکلامی پاداشتکراو (Rewarded Ads). تەنها لە کاتی ویستی بەکارهێنەردا بۆ وەرگرتنی دراوی خۆڕایی سەیری ڕیکلام دەکرێت. هیچ زانیارییەکی کەسیی تان نانێردرێت بۆ لایەنی سێیەم بۆ مەبەستی بازرگانی.',
          },
          {
            icon: ShieldCheck,
            title: '٥. مافەکانی بەکارهێنەر و سڕینەوەی هەژمار',
            text: 'تۆ مافی تەواوت هەیە کە:\n\n• دەستکاری زانیارییە کەسییەکانت بکەیت لە بەشی پڕۆفایلدا.\n• داوای سڕینەوەی تەواوەتی هەژمارەکەت و زانیارییە خەزنکراوەکانت بکەیت لە ڕێگەی پەیوەندیکردن بە پشتیوانی ئەنیفلیکسەوە.',
          },
          {
            icon: LifeBuoy,
            title: '٦. پەیوەندیکردن بە ئێمەوە',
            text: 'ئەگەر هەر پرسیارێک یان تێبینییەکت هەیە دەربارەی یاسای تایبەتمەندی، دەتوانیت پەیوەندیمان پێوە بکەیت لە ڕێگەی:\n\n• ئیمەیڵ: support@aniflix.app\n• تێلیگرام: @esmahil219\n• واتسئاپ: 9647824076461+',
          },
        ],
      }
    : {
        title: 'Privacy Policy',
        subtitle: 'Protecting your personal data on AniFlix',
        effectiveDate: 'Effective Date: January 2026',
        intro:
          'At AniFlix, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our cinema and anime streaming platform.',
        sections: [
          {
            icon: Database,
            title: '1. Information We Collect',
            text: 'We collect only the essential information necessary to provide you with a high-quality streaming experience:\n\n• Account Credentials: Full name, username, and email address provided during signup.\n• Activity & Watch History: Your watchlist/favorites, watch history, and community reviews/comments.\n• Gamification Progress: Earned coins, XP levels, unlocked badges, and equipped themes.\n• Financial Data: We DO NOT store any credit card or banking details. VIP Passes are issued manually via direct Telegram or WhatsApp verification.',
          },
          {
            icon: Eye,
            title: '2. How We Use Your Information',
            text: 'Your information is used strictly to:\n\n• Provide, maintain, and personalize your HD anime and cinema streaming catalog.\n• Synchronize your watchlist and watch progress across all your connected devices.\n• Power the AniFlix Rewards Hub, daily streaks, wheel spins, and level badges.\n• Provide support and assist with VIP subscription setup via official channels.',
          },
          {
            icon: Lock,
            title: '3. Data Security & Storage',
            text: 'Your account data is stored securely using Supabase infrastructure with Row-Level Security (RLS) policies enabled. Passwords are securely hashed before storage, ensuring no unauthorized access or third-party exposure.',
          },
          {
            icon: Bell,
            title: '4. Third-Party Services & Ads',
            text: 'We utilize Google AdMob for optional rewarded ads, allowing users to earn free in-app coins. We do not sell, rent, or trade your personal information to third parties for commercial marketing purposes.',
          },
          {
            icon: ShieldCheck,
            title: '5. User Rights & Account Deletion',
            text: 'You maintain full control over your data:\n\n• You can update your profile avatar and full name anytime in Profile settings.\n• You may request complete deletion of your account and all associated watch data by contacting support.',
          },
          {
            icon: LifeBuoy,
            title: '6. Contact & Support',
            text: 'If you have any questions regarding this Privacy Policy or your data, reach out to us via:\n\n• Email: support@aniflix.app\n• Telegram: @esmahil219\n• WhatsApp: +9647824076461',
          },
        ],
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
            {content.effectiveDate}
          </Text>
        </View>
      </View>

      {/* Main Content Scroll */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Top Hero Banner */}
          <View
            style={[
              styles.heroBanner,
              {
                backgroundColor: themeColors.backgroundCard,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <ShieldCheck size={28} color="#3B82F6" />
            </View>
            <Text style={[styles.heroTitle, { color: themeColors.text }]}>{content.title}</Text>
            <Text style={[styles.heroSub, { color: themeColors.textSecondary }]}>
              {content.subtitle}
            </Text>
            <Text style={[styles.introText, { color: themeColors.text }]}>{content.intro}</Text>
          </View>

          {/* Policy Sections */}
          {content.sections.map((sec, idx) => {
            const IconComponent = sec.icon;
            return (
              <View
                key={idx}
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: themeColors.backgroundCard,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <View style={styles.sectionHeaderRow}>
                  <View
                    style={[
                      styles.sectionIconBox,
                      { backgroundColor: themeColors.backgroundElement },
                    ]}
                  >
                    <IconComponent size={20} color={themeColors.primary} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    {sec.title}
                  </Text>
                </View>
                <Text style={[styles.sectionText, { color: themeColors.textSecondary }]}>
                  {sec.text}
                </Text>
              </View>
            );
          })}
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
  heroBanner: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  sectionCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 22,
  },
});
