import { useCallback, useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useLanguage } from '@/hooks/use-language';
import { useTheme } from '@/hooks/use-theme';
import { Search as SearchIcon, X, Heart, Film, Clapperboard, Tv, Flame, Compass, Sparkles } from 'lucide-react-native';
import { getDeletedMediaIds, getEditedMediaOverrides } from '@/lib/admin-operations';
import { supabase } from '@/lib/supabase';
import { useFavorites, AnimeItem, MediaCategory } from '@/hooks/useFavorites';
import { DEFAULT_CATALOG } from './index';
import { useResponsive } from '@/hooks/useResponsive';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { MediaCardSkeleton } from '@/components/MediaCardSkeleton';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { AdMobBanner } from '@/components/AdMobBanner';
import { AppSectionHeader, AppTextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { releaseWebFocus } from '@/lib/web-focus';

const CATEGORIES: { id: 'All' | MediaCategory; label: string; icon: any }[] = [
  { id: 'All', label: 'All Categories', icon: Compass },
  { id: 'Movies', label: 'Movies', icon: Film },
  { id: 'Anime Movies', label: 'Anime', icon: Clapperboard },
  { id: 'K-Drama', label: 'K-Drama', icon: Sparkles },
  { id: 'Drama', label: 'Drama', icon: Tv },
  { id: 'Anime Series', label: 'Series', icon: Flame },
];

const GENRES = ['All', 'Action', 'Drama', 'Romance', 'Sci-Fi', 'Thriller', 'Fantasy', 'Comedy', 'Horror'];

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const themeColors = useTheme();
  const { language, t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { numCols, cardWidth, cardGap, pagePad, maxContentWidth } = useResponsive();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | MediaCategory>((params.category as MediaCategory) || 'All');
  const [selectedGenre, setSelectedGenre] = useState((params.genre as string) || 'All');
  const hasActiveFilters = selectedCategory !== 'All' || selectedGenre !== 'All';

  const getCategoryLabel = (id: string, fallback: string) => {
    if (id === 'All') return t('catAll', fallback);
    if (id === 'Movies') return t('catMovies', fallback);
    if (id === 'Anime Movies') return t('catAnimeMovies', fallback);
    if (id === 'K-Drama') return t('catKDrama', fallback);
    if (id === 'Drama') return t('catDrama', fallback);
    if (id === 'Anime Series') return t('catAnimeSeries', fallback);
    return fallback;
  };

  useEffect(() => {
    if (params.category) setSelectedCategory(params.category as MediaCategory);
    if (params.genre) setSelectedGenre(params.genre as string);
  }, [params.category, params.genre]);

  const [mediaList, setMediaList] = useState<AnimeItem[]>(DEFAULT_CATALOG);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useFocusEffect(useCallback(() => {
    let cancelled = false;

    async function loadData(requestVersion: number) {
      setLoading(true);
      setLoadError(null);
      try {
        const [deletedIds, overrides] = await Promise.all([
          getDeletedMediaIds(),
          getEditedMediaOverrides(),
        ]);
        if (cancelled) return;

        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error(`Catalog request timed out (attempt ${requestVersion + 1})`) }), 8000)
        );

        const fetchPromise = supabase
          .from('anime')
          .select('id, title, description, image_url, episodes, genre, category, is_featured')
          .order('created_at', { ascending: false });

        const result = (await Promise.race([fetchPromise, timeoutPromise])) as any;
        if (cancelled) return;
        const { data, error } = result || {};
        if (error) throw error;

        const safeData = Array.isArray(data) ? data : [];
        
        const customItems = safeData
          .filter((item: any) => !deletedIds.includes(item.id))
          .map((item: any) => ({
            ...item,
            ...(overrides[item.id] || {}),
          })) as AnimeItem[];
          
        const defaultItems = DEFAULT_CATALOG
          .filter((d: any) => !deletedIds.includes(d.id))
          .map((d: any) => ({ ...d, ...(overrides[d.id] || {}) }));
          
        const newLocalItems = Object.values(overrides)
          .filter((override: any) => !deletedIds.includes(override.id) && !safeData.some((d: any) => d.id === override.id) && !DEFAULT_CATALOG.some((d: any) => d.id === override.id)) as AnimeItem[];

        // Deduplicate combined list by unique ID
        const seenIds = new Set<string>();
        const uniqueCombined: AnimeItem[] = [];

        [...newLocalItems, ...customItems, ...defaultItems].forEach((item) => {
          if (item && item.id && !seenIds.has(String(item.id))) {
            seenIds.add(String(item.id));
            uniqueCombined.push(item);
          }
        });

        if (!cancelled) setMediaList(uniqueCombined);
      } catch (err) {
        if (cancelled) return;
        console.warn('Error loading search data:', err);
        setMediaList([]);
        setLoadError(err instanceof Error ? err.message : 'Could not load the catalog.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadData(reloadKey);
    return () => {
      cancelled = true;
    };
  }, [reloadKey]));

  const filteredList = mediaList.filter((item) => {
    const matchesQuery =
      query.trim() === '' ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item.genre && item.genre.toLowerCase().includes(query.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(query.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;

    const matchesGenre =
      selectedGenre === 'All' ||
      (item.genre && item.genre.toLowerCase().includes(selectedGenre.toLowerCase()));

    return matchesQuery && matchesCategory && matchesGenre;
  });

  const handleWatch = (id: string) => {
    releaseWebFocus();
    router.push({ pathname: '/watch', params: { id } });
  };

  const resetFilters = () => {
    setSelectedCategory('All');
    setSelectedGenre('All');
  };

  const renderStandardCard = ({ item }: { item: AnimeItem }) => {
    const favorited = isFavorite(item.id);
    const cardImg = item?.image_url && String(item.image_url).trim().length > 0
      ? String(item.image_url).trim()
      : null;

    return (
      <View
        style={[styles.standardCard, { width: cardWidth }]}
      >
        <View style={{ position: 'relative', height: cardWidth * 1.45 }}>
          <Pressable
            style={({ pressed }) => [
              styles.posterCard,
              { backgroundColor: themeColors.backgroundCard, height: cardWidth * 1.45, opacity: pressed ? 0.84 : 1 },
            ]}
            onPress={() => handleWatch(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${language === 'ku' && item.title_ku ? item.title_ku : item.title}`}
          >
            {cardImg ? (
              <Image
                source={cardImg}
                style={styles.posterImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={120}
              />
            ) : (
              <View style={[styles.posterImage, styles.posterPlaceholder, { backgroundColor: themeColors.backgroundElement }]}>
                <Film color={themeColors.textMuted} size={28} />
                <Text style={[styles.posterPlaceholderText, { color: themeColors.textMuted }]}>
                  {language === 'ku' ? 'وێنە بەردەست نییە' : 'Artwork unavailable'}
                </Text>
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
            style={({ pressed }) => [
              styles.cardHeartBtn,
              {
                backgroundColor: favorited ? themeColors.primary : 'rgba(7,9,13,0.66)',
                opacity: pressed ? 0.72 : 1,
              },
            ]}
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
          style={({ pressed }) => [styles.standardCardInfo, pressed && { opacity: 0.72 }]}
          onPress={() => handleWatch(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Open details for ${language === 'ku' && item.title_ku ? item.title_ku : item.title}`}
        >
          <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={1}>
            {language === 'ku' && item.title_ku ? item.title_ku : item.title}
          </Text>
          {(item.genre || item.category) && <View style={styles.cardMetaRow}>
            <Text style={[styles.cardMeta, { color: themeColors.textSecondary }]} numberOfLines={1}>
              {item.genre ?? getCategoryLabel(item.category ?? '', item.category ?? '')}
            </Text>
          </View>}
        </Pressable>
      </View>
    );
  };

  const pageTitle = selectedCategory === 'All'
    ? t('browseMedia', 'Browse Catalog')
    : getCategoryLabel(selectedCategory, selectedCategory);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GlobalNavbar title={pageTitle} showBrandLogo={false} />

      <View style={[styles.contentWrapper, { maxWidth: maxContentWidth }]}>
        <View style={[styles.searchHeader, { paddingHorizontal: pagePad }]}>
          <AppTextField
            leftIcon={<SearchIcon color={themeColors.textSecondary} size={18} />}
            rightIcon={query.length > 0 ? <X color={themeColors.textSecondary} size={18} /> : undefined}
            onRightIconPress={query.length > 0 ? () => setQuery('') : undefined}
            rightIconLabel={language === 'ku' ? 'سڕینەوەی گەڕان' : 'Clear search'}
            placeholder={t('searchPlaceholder', 'Search anime, movies, series, or genres...')}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel={language === 'ku' ? 'گەڕان لە کەتەلۆگ' : 'Search catalog'}
          />
        </View>

        {loading ? (
          <View style={{ padding: pagePad, flexDirection: 'row', flexWrap: 'wrap', gap: cardGap }}>
            {Array.from({ length: Math.max(numCols * 2, 4) }).map((_, i) => (
              <MediaCardSkeleton key={i} width={cardWidth} height={cardWidth * 1.45} />
            ))}
          </View>
        ) : loadError ? (
          <ErrorState
            message={language === 'ku'
              ? 'کەتەلۆگ بار نەبوو. پەیوەندی ئینتەرنێتەکەت بپشکنە و دووبارە هەوڵ بدە.'
              : "Couldn't load the catalog. Check your connection and try again."}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        ) : (
          <FlatList
            data={filteredList}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderStandardCard}
            numColumns={numCols}
            key={`search-grid-${numCols}`}
            contentContainerStyle={{ padding: pagePad, paddingBottom: 60 }}
            columnWrapperStyle={numCols > 1 ? { gap: cardGap, marginBottom: cardGap } : undefined}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View style={styles.filterContainer}>
                <View style={styles.filterLabelRow}>
                  <Text style={[styles.filterLabel, { color: themeColors.textSecondary }]}>
                    {language === 'ku' ? 'بەش' : 'Category'}
                  </Text>
                  {hasActiveFilters && (
                    <Pressable
                      onPress={resetFilters}
                      style={({ pressed }) => [styles.resetFiltersBtn, pressed && { opacity: 0.65 }]}
                      accessibilityRole="button"
                      accessibilityLabel="Reset category and genre filters"
                    >
                      <Text style={[styles.resetFiltersText, { color: themeColors.primary }]}>
                        {language === 'ku' ? 'پاککردنەوە' : 'Reset'}
                      </Text>
                    </Pressable>
                  )}
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryContent}
                >
                  {CATEGORIES.map(({ id, label, icon: Icon }) => {
                    const isSelected = selectedCategory === id;
                    const localizedLabel = getCategoryLabel(id, label);
                    return (
                      <Pressable
                        key={id}
                        onPress={() => setSelectedCategory(id)}
                        style={({ pressed }) => [
                          styles.categoryChip,
                          {
                            backgroundColor: isSelected ? themeColors.backgroundSelected : themeColors.backgroundElement,
                            borderColor: isSelected ? themeColors.primary : themeColors.border,
                            opacity: pressed ? 0.72 : 1,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${language === 'ku' ? 'پاڵاوتن بە' : 'Filter by'} ${localizedLabel}`}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Icon size={14} color={isSelected ? themeColors.primary : themeColors.textSecondary} />
                        <Text style={[styles.categoryText, { color: isSelected ? themeColors.primary : themeColors.text }]}>
                          {localizedLabel}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text style={[styles.filterLabel, { color: themeColors.textSecondary }]}>{t('genre', 'Genre')}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.genreContent}
                >
                  {GENRES.map((genre) => {
                    const isSelected = selectedGenre === genre;
                    return (
                      <Pressable
                        key={genre}
                        onPress={() => setSelectedGenre(genre)}
                        style={({ pressed }) => [
                          styles.genreChip,
                          {
                            backgroundColor: isSelected ? themeColors.backgroundSelected : themeColors.backgroundElement,
                            borderColor: isSelected ? themeColors.primary : themeColors.border,
                            opacity: pressed ? 0.72 : 1,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Filter by ${genre} genre`}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text style={[styles.genreText, { color: isSelected ? themeColors.primary : themeColors.text }]}>
                          {genre}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <AppSectionHeader
                  style={styles.sectionHeader}
                  title={selectedCategory === 'All'
                    ? t('allPublishedMedia', 'Catalog')
                    : getCategoryLabel(selectedCategory, selectedCategory)}
                  action={
                    <Text style={[styles.sectionCount, { color: themeColors.textSecondary }]}>
                      {language === 'ku' ? `${filteredList.length} بەرهەم` : `${filteredList.length} titles`}
                    </Text>
                  }
                />
              </View>
            }
            ListFooterComponent={
              filteredList.length > 0 ? (
                <AdMobBanner placement="search_bottom" style={{ marginTop: 16 }} />
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                icon={SearchIcon}
                title={t('noSearchResults', 'No results found')}
                description={t('noSearchResultsSub', 'Try a different search or clear the active filters.')}
                actionLabel={language === 'ku' ? 'پاککردنەوەی گەڕان و پاڵێوەرەکان' : 'Clear search and filters'}
                onAction={() => {
                  setQuery('');
                  resetFilters();
                }}
              />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  searchHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    fontWeight: '500',
  },
  clearBtn: {
    width: 44,
    height: 44,
    marginRight: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingWrap: {
    marginTop: 10,
    gap: 6,
  },
  trendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendingTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  trendingScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  trendingChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  trendingTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  filterContainer: {
    marginBottom: 18,
    gap: 12,
  },
  filterLabelRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  resetFiltersBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetFiltersText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryContent: {
    gap: 8,
    paddingHorizontal: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 44,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  categoryText: {
    fontSize: 12,
  },
  genreContent: {
    gap: 6,
    paddingHorizontal: 2,
  },
  genreChip: {
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  genreText: {
    fontSize: 11,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  standardCard: {
    marginBottom: 16,
  },
  posterCard: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  posterPlaceholderText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardImageOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.10)',
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
    overflow: 'hidden',
  },
  cardCategoryText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.45,
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
  epBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
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
    fontSize: 11,
    fontWeight: '600',
  },
  cardMetaDot: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 11,
    fontWeight: '500',
  },
});
