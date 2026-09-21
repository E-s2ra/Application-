import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { AppIconButton, AppSurface } from '@/components/ui';
import { Layout, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import { useResponsive } from '@/hooks/useResponsive';

type LegalPageProps = {
  title: string;
  meta?: string;
  children: ReactNode;
};

type Tone = 'primary' | 'success' | 'danger';

type LegalHeroProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  intro: string;
  tone?: Tone;
};

type LegalSectionProps = {
  icon: ReactNode;
  title: string;
  text: string;
};

export function LegalPage({ title, meta, children }: LegalPageProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { isRTL } = useLanguage();
  const { pagePad } = useResponsive({ desktopRailWidth: 0 });

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top + Spacing.sm, Spacing.lg),
            paddingHorizontal: pagePad,
            backgroundColor: theme.backgroundCard,
            borderBottomColor: theme.border,
          },
          isRTL && styles.rowRTL,
        ]}
      >
        <AppIconButton
          variant="surface"
          accessibilityLabel={isRTL ? 'گەڕانەوە' : 'Go back'}
          icon={
            isRTL
              ? <ArrowRight size={20} color={theme.text} />
              : <ArrowLeft size={20} color={theme.text} />
          }
          onPress={goBack}
        />
        <View style={styles.headerTextWrapper}>
          <Text style={[styles.headerTitle, { color: theme.text }, isRTL && styles.rtlText]}>
            {title}
          </Text>
          {meta ? (
            <Text style={[styles.headerMeta, { color: theme.textSecondary }, isRTL && styles.rtlText]}>
              {meta}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: pagePad,
            paddingBottom: Math.max(insets.bottom + Spacing.xxl, Spacing.xxxl),
          },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.contentContainer}>{children}</View>
      </ScrollView>
    </View>
  );
}

export function LegalHero({
  icon,
  title,
  subtitle,
  intro,
  tone = 'primary',
}: LegalHeroProps) {
  const theme = useTheme();
  const { isRTL } = useLanguage();
  const toneBackground =
    tone === 'success' ? theme.successSoft : tone === 'danger' ? theme.errorSoft : theme.primarySoft;

  return (
    <AppSurface variant="card" padding="xl" style={styles.hero}>
      <View style={[styles.heroIcon, { backgroundColor: toneBackground }]}>{icon}</View>
      <Text style={[styles.heroTitle, { color: theme.text }, isRTL && styles.rtlText]}>
        {title}
      </Text>
      <Text style={[styles.heroSubtitle, { color: theme.textSecondary }, isRTL && styles.rtlText]}>
        {subtitle}
      </Text>
      <Text style={[styles.introText, { color: theme.text }, isRTL && styles.rtlText]}>
        {intro}
      </Text>
    </AppSurface>
  );
}

export function LegalSection({ icon, title, text }: LegalSectionProps) {
  const theme = useTheme();
  const { isRTL } = useLanguage();

  return (
    <AppSurface variant="card" padding="lg">
      <View style={[styles.sectionHeader, isRTL && styles.rowRTL]}>
        <View style={[styles.sectionIcon, { backgroundColor: theme.backgroundElement }]}>
          {icon}
        </View>
        <Text style={[styles.sectionTitle, { color: theme.text }, isRTL && styles.rtlText]}>
          {title}
        </Text>
      </View>
      <Text
        selectable
        style={[styles.sectionText, { color: theme.textSecondary }, isRTL && styles.rtlText]}
      >
        {text}
      </Text>
    </AppSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTextWrapper: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
  headerTitle: {
    ...Typography.h2,
  },
  headerMeta: {
    ...Typography.caption,
  },
  scrollContent: {
    paddingTop: Spacing.lg,
  },
  contentContainer: {
    width: '100%',
    maxWidth: Layout.readingContentWidth,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  hero: {
    alignItems: 'center',
    borderRadius: Radius.lg,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    ...Typography.h1,
    width: '100%',
    textAlign: 'center',
  },
  heroSubtitle: {
    ...Typography.small,
    fontWeight: '600',
    width: '100%',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  introText: {
    ...Typography.body,
    width: '100%',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionTitle: {
    ...Typography.h3,
    flex: 1,
  },
  sectionText: {
    ...Typography.body,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
