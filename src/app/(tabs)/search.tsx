import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import { useLanguage } from '@/hooks/use-language';
import { useTheme } from '@/hooks/use-theme';
import { Search as SearchIcon, X, Heart, Play, Sparkles, Star, Film, Clapperboard, Tv, Flame, Compass, SlidersHorizontal } from 'lucide-react-native';
import { getDeletedMediaIds, getEditedMediaOverrides } from '@/lib/admin-operations';
import { supabase } from '@/lib/supabase';
import { useFavorites, AnimeItem, MediaCategory } from '@/hooks/useFavorites';
import { DEFAULT_CATALOG } from './index';
import { useResponsive } from '@/hooks/useResponsive';
import { EmptyState } from '@/components/EmptyState';
import { MediaCardSkeleton } from '@/components/MediaCardSkeleton';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { PrimaryGradient } from '@/components/PrimaryGradient';

const CATEGORIES: { id: 'All' | MediaCategory; label: string; icon: any }[] = [
  { id: 'All', label: 'All Categories', icon: Compass },
  { id: 'Movies', label: 'Movies', icon: Film },
  { id: 'Anime Movies', label: 'Anime', icon: Clapperboard },
  { id: 'K-Drama', label: 'K-Drama', icon: Sparkles },
  { id: 'Drama', label: 'Drama', icon: Tv },
  { id: 'Anime Series', label: 'Series', icon: Flame },
];

