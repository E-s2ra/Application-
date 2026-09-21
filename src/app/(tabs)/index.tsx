import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  AccessibilityInfo,
  AppState,
} from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import {
  Play,
  Heart,
  Sparkles,
  Compass,
  ChevronLeft,
  ChevronRight,
  Film,
  Clapperboard,
  Tv,
  Flame,
} from 'lucide-react-native';
import { useFavorites, AnimeItem, MediaCategory } from '@/hooks/useFavorites';
import { MediaService } from '@/services/media.service';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/hooks/useResponsive';
import { AdMobBanner } from '@/components/AdMobBanner';
import { ErrorState } from '@/components/ErrorState';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { releaseWebFocus } from '@/lib/web-focus';

export const CATEGORIES: { id: 'All' | MediaCategory; label: string; icon: any }[] = [
  { id: 'All', label: 'All', icon: Compass },
  { id: 'Movies', label: 'Movies', icon: Film },
  { id: 'Anime Movies', label: 'Anime Movies', icon: Clapperboard },
  { id: 'K-Drama', label: 'K-Drama', icon: Tv },
  { id: 'Drama', label: 'Drama', icon: Flame },
  { id: 'Anime Series', label: 'Anime Series', icon: Sparkles },
];

export const DEFAULT_CATALOG: AnimeItem[] = [];

