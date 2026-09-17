import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import { ArrowLeft, ShieldAlert, FileCode, CheckSquare, Mail, AlertCircle } from 'lucide-react-native';

export default function DMCAScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = useTheme();
  const { language } = useLanguage();
  const isKu = language === 'ku';

  const content = isKu
    ? {
        title: 'مافی کۆپیکردن و DMCA',
        subtitle: 'ڕاگەیەندراوی مافی خاوەندارییەتی فکری و سڕینەوەی ناوەڕۆک',
        effectiveDate: 'کاتی کارابوون: کانوونی دووەمی ٢٠٢٦',
        intro:
          'ئەنیفلیکس (AniFlix) سەرجەم مافەکانی خاوەندارییەتی فکری دەپارێزێت و ئامادەیە بەپەلە ڕێکار بگرێتە بەر بەرامبەر هەر پێشێلکارییەکی مافی کۆپیکردن بەپێی یاساکانی Digital Millennium Copyright Act (DMCA).',
        sections: [
          {
            icon: AlertCircle,
            title: '١. ڕاگەیەندراوی ناوەڕۆک',
            text: 'ئەنیفلیکس (AniFlix) بە شێوەیەکی ڕاستەوخۆ هیچ پەڕگەیەکی ڤیدیۆیی لەسەر ڕاژەکارەکانی (Servers) خۆی خەزن ناکات. سەرجەم بەستەر و سەرچاوەکانی فیلم و ئەنیمێ لە سەرچاوە گشتییە بڵاوکراوەکان یان خزمەتگوزارییە ڕێگەپێدراوەکانی دابەشکردنی مێدیاوە وەردەگیرێن.',
          },
          {
            icon: FileCode,
            title: '٢. داواکاری سڕینەوەی ناوەڕۆک (Takedown Notice)',
            text: 'ئەگەر تۆ خاوەنی یاسایی مافی کۆپیکردنی بەرهەمێکیت (یان نوێنەری ڕێگەپێدراویت) و پێتوایە ناوەڕۆکێک لەسەر ئەنیفلیکس مافەکانت پێشێل دەکات، دەتوانیت داواکاری سڕینەوەمان بۆ بنێریت.\n\nداواکارییەکەت دەبێت ئەم زانیارییانەی تێدابێت:\n\n١. ناوی تەواو و بەڵگەی سەلماندنی خاوەندارییەتی مافی کۆپیکردن.\n٢. ناوی وردی بەرهەمەکە (فیلم، ئەنیمێ، یان زنجیرە).\n٣. ناونیشانی ئیمەیڵ یان ژمارەی پەیوەندیکردن.\n٤. ڕاگەیەندراوێک کە تێیدا دووپاتیدەکەیتەوە کە زانیارییەکان ڕاست و دروستن.',
          },
          {
            icon: CheckSquare,
            title: '٣. ماوەی بەدەنگەوەهاتن',
            text: 'تیمی ڕێکخستنی ئەنیفلیکس پابەندە بە لێکۆڵینەوە و سڕینەوەی هەر بەرهەمێک کە پێشێلکاری تێدا سەلمێنراوە لە ماوەی ٢٤ بۆ ٤٨ کاتژمێردا دوای وەرگرتنی ئاگادارکردنەوەی فەرمی.',
          },
          {
            icon: Mail,
            title: '٤. پەیوەندیکردن بە نوێنەری DMCA',
            text: 'تکایە داواکارییەکانی سڕینەوەی ناوەڕۆک بنێرن بۆ:\n\n• ئیمەیڵی DMCA: dmca@aniflix.app / support@aniflix.app\n• تێلیگرامی ئەدمین: @esmahil219\n• واتسئاپ: 9647824076461+',
          },
        ],
      }
    : {
        title: 'DMCA & Copyright Policy',
        subtitle: 'Digital Millennium Copyright Act compliance notice',
        effectiveDate: 'Effective Date: January 2026',
        intro:
          'AniFlix respects the intellectual property rights of creators and content owners. We comply strictly with the Digital Millennium Copyright Act (DMCA) and act promptly upon receiving valid copyright infringement notices.',
        sections: [
          {
            icon: AlertCircle,
            title: '1. Content & Hosting Disclaimer',
            text: 'AniFlix does NOT host, store, or upload video media files directly on its proprietary servers. The application acts as a curated media catalog and streaming client that indexes publicly accessible links provided by third-party content providers.',
          },
          {
            icon: FileCode,
            title: '2. Submitting a DMCA Takedown Notice',
            text: 'If you are a copyright owner or authorized representative and believe that any content indexed on AniFlix infringes upon your copyright, you may submit a written notice containing the following details:\n\n1. Full legal name and contact details of the copyright holder or authorized agent.\n2. Identification of the copyrighted work claimed to have been infringed.\n3. Exact title, series name, or media ID referenced within the app.\n4. A statement under penalty of perjury that the information in your notification is accurate.',
          },
          {
            icon: CheckSquare,
            title: '3. Processing & Response Timeline',
            text: 'Upon receiving a valid DMCA notice fulfilling all legal criteria, the AniFlix engineering and compliance team will disable access or remove the disputed content from the application catalog within 24 to 48 business hours.',
          },
          {
            icon: Mail,
            title: '4. Designated Copyright Agent',
            text: 'Direct all copyright queries and takedown requests to our designated support channels:\n\n• DMCA Email: dmca@aniflix.app / support@aniflix.app\n• Telegram Support: @esmahil219\n• WhatsApp Line: +9647824076461',
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
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <ShieldAlert size={28} color="#EF4444" />
            </View>
            <Text style={[styles.heroTitle, { color: themeColors.text }]}>{content.title}</Text>
            <Text style={[styles.heroSub, { color: themeColors.textSecondary }]}>
              {content.subtitle}
            </Text>
            <Text style={[styles.introText, { color: themeColors.text }]}>{content.intro}</Text>
          </View>

          {/* Sections */}
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
