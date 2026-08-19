import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { Search as SearchIcon, X, Heart, Play, Sparkles } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useFavorites, AnimeItem, MediaCategory } from '@/hooks/useFavorites';
import { DEFAULT_CATALOG, CATEGORIES } from './index';
import { useResponsive } from '@/hooks/useResponsive';

const GENRES = ['All', 'Action', 'Drama', 'Romance', 'Sci-Fi', 'Thriller', 'Fantasy', 'Comedy', 'Horror'];

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=80',
];

export default function SearchScreen() {
  const router = useRouter();
  const themeColors = Colors.dark;
  const { isFavorite, toggleFavorite } = useFavorites();
  const { numCols, cardWidth, cardGap, pagePad, maxContentWidth, isDesktop } = useResponsive();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | MediaCategory>('All');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [mediaList, setMediaList] = useState<AnimeItem[]>(DEFAULT_CATALOG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase
          .from('anime')
          .select('id, title, description, image_url, episodes, genre, category, is_featured')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const customItems = data.map((item) => ({
            ...item,
            category: item.category || 'Anime Series',
          })) as AnimeItem[];
          setMediaList([...customItems, ...DEFAULT_CATALOG]);
        } else {
          setMediaList(DEFAULT_CATALOG);
        }
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

  const handleWatch = (id: string) => {
    router.push({ pathname: '/watch', params: { id } });
  };

  const renderCard = ({ item }: { item: AnimeItem }) => {
    const favorited = isFavorite(item.id);
    return (
      <View style={[styles.card, { backgroundColor: themeColors.backgroundCard, width: cardWidth }]}>
        <Pressable onPress={() => handleWatch(item.id)} style={styles.imageContainer}>
          <Image
            source={{ uri: item.image_url || PLACEHOLDER_IMAGES[0] }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.playOverlay}>
            <View style={[styles.playCircle, { backgroundColor: themeColors.primary }]}>
              <Play color="#fff" size={16} fill="#fff" />
            </View>
          </View>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category.toUpperCase()}</Text>
            </View>
          )}
          <Pressable
            style={styles.heartButton}
            onPress={(e) => {
              e.stopPropagation?.();
              toggleFavorite(item);
            }}
          >
            <Heart
              color={favorited ? '#E50914' : '#fff'}
              fill={favorited ? '#E50914' : 'rgba(0,0,0,0.5)'}
              size={18}
            />
          </Pressable>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.episodes > 1 ? `${item.episodes} EPS` : 'MOVIE'}
            </Text>
          </View>
        </Pressable>

        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.cardGenre, { color: themeColors.textSecondary }]} numberOfLines={1}>
            {item.genre ?? item.category ?? 'Stream'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: maxContentWidth }]}>
        {/* 🔍 Search Input Bar */}
        <View style={styles.searchHeader}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: themeColors.backgroundElement,
                maxWidth: isDesktop ? 680 : undefined,
                alignSelf: isDesktop ? 'center' : undefined,
                width: '100%',
              },
            ]}
          >
            <SearchIcon color={themeColors.textSecondary} size={20} />
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              placeholder="Search AniFlix (Anime, Movies, K-Drama, Series)..."
              placeholderTextColor={themeColors.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} style={styles.clearBtn}>
                <X color={themeColors.textSecondary} size={18} />
              </Pressable>
            )}
          </View>
        </View>

        {/* 🏷️ Category Filter Pills */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryPill,
                    isSelected
                      ? [styles.categoryPillActive, { backgroundColor: themeColors.primary }]
                      : { backgroundColor: themeColors.backgroundElement },
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.categoryPillText,
                      { color: isSelected ? '#fff' : themeColors.textSecondary },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* 🏷️ Genre Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genreScroll}
          >
            {GENRES.map((genre) => {
              const isSelected = selectedGenre === genre;
              return (
                <Pressable
                  key={genre}
                  style={[
                    styles.genreChip,
                    isSelected
                      ? [styles.genreChipActive, { backgroundColor: themeColors.accentCyan }]
                      : { backgroundColor: themeColors.backgroundElement },
                  ]}
                  onPress={() => setSelectedGenre(genre)}
                >
                  <Text
                    style={[
                      styles.genreChipText,
                      { color: isSelected ? '#000' : themeColors.textSecondary },
                    ]}
                  >
                    {genre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 📊 Results Count Header */}
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: themeColors.textSecondary }]}>
            Showing {filteredList.length} results
          </Text>
        </View>

        {/* 🎬 Grid of Results */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredList}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderCard}
            numColumns={numCols}
            key={`search-grid-${numCols}`}
            columnWrapperStyle={numCols > 1 ? { gap: cardGap, marginBottom: cardGap } : undefined}
            contentContainerStyle={[styles.grid, { padding: pagePad, paddingTop: 4, paddingBottom: 40 }]}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Sparkles color={themeColors.textSecondary} size={48} />
                <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No results</Text>
                <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
                  Attempt a different search or explore the categories above.
                </Text>
              </View>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#242436',
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  filterSection: {
    gap: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#242436',
  },
  categoryPillActive: {
    borderColor: 'transparent',
  },
  categoryIcon: {
    fontSize: 12,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  genreScroll: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 6,
  },
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242436',
  },
  genreChipActive: {
    borderColor: 'transparent',
  },
  genreChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexGrow: 1,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#242436',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    position: 'relative',
    backgroundColor: '#12121A',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardGenre: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
