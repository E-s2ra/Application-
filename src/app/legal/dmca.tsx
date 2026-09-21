import React from 'react';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import { LegalHero, LegalPage, LegalSection } from '@/components/legal/LegalScaffold';
import { ShieldAlert, FileCode, CheckSquare, Mail, AlertCircle } from 'lucide-react-native';

export default function DMCAScreen() {
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
    <LegalPage title={content.title} meta={content.effectiveDate}>
      <LegalHero
        icon={<ShieldAlert size={28} color={themeColors.error} />}
        title={content.title}
        subtitle={content.subtitle}
        intro={content.intro}
        tone="danger"
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