const GENRES = ['All', 'Action', 'Drama', 'Romance', 'Sci-Fi', 'Thriller', 'Fantasy', 'Comedy', 'Horror'];

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=80',
];

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const themeColors = useTheme();
  const { language } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { numCols, cardWidth, cardGap, pagePad, maxContentWidth } = useResponsive();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | MediaCategory>((params.category as MediaCategory) || 'All');
  const [selectedGenre, setSelectedGenre] = useState((params.genre as string) || 'All');

  useEffect(() => {
    if (params.category) setSelectedCategory(params.category as MediaCategory);
    if (params.genre) setSelectedGenre(params.genre as string);
  }, [params.category, params.genre]);

  const [mediaList, setMediaList] = useState<AnimeItem[]>(DEFAULT_CATALOG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [deletedIds, overrides] = await Promise.all([
          getDeletedMediaIds(),
          getEditedMediaOverrides(),
        ]);
        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 1500)
        );

        const fetchPromise = supabase
          .from('anime')
          .select('id, title, description, image_url, episodes, genre, category, is_featured')
          .order('created_at', { ascending: false });

        const result = (await Promise.race([fetchPromise, timeoutPromise])) as any;
        const { data, error } = result || {};

        let combined: AnimeItem[] = [];
        const safeData = (!error && data) ? data : [];
        
        const customItems = safeData
          .filter((item: any) => !deletedIds.includes(item.id))
          .map((item: any) => ({
            ...item,
            category: item.category || 'Anime Series',
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

        setMediaList(uniqueCombined);
      } catch (err) {
        console.warn('Error loading search data:', err);
        setMediaList(DEFAULT_CATALOG);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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

  const getImage = (anime: AnimeItem) => {
    if (anime.image_url) return anime.image_url;
    const strId = String(anime?.id || '');
    const numericPart = strId.replace(/\D/g, '').slice(-2) || '0';
    const idx = Math.abs(parseInt(numericPart, 10)) % PLACEHOLDER_IMAGES.length;
    return PLACEHOLDER_IMAGES[idx || 0];
  };

  const handleWatch = (id: string) => {
    router.push({ pathname: '/watch', params: { id } });
  };

  const renderStandardCard = ({ item }: { item: AnimeItem }) => {
    const favorited = isFavorite(item.id);

    return (
      <Pressable
        style={[styles.standardCard, { width: cardWidth }]}
        onPress={() => handleWatch(item.id)}
      >
        <View style={[styles.posterCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border, height: cardWidth * 1.45 }]}>
          <Image source={{ uri: getImage(item) }} style={styles.posterImage} resizeMode="cover" />
          <View style={styles.cardImageOverlay} />

          {item.category && (
            <View style={[styles.cardCategoryBadge, { backgroundColor: themeColors.primary }]}>
              <PrimaryGradient borderRadius={4} />
              <Text style={styles.cardCategoryText}>{item.category.toUpperCase()}</Text>
            </View>
          )}

          <Pressable
            style={[
              styles.cardHeartBtn,
              {
                backgroundColor: favorited ? 'rgba(3, 86, 197, 0.35)' : 'rgba(0,0,0,0.5)',
                borderColor: favorited ? themeColors.primary : 'rgba(255,255,255,0.2)',
              },
            ]}
            onPress={(e) => {
              e.stopPropagation?.();
              toggleFavorite(item);
            }}
          >
            <Heart
              color={favorited ? themeColors.primary : '#FFFFFF'}
              fill={favorited ? themeColors.primary : 'rgba(0,0,0,0.4)'}
              size={14}
            />
          </Pressable>

          <View style={styles.centerPlayCircle}>
            <View style={[styles.playCircleInner, { backgroundColor: themeColors.primary }]}>
              <Play size={12} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </View>

          <View style={styles.epBadge}>
            <Text style={styles.epBadgeText}>
              {item.episodes > 1 ? `${item.episodes} EPS` : 'MOVIE'}
            </Text>
          </View>
        </View>

        <View style={styles.standardCardInfo}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={1}>
            {language === 'ku' && item.title_ku ? item.title_ku : item.title}
          </Text>
          <View style={styles.cardMetaRow}>
            <Star size={10} color="#FFB800" fill="#FFB800" />
            <Text style={[styles.cardRatingText, { color: themeColors.textSecondary }]}>9.8</Text>
            <Text style={[styles.cardMetaDot, { color: themeColors.textSecondary }]}>·</Text>
            <Text style={[styles.cardMeta, { color: themeColors.textSecondary }]} numberOfLines={1}>
              {item.genre ?? item.category ?? 'Stream'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const pageTitle = selectedCategory === 'All' ? 'Browse Catalog' : selectedCategory;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GlobalNavbar title={pageTitle} showBrandLogo={false} />

      <View style={[styles.contentWrapper, { maxWidth: maxContentWidth }]}>
        {/* 🔍 Search Input Bar */}
        <View style={styles.searchHeader}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border },
            ]}
          >
            <SearchIcon color={themeColors.textSecondary} size={18} />
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              placeholder="Search anime, movies, series, or genres..."
              placeholderTextColor={themeColors.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} style={styles.clearBtn}>
                <X color={themeColors.textSecondary} size={16} />
              </Pressable>
            )}
          </View>


        </View>

        {loading ? (
          <View style={{ padding: pagePad, flexDirection: 'row', flexWrap: 'wrap', gap: cardGap }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredList}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderStandardCard}
            numColumns={numCols}
            key={`search-grid-${numCols}`}
            contentContainerStyle={{ padding: pagePad, paddingBottom: 60 }}
            columnWrapperStyle={numCols > 1 ? { gap: cardGap, marginBottom: cardGap } : undefined}
            ListHeaderComponent={
              <View style={styles.filterContainer}>


                {/* 📊 RESULT HEADER */}
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Sparkles color={themeColors.primary} size={18} />
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                      {selectedCategory === 'All' ? 'Catalog Titles' : selectedCategory}
                    </Text>
                  </View>
                  <Text style={[styles.sectionCount, { color: themeColors.textSecondary }]}>
                    {filteredList.length} Titles Found
                  </Text>
                </View>
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                icon={SearchIcon}
                title="No Results Found"
                description="Try searching with a different title or clearing your genre filters."
                actionLabel="Clear Search Filters"
                onAction={() => {
                  setQuery('');
                  setSelectedCategory('All');
                  setSelectedGenre('All');
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    fontWeight: '600',
  },
  clearBtn: {
    padding: 4,
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
    marginBottom: 16,
    gap: 12,
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
    paddingVertical: 8,
    borderRadius: 20,
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
    paddingVertical: 6,
    borderRadius: 14,
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
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  standardCard: {
    marginBottom: 12,
  },
  posterCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  cardImageOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  cardCategoryBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 5,
    overflow: 'hidden',
  },
  cardCategoryText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  cardHeartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    zIndex: 5,
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
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  cardRatingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMetaDot: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
});