export default function HomeScreen() {
  const router = useRouter();
  const themeColors = useTheme();
  const { t, language, isRTL } = useLanguage();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };
  const { isFavorite, toggleFavorite } = useFavorites();
  const {
    heroHeight,
    railCardWidth,
    maxContentWidth,
    isDesktop,
    isTablet,
    contentWidth,
    pagePad,
  } = useResponsive();

  const [allMedia, setAllMedia] = useState<AnimeItem[]>(DEFAULT_CATALOG);
  const [activeCategory] = useState<'All' | MediaCategory>('All');
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  const heroFlatListRef = useRef<FlatList>(null);
  const heroWidth = Math.max(0, Math.min(contentWidth - pagePad * 2, maxContentWidth - pagePad * 2));
  const gridGap = Spacing.lg;
  const gridNumColumns = Math.max(2, Math.floor((heroWidth + gridGap) / (railCardWidth + gridGap)));
  const gridCardWidth = Math.max(
    1,
    Math.floor((heroWidth - gridGap * (gridNumColumns - 1)) / gridNumColumns)
  );
  const isAdmin = profile?.role === 'admin';

  const getCategoryLabel = (id: string, defaultLabel: string) => {
    if (id === 'All') return t('catAll', defaultLabel);
    if (id === 'Movies') return t('catMovies', defaultLabel);
    if (id === 'Anime Movies') return t('catAnimeMovies', defaultLabel);
    if (id === 'K-Drama') return t('catKDrama', defaultLabel);
    if (id === 'Drama') return t('catDrama', defaultLabel);
    if (id === 'Anime Series') return t('catAnimeSeries', defaultLabel);
    return defaultLabel;
  };

  const fetchMedia = useCallback(async (forceRefresh = false) => {
    try {
      setLoadError(null);
      const items = await MediaService.getCatalog(0, undefined, { forceRefresh });
      const seenIds = new Set<string>();
      const uniqueItems: AnimeItem[] = [];
      items.forEach((item) => {
        if (item && item.id && !seenIds.has(String(item.id))) {
          seenIds.add(String(item.id));
          uniqueItems.push(item);
        }
      });
      setAllMedia(uniqueItems);
    } catch (err) {
      console.warn('[HomeScreen] fetchMedia error:', err);
      setLoadError('Could not load the catalog. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchMedia(false);
    }, [fetchMedia])
  );

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, [])
  );

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled).catch(() => {});
    const motionSub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotionEnabled);
    const appSub = AppState.addEventListener('change', (state) => setIsAppActive(state === 'active'));
    return () => {
      motionSub.remove();
      appSub.remove();
    };
  }, []);

  // Filter media by Category
  const categoryFiltered =
    activeCategory === 'All'
      ? allMedia
      : allMedia.filter((item) => item.category === activeCategory);

  // Featured Carousel List
  const featured = categoryFiltered.filter((a) => a.is_featured).length > 0
    ? categoryFiltered.filter((a) => a.is_featured)
    : categoryFiltered.slice(0, 5);

  // Auto-sliding Hero timer: 5 seconds
  useEffect(() => {
    if (featured.length <= 1 || !isScreenFocused || !isAppActive || reduceMotionEnabled) return;

    const timer = setInterval(() => {
      setCurrentHeroIndex((prev) => {
        const nextIndex = (prev + 1) % featured.length;
        heroFlatListRef.current?.scrollToIndex({ index: nextIndex, animated: !reduceMotionEnabled });
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [featured.length, isAppActive, isScreenFocused, reduceMotionEnabled]);

  const goToSlide = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= featured.length) return;
    setCurrentHeroIndex(newIndex);
    heroFlatListRef.current?.scrollToIndex({ index: newIndex, animated: !reduceMotionEnabled });
  };

  const nextHero = () => {
    if (featured.length === 0) return;
    goToSlide((currentHeroIndex + 1) % featured.length);
  };

  const prevHero = () => {
    if (featured.length === 0) return;
    goToSlide((currentHeroIndex - 1 + featured.length) % featured.length);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchMedia(true);
  }, [fetchMedia]);

  const retryLoad = useCallback(() => {
    setLoading(true);
    void fetchMedia(true);
  }, [fetchMedia]);

  const handleWatch = (id: string) => {
    releaseWebFocus();
    router.push({ pathname: '/watch', params: { id } });
  };

  const renderHeroSlide = ({ item }: { item: AnimeItem }) => {
    const favorited = isFavorite(item.id);
    const heroImgUri = item?.image_url && String(item.image_url).trim().length > 0
      ? String(item.image_url).trim()
      : null;

    return (
      <View style={[styles.heroSlideItem, { width: heroWidth, height: heroHeight }]}>
        {heroImgUri ? (
          <Image
            source={heroImgUri}
            style={styles.heroBackdrop}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={120}
          />
        ) : (
          <View style={[styles.heroBackdrop, styles.artworkPlaceholder, { backgroundColor: themeColors.backgroundElement }]}>
            <Film color={themeColors.textMuted} size={44} />
            <Text style={[styles.artworkPlaceholderText, { color: themeColors.textMuted }]}>Artwork unavailable</Text>
          </View>
        )}
        <View style={styles.heroDarkGradient} />

        <View style={[styles.heroContent, isDesktop && styles.heroContentDesktop]}>
          <View style={styles.heroEyebrow}>
            <View style={[styles.heroAccentDot, { backgroundColor: themeColors.primary }]} />
            <Text style={styles.heroEyebrowText}>
              {item.category ? getCategoryLabel(item.category, item.category).toUpperCase() : 'FEATURED'}
            </Text>
            {item.genre ? (
              <>
                <Text style={styles.heroMetaText}>•</Text>
                <Text style={styles.heroMetaText}>{item.genre}</Text>
              </>
            ) : null}
            {item.episodes > 1 ? (
              <>
                <Text style={styles.heroMetaText}>•</Text>
                <Text style={styles.heroMetaText}>{item.episodes} EPS</Text>
              </>
            ) : null}
          </View>

          <Text
            style={[
              styles.heroTitle,
              { fontSize: isDesktop ? 34 : isTablet ? 28 : 22 },
            ]}
            numberOfLines={2}
          >
            {language === 'ku' && item.title_ku ? item.title_ku : item.title}
          </Text>

          {item.description ? (
            <Text
              style={[
                styles.heroDesc,
                { maxWidth: isDesktop ? 650 : isTablet ? 500 : undefined },
              ]}
              numberOfLines={isDesktop ? 3 : 2}
            >
              {language === 'ku' && item.description_ku ? item.description_ku : item.description}
            </Text>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.heroActions}>
            <Pressable
              style={({ pressed }) => [
                styles.playBtn,
                { backgroundColor: themeColors.primary, opacity: pressed ? 0.82 : 1 },
              ]}
              onPress={() => handleWatch(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Watch ${item.title}`}
            >
              <Play color="#FFFFFF" size={16} fill="#FFFFFF" />
              <Text style={styles.playBtnText}>{t('watchNow', 'Watch Now')}</Text>
            </Pressable>

            <Pressable
              style={[
                styles.listBtn,
                { backgroundColor: favorited ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)' },
              ]}
              onPress={() => toggleFavorite(item)}
              accessibilityRole="button"
              accessibilityLabel={favorited ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
              accessibilityState={{ selected: favorited }}
            >
              <Heart
                color={favorited ? themeColors.primary : '#FFFFFF'}
                fill={favorited ? themeColors.primary : 'none'}
                size={16}
              />
              <Text
                style={[
                  styles.listBtnText,
                  { color: favorited ? themeColors.primary : '#FFFFFF' },
                ]}
              >
                {favorited ? t('inList', 'In My List') : `+ ${t('addToList', 'My List')}`}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderStandardCard = ({ item }: { item: AnimeItem }) => {
    const favorited = isFavorite(item.id);
    const cardImg = (item?.image_url && String(item.image_url).trim().length > 0)
      ? String(item.image_url).trim()
      : null;

    return (
      <View
        style={[
          styles.standardCard,
          {
            backgroundColor: 'transparent',
            width: gridCardWidth,
          },
        ]}
      >
        <View style={{ position: 'relative', width: gridCardWidth, height: gridCardWidth * 1.45 }}>
          <Pressable
            style={[styles.standardImageWrapper, { width: gridCardWidth, height: gridCardWidth * 1.45 }]}
            onPress={() => handleWatch(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${language === 'ku' && item.title_ku ? item.title_ku : item.title}`}
          >
            {cardImg ? (
              <Image
                source={cardImg}
                style={styles.standardImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={120}
              />
            ) : (
              <View style={[styles.standardImage, styles.artworkPlaceholder, { backgroundColor: themeColors.backgroundElement }]}>
                <Film color={themeColors.textMuted} size={28} />
                <Text style={[styles.artworkPlaceholderText, { color: themeColors.textMuted }]}>No artwork</Text>
              </View>
            )}
            <View style={styles.cardImageOverlay} />

            {item.category && (
              <View style={styles.cardCategoryBadge}>
                <Text style={styles.cardCategoryText}>{getCategoryLabel(item.category, item.category).toUpperCase()}</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={[styles.cardHeartBtn, { backgroundColor: favorited ? themeColors.primary : 'rgba(7,9,13,0.66)' }]}
            onPress={() => toggleFavorite(item)}
            hitSlop={7}
            accessibilityRole="button"
            accessibilityLabel={favorited ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
            accessibilityState={{ selected: favorited }}
          >
            <Heart
              color={favorited ? themeColors.primary : '#FFFFFF'}
              fill={favorited ? themeColors.primary : 'rgba(0,0,0,0.4)'}
              size={14}
            />
          </Pressable>
        </View>

        <Pressable
          style={styles.standardCardInfo}
          onPress={() => handleWatch(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Open details for ${language === 'ku' && item.title_ku ? item.title_ku : item.title}`}
        >
          <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={1}>
            {language === 'ku' && item.title_ku ? item.title_ku : item.title}
          </Text>
          <View style={styles.cardMetaRow}>
            <Text style={[styles.cardMeta, { color: themeColors.textSecondary }]} numberOfLines={1}>
              {item.episodes > 1
                ? `${item.episodes} EPS${item.genre ? ` · ${item.genre}` : ''}`
                : item.genre || getCategoryLabel(item.category || '', item.category || '')}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background, direction: isRTL ? 'rtl' : 'ltr' }}>
      <GlobalNavbar showBrandLogo={true} />
      <View style={[styles.contentWrapper, { maxWidth: maxContentWidth }]}>
        <FlatList
          style={[styles.container, { backgroundColor: themeColors.background }]}
          data={loadError ? [] : categoryFiltered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStandardCard}
          numColumns={gridNumColumns}
          key={`home-grid-${gridNumColumns}`}
          columnWrapperStyle={gridNumColumns > 1 ? { gap: gridGap, paddingHorizontal: pagePad } : undefined}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 40, 64) }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {featured.length > 0 && !loadError && (
                <View style={[styles.heroSection, { height: heroHeight, marginHorizontal: pagePad }]}>
                  <FlatList
                    ref={heroFlatListRef}
                    data={featured}
                    keyExtractor={(item) => `hero-${item.id}`}
                    renderItem={renderHeroSlide}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={heroWidth}
                    decelerationRate="fast"
                    getItemLayout={(_, index) => ({
                      length: heroWidth,
                      offset: heroWidth * index,
                      index,
                    })}
                    onMomentumScrollEnd={(e) => {
                      const newIndex = Math.round(e.nativeEvent.contentOffset.x / heroWidth);
                      if (newIndex >= 0 && newIndex < featured.length) {
                        setCurrentHeroIndex(newIndex);
                      }
                    }}
                  />

                  {featured.length > 1 && (
                    <>
                      <Pressable
                        style={[styles.navArrow, styles.navArrowLeft]}
                        onPress={prevHero}
                        accessibilityRole="button"
                        accessibilityLabel="Previous featured title"
                      >
                        <ChevronLeft color="#FFFFFF" size={22} />
                      </Pressable>
                      <Pressable
                        style={[styles.navArrow, styles.navArrowRight]}
                        onPress={nextHero}
                        accessibilityRole="button"
                        accessibilityLabel="Next featured title"
                      >
                        <ChevronRight color="#FFFFFF" size={22} />
                      </Pressable>
                    </>
                  )}

                  {featured.length > 1 && (
                    <View style={styles.indicatorRow}>
                      {featured.map((_, idx) => (
                        <Pressable
                          key={idx}
                          onPress={() => goToSlide(idx)}
                          style={styles.dotTouchTarget}
                          accessibilityRole="button"
                          accessibilityLabel={`Show featured title ${idx + 1} of ${featured.length}`}
                          accessibilityState={{ selected: idx === currentHeroIndex }}
                        >
                          <View
                            style={[
                              styles.dot,
                              idx === currentHeroIndex
                                ? [styles.activeDot, { backgroundColor: themeColors.primary }]
                                : { backgroundColor: 'rgba(255,255,255,0.3)' },
                            ]}
                          />
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {!loadError && categoryFiltered.length > 0 && (
                <View style={{ paddingHorizontal: pagePad, paddingTop: 28 }}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                      {activeCategory === 'All' ? 'All titles' : getCategoryLabel(activeCategory, activeCategory)}
                    </Text>
                    <Text style={[styles.sectionCount, { color: themeColors.textSecondary }]}>
                      {categoryFiltered.length} Titles
                    </Text>
                  </View>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            loadError ? (
              <ErrorState message={loadError} onRetry={retryLoad} />
            ) : (
              <View style={[styles.emptyBox, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
                <Film size={40} color={themeColors.primary} style={{ marginBottom: 10 }} />
                <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
                  {t('noMediaTitle', 'No Products Published Yet')}
                </Text>
                <Text style={[styles.emptySub, { color: themeColors.textSecondary }]}>
                  {isAdmin
                    ? t('noMediaSub', 'Your cinema catalog is ready for its first published title.')
                    : language === 'ku'
                      ? 'لە ئێستادا هیچ ناونیشانێکی بڵاوکراوە بەردەست نییە.'
                      : 'There are no published titles available right now.'}
                </Text>
                {isAdmin && (
                  <Pressable
                    style={[styles.adminBtn, { backgroundColor: themeColors.primary }]}
                    onPress={() => router.push('/admin' as any)}
                    accessibilityRole="button"
                    accessibilityLabel="Open Admin Console"
                  >
                    <Film size={15} color="#FFFFFF" />
                    <Text style={styles.adminBtnText}>Admin Console</Text>
                  </Pressable>
                )}
              </View>
            )
          }
          ListFooterComponent={
            <AdMobBanner placement="home_bottom" style={{ paddingHorizontal: pagePad, marginTop: Spacing.xl }} />
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
  },
  contentWrapper: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuIconBtn: {
    marginRight: 4,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  desktopTagline: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  homeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  streakBadgeText: {
    color: '#0356C5',
    fontSize: 11,
    fontWeight: '800',
  },
  headerDivider: {
    color: '#444458',
    fontSize: 11,
  },
  coinsBadgeText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '800',
  },
  vipHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
  },
  vipHeaderBtnText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '900',
  },

  /* CATEGORIES */
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '800',
  },

  /* HERO BANNER SLIDER */
  heroSection: {
    position: 'relative',
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroSlideItem: {
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroDarkGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(5, 7, 11, 0.52)',
  },
  heroContent: {
    padding: 20,
    paddingBottom: 26,
    zIndex: 5,
  },
  heroContentDesktop: {
    padding: 40,
    paddingBottom: 44,
  },
  heroEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  heroAccentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroEyebrowText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  heroMetaText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.7,
    marginBottom: 8,
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 8,
  },
  playBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  listBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 8,
  },
  listBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  navArrow: {
    position: 'absolute',
    top: '45%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(7,9,13,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navArrowLeft: {
    left: 10,
  },
  navArrowRight: {
    right: 10,
  },
  indicatorRow: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 12,
    height: 3,
    borderRadius: 2,
  },
  activeDot: {
    width: 28,
    borderRadius: 2,
  },
  dotTouchTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -19,
  },

  /* RAILS & CARDS */
  railSection: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    ...Typography.h2,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  rankedList: {
    paddingHorizontal: 16,
    gap: 14,
  },
  rankedCardContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  rankNumber: {
    fontWeight: '900',
    lineHeight: 48,
    marginRight: -8,
  },
  posterCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0,
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  cardImageOverlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  centerPlayCircle: {
    position: 'absolute',
    top: '36%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    zIndex: 4,
  },
  playCircleInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    opacity: 0.9,
  },
  cardHeartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  cardCategoryBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(7,9,13,0.72)',
    zIndex: 5,
  },
  cardCategoryText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.45,
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(7, 9, 13, 0.82)',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  cardRatingText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '600',
  },
  cardMetaDot: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 10,
  },
  standardList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 4,
  },
  standardCard: {
    borderRadius: 0,
    overflow: 'visible',
  },
  standardImageWrapper: {
    position: 'relative',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  standardImage: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  artworkPlaceholderText: {
    fontSize: 10,
    fontWeight: '700',
  },
  epBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 4,
  },
  epBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  standardCardInfo: {
    paddingTop: 9,
    paddingHorizontal: 1,
  },

  /* EMPTY STATE */
  emptyBox: {
    padding: Spacing.xxl,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: Radius.lg,
    borderWidth: 0,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 17,
    marginBottom: 16,
  },
  adminBtn: {
    paddingHorizontal: 18,
    minHeight: 44,
    paddingVertical: 11,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
