import React from 'react';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import { LegalHero, LegalPage, LegalSection } from '@/components/legal/LegalScaffold';
import { FileText, CheckCircle2, Crown, MessageSquare, AlertTriangle, Shield, HelpCircle } from 'lucide-react-native';

export default function TermsOfServiceScreen() {
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
    <LegalPage title={content.title} meta={content.effectiveDate}>
      <LegalHero
        icon={<FileText size={28} color={themeColors.success} />}
        title={content.title}
        subtitle={content.subtitle}
        intro={content.intro}
        tone="success"
      />
      {content.sections.map((section) => {
        const IconComponent = section.icon;
        return (
          <LegalSection
            key={section.title}
            icon={<IconComponent size={20} color={themeColors.primary} />}
            title={section.title}
            text={section.text}
          />
        );
      })}
    </LegalPage>
  );
}
