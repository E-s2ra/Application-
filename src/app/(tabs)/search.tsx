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
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { Search as SearchIcon, X, Heart, Play, Sparkles } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useFavorites, AnimeItem } from '@/hooks/useFavorites';

const { width } = Dimensions.get('window');
const isLargeScreen = Platform.OS === 'web' && width > 768;
const CARD_WIDTH = isLargeScreen ? (width - 64) / 4 : (width - 48) / 2;

const GENRES = ['All', 'Action', 'Shonen', 'Fantasy', 'Adventure', 'Sci-Fi', 'Romance', 'Horror', 'Supernatural'];

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=80',
];

export default function SearchScreen() {
  const router = useRouter();
  const themeColors = Colors.dark;
  const { isFavorite, toggleFavorite } = useFavorites();

  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [animeList, setAnimeList] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase
          .from('anime')
          .select('id, title, description, image_url, episodes, genre, is_featured')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setAnimeList(data as AnimeItem[]);
        }
      } catch (err) {
        console.warn('Error loading search data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredList = animeList.filter((item) => {
    const matchesQuery =
      query.trim() === '' ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item.genre && item.genre.toLowerCase().includes(query.toLowerCase()));

    const matchesGenre =
      selectedGenre === 'All' ||
      (item.genre && item.genre.toLowerCase().includes(selectedGenre.toLowerCase()));

    return matchesQuery && matchesGenre;
  });

  const handleWatch = (id: string) => {
    router.push({ pathname: '/watch', params: { id } });
  };

  const renderCard = ({ item }: { item: AnimeItem }) => {
    const favorited = isFavorite(item.id);
    return (
      <View style={[styles.card, { backgroundColor: themeColors.backgroundCard, width: CARD_WIDTH }]}>
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
          {item.episodes > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.episodes} EPS</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.cardGenre, { color: themeColors.textSecondary }]} numberOfLines={1}>
            {item.genre ?? 'Anime Series'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* 🔍 Search Input Bar */}
      <View style={styles.searchHeader}>
        <View style={[styles.searchBar, { backgroundColor: themeColors.backgroundElement }]}>
          <SearchIcon color={themeColors.textSecondary} size={20} />
          <TextInput
            style={[styles.input, { color: themeColors.text }]}
            placeholder="Search anime title, genre, or keyword..."
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

      {/* 🏷️ Genre Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreContainer}
      >
        {GENRES.map((genre) => {
          const isSelected = selectedGenre === genre;
          return (
            <Pressable
              key={genre}
              style={[
                styles.genreChip,
                isSelected
                  ? [styles.genreChipActive, { backgroundColor: themeColors.primary }]
                  : { backgroundColor: themeColors.backgroundElement },
              ]}
              onPress={() => setSelectedGenre(genre)}
            >
              <Text
                style={[
                  styles.genreChipText,
                  { color: isSelected ? '#fff' : themeColors.textSecondary },
                ]}
              >
                {genre}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Results Grid */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : filteredList.length > 0 ? (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          numColumns={isLargeScreen ? 4 : 2}
          key={isLargeScreen ? 'search-4' : 'search-2'}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.columnWrapper}
          ListHeaderComponent={
            <View style={styles.resultsInfo}>
              <Text style={[styles.resultsText, { color: themeColors.textSecondary }]}>
                {filteredList.length} {filteredList.length === 1 ? 'result' : 'results'} found
              </Text>
            </View>
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Sparkles color={themeColors.textMuted} size={40} />
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Anime Found</Text>
          <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
            Try searching for another keyword or pick a different genre above.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 14,
    borderRadius: 12,
    height: 50,
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
  genreContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#242436',
  },
  genreChipActive: {
    borderColor: '#E50914',
  },
  genreChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultsInfo: {
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  columnWrapper: {
    gap: 16,
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#242436',
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 2 / 3,
    backgroundColor: '#12121A',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 8px rgba(229, 9, 20, 0.5)',
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 3,
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
    marginBottom: 2,
  },
  cardGenre: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
  },
});
