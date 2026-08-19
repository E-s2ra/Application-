import { useRouter } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useFavorites, AnimeItem } from '@/hooks/useFavorites';
import { Play, Heart, Film } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const isLargeScreen = Platform.OS === 'web' && width > 768;
const CARD_WIDTH = isLargeScreen ? (width - 64) / 4 : (width - 48) / 2;

const PLACEHOLDER_IMAGES = [
  'https://picsum.photos/id/1015/800/1200',
  'https://picsum.photos/id/1025/800/1200',
  'https://picsum.photos/id/1062/800/1200',
  'https://picsum.photos/id/1074/800/1200',
];

export default function FavoritesScreen() {
  const router = useRouter();
  const themeColors = Colors.dark;
  const { favorites, toggleFavorite } = useFavorites();

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

  const renderCard = ({ item }: { item: AnimeItem }) => (
    <View style={[styles.card, { backgroundColor: themeColors.backgroundCard, width: CARD_WIDTH }]}>
      <Pressable onPress={() => handleWatch(item.id)} style={styles.imageContainer}>
        <Image source={{ uri: getImage(item) }} style={styles.thumbnail} resizeMode="cover" />
        
        {/* Play Overlay Icon */}
        <View style={styles.playOverlay}>
          <View style={[styles.playCircle, { backgroundColor: themeColors.primary }]}>
            <Play color="#fff" size={16} fill="#fff" />
          </View>
        </View>

        {/* Favorite Heart Button */}
        <Pressable
          style={styles.heartButton}
          onPress={(e) => {
            e.stopPropagation?.();
            toggleFavorite(item);
          }}
        >
          <Heart color="#E50914" fill="#E50914" size={18} />
        </Pressable>

        {/* Episode badge */}
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

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {favorites.length > 0 ? (
        <FlatList
          data={favorites}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          numColumns={isLargeScreen ? 4 : 2}
          key={isLargeScreen ? 'grid-4' : 'grid-2'}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.columnWrapper}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={[styles.subCount, { color: themeColors.textSecondary }]}>
                {favorites.length} {favorites.length === 1 ? 'Title' : 'Titles'} Saved
              </Text>
            </View>
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: themeColors.backgroundElement }]}>
            <Film color={themeColors.primary} size={48} />
          </View>
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>Your List is Empty</Text>
          <Text style={[styles.emptySubtitle, { color: themeColors.textSecondary }]}>
            Tap the ❤️ heart icon on any anime to save it here for fast access anytime.
          </Text>
          <Pressable
            style={[styles.browseButton, { backgroundColor: themeColors.primary }]}
            onPress={() => router.push('/(tabs)' as any)}
          >
            <Text style={styles.browseButtonText}>Browse Trending Anime</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  columnWrapper: {
    gap: 16,
    marginBottom: 16,
  },
  header: {
    marginBottom: 12,
  },
  subCount: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    opacity: 0.9,
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
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 24,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
