import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import { ArrowLeft, FileText, CheckCircle2, Crown, MessageSquare, AlertTriangle, Shield, HelpCircle } from 'lucide-react-native';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { language } = useLanguage();
  const isKu = language === 'ku';

  const content = isKu
    ? {
        title: 'مەرجەکانی بەکارهێنان',
        subtitle: 'یاسا و مەرجەکانی بەکارهێنانی خزمەتگوزاری ئەنیفلیکس (AniFlix)',
        effectiveDate: 'کاتی کارابوون: کانوونی دووەمی ٢٠٢٦',
        intro:
          'تکایە ئەم مەرجانە بە ووردیی بخوێنەرەوە بەرپێش لەکاتی بەکارهێنانی ئەپڵیکەیشنی ئەنیفلیکس. بە بەکارهێنانی ئەپەکە، تۆ ڕەزامەندی دەدەیت لەسەر پەیڕەوکردنی هەموو ئەم مەرجانە.',
        sections: [
          {
            icon: CheckCircle2,
            title: '١. پەسەندکردنی مەرجەکان',
            text: 'بە دروستکردنی هەژمار یان بەکارهێنانی خزمەتگوزارییەکانی ئەنیفلیکس (AniFlix)، تۆ ڕەزامەندی لەسەر هەموو مەرج و یاساکانی بەکارهێنان و یاسای تایبەتمەندی دەربڕیوە. ئەگەر ڕازی نیت لەسەر ئەم مەرجانە، تکایە ئەپڵیکەیشنەکە بەکارمەهێنە.',
          },
          {
            icon: Crown,
            title: '٢. بەشداری VIP و سیستەمی پارەدان',
            text: '• سیستەمی بەشداری VIP لە ئەنیفلیکس بە شێوازی دەستی (Manual) دەبێت.\n• دوای ئەنجامدانی پرۆسەی پارەدان لە ڕێگەی ژمارەی فەرمی تێلیگرام (@esmahil219) یان واتسئاپ (+9647824076461)، دەسەڵاتدارانی ئەپەکە (Admin) پاسی VIP بۆ هەژمارەکەت کارا دەکەن.\n• دوای کارابوونی پاسی VIP، پارەکە گەڕێنەرەوە نییە (Non-refundable) تەنها لە کاتی هەبوونی کێشەی تەکنیکی سەرەکی لەسەر ڕاژەکارەکانماندا نەبێت.',
          },
          {
            icon: MessageSquare,
            title: '٣. ڕەفتاری بەکارهێنەر و ڕێنماییەکانی کۆمەڵگە',
            text: 'لە کاتی نووسینی بۆچوون و هەڵسەنگاندن لەسەر فیلم و ئەنیمێکان، بەکارهێنەران پێویستە پابەندی ئەم یاسایانە بن:\n\n• قەدەغەیە بەکارهێنانی وشەی نەشیاو، سووکایەتی، یان ڕق‌لێبونەوە.\n• قەدەغەیە بڵاوکردنەوەی سپام، لینکی ڕیکلامی، یان هەواڵی درۆ.\n• قەدەغەیە تێکدانی چیرۆک (Spoiler) بەبێ ئاگادارکردنەوە لە بۆچوونەکاندا.\n• بەکارهێنەرانی سەرپێچیکار هەژمارەکانیان ڕادەگیرێت (Suspend/Ban).',
          },
          {
            icon: Shield,
            title: '٤. مافی خاوەندارییەتی فکری و ناوەڕۆک',
            text: 'ئەنیفلیکس کەتەلۆگێکی ڕێکخراوی سینەمایی و ئەنیمێ پێشکەش دەکات. هەموو مافەکانی نیشانەی بازرگانی، لۆگۆ، و دیزاینی ئەپەکە بۆ ئەنیفلیکس دەگەڕێتەوە. مافی خاوەندارییەتی فیلم و ئەنیمێکان بۆ بەرهەمهێنەران و خاوەنە یاساییەکانیان دەگەڕێتەوە.',
          },
          {
            icon: AlertTriangle,
            title: '٥. بەستێن و بەرپرسیارییەتی',
            text: 'ئێمە بەردەوام هەوڵدەدەین بۆ دابینکردنی خزمەتگوزارییەکی بەرز و بێ کێشە، بەڵام ئەنیفلیکس بەرپڕس نییە لە وەستانی کاتیی خزمەتگوزاری بەهۆی چاکسازی ڕاژەکارەکان یان کێشەی هێڵی ئینتەرنێتی بەکارهێنەران.',
          },
          {
            icon: HelpCircle,
            title: '٦. دەستکاریکردنی مەرجەکان و پشتیوانی',
            text: 'ئەنیفلیکس مافی گۆڕینی ئەم مەرجانەی هەیە لە هەر کاتێکدا. گۆڕانکارییەکان لەم پەڕەیەدا بڵاودەکرێنەوە.\n\nپەیوەندی پشتیوانی: support@aniflix.app | Telegram: @esmahil219',
          },
        ],
      }
    : {
        title: 'Terms of Service',
        subtitle: 'Rules and conditions governing the use of AniFlix',
        effectiveDate: 'Effective Date: January 2026',
        intro:
          'Please read these Terms of Service carefully before using AniFlix. By accessing or using our streaming application, you agree to be bound by these terms.',
        sections: [
          {
            icon: CheckCircle2,
            title: '1. Acceptance of Terms',
            text: 'By creating an account or accessing AniFlix services, you acknowledge that you have read, understood, and agreed to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the application.',
          },
          {
            icon: Crown,
            title: '2. VIP Subscriptions & Manual Payment System',
            text: '• AniFlix features a manual VIP subscription activation system.\n• Users request VIP membership by transferring payment through our official Telegram (@esmahil219) or WhatsApp (+9647824076461) support channels.\n• Platform administrators manually grant VIP status to the verified user account.\n• VIP subscriptions are non-refundable once activated, except in cases of prolonged service interruption caused by our infrastructure.',
          },
          {
            icon: MessageSquare,
            title: '3. User Conduct & Community Guidelines',
            text: 'When participating in community ratings, reviews, and discussions, users must adhere to the following standards:\n\n• Hate speech, profanity, harassment, or personal attacks are strictly prohibited.\n• Spamming, commercial links, or phishing content will lead to instant account termination.\n• Unmarked plot spoilers in community reviews are not permitted.\n• Violators will have their account suspended without prior notice.',
          },
          {
            icon: Shield,
            title: '4. Intellectual Property & Branding',
            text: 'All trademarks, logos, custom artwork, UI design, and gamification concepts belong to AniFlix. Anime titles, movies, poster images, and promotional trailers belong to their respective copyright holders and licensors.',
          },
          {
            icon: AlertTriangle,
            title: '5. Service Availability & Limitation of Liability',
            text: 'While we strive for 99.9% uptime, AniFlix is provided on an "as is" and "as available" basis. We are not liable for temporary outages due to server maintenance, ISP connectivity issues, or third-party network disruptions.',
          },
          {
            icon: HelpCircle,
            title: '6. Modifications & Customer Support',
            text: 'We reserve the right to update these terms at any time. Continued use of the service constitutes acceptance of modified terms.\n\nSupport Email: support@aniflix.app | Telegram: @esmahil219',
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

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 40, 60) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Hero Banner */}
          <View
            style={[
              styles.heroBanner,
              {
                backgroundColor: themeColors.backgroundCard,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <FileText size={28} color="#10B981" />
            </View>
            <Text style={[styles.heroTitle, { color: themeColors.text }]}>{content.title}</Text>
            <Text style={[styles.heroSub, { color: themeColors.textSecondary }]}>
              {content.subtitle}
            </Text>
            <Text style={[styles.introText, { color: themeColors.text }]}>{content.intro}</Text>
          </View>

          {/* Terms Sections */}
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
