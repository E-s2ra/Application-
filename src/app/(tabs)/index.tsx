import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { Play, Heart, Star, Sparkles, TrendingUp, Compass, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useFavorites, AnimeItem } from '@/hooks/useFavorites';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = Platform.OS === 'web' ? Math.min(width * 0.46, 480) : 400;

const GENRES = ['All', '🔥 Trending', 'Action', 'Shonen', 'Fantasy', 'Adventure', 'Sci-Fi', 'Romance', 'Horror'];

const PLACEHOLDER_HERO_IMAGES = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
];

const DEFAULT_DEMO_ANIME: AnimeItem[] = [
  {
    id: 'demo-1',
    title: 'Solo Leveling: Arise',
    description: 'In a world where hunters battle deadly monsters, Sung Jinwoo discovers an extraordinary system that awakens limitless power.',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80',
    episodes: 24,
    genre: 'Action, Fantasy',
    is_featured: true,
  },
  {
    id: 'demo-2',
    title: 'Demon Slayer: Hashira Training',
    description: 'Tanjiro undergoes rigorous training with the Stone Hashira to prepare for the final confrontation against Muzan.',
    image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80',
    episodes: 12,
    genre: 'Shonen, Supernatural',
    is_featured: true,
  },
  {
    id: 'demo-3',
    title: 'Jujutsu Kaisen: Shibuya Incident',
    description: 'Curses and sorcerers clash in an unprecedented, explosive battle across the crowded streets of Tokyo.',
    image_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&q=80',
    episodes: 23,
    genre: 'Action, Dark Fantasy',
    is_featured: true,
  },
  {
    id: 'demo-4',
    title: 'Attack on Titan: The Final Chapters',
    description: 'The fate of humanity hangs in the balance as the Rumbling approaches its apocalyptic climax.',
    image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
    episodes: 28,
    genre: 'Action, Drama',
    is_featured: true,
  },
  {
    id: 'demo-5',
    title: 'Cyberpunk: Edgerunners',
    description: 'A street kid trying to survive in a technology-obsessed city of the future where chrome is king.',
    image_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80',
    episodes: 10,
    genre: 'Sci-Fi, Cyberpunk',
    is_featured: false,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = Colors.dark;
  const { isFavorite, toggleFavorite } = useFavorites();

  const [allAnime, setAllAnime] = useState<AnimeItem[]>([]);
  const [featured, setFeatured] = useState<AnimeItem[]>([]);
  const [activeGenre, setActiveGenre] = useState('All');
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fadeAnim] = useState(() => new Animated.Value(1));

  const fetchAnime = async () => {
    try {
      const { data, error } = await supabase
        .from('anime')
        .select('id, title, description, image_url, episodes, genre, is_featured')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setAllAnime(data as AnimeItem[]);
        const feat = (data as AnimeItem[]).filter((a) => a.is_featured);
        setFeatured(feat.length > 0 ? feat : (data as AnimeItem[]).slice(0, 4));
      } else {
        setAllAnime(DEFAULT_DEMO_ANIME);
        setFeatured(DEFAULT_DEMO_ANIME.filter((a) => a.is_featured));
      }
    } catch {
      setAllAnime(DEFAULT_DEMO_ANIME);
      setFeatured(DEFAULT_DEMO_ANIME.filter((a) => a.is_featured));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnime();
  }, []);

  // 🎬 Smooth Auto-Sliding Hero Timer: changes every 4 seconds (4000ms)
  useEffect(() => {
    if (featured.length <= 1) return;

    const timer = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0.2,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Change photo
        setCurrentHeroIndex((prev) => (prev + 1) % featured.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [featured, fadeAnim]);

  const goToSlide = (newIndex: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0.2,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrentHeroIndex(newIndex);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
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
    fetchAnime();
  }, []);

  const handleWatch = (id: string) => {
    router.push({ pathname: '/watch', params: { id } });
  };

  const filteredAnime = allAnime.filter((item) => {
    if (activeGenre === 'All' || activeGenre === '🔥 Trending') return true;
    return item.genre?.toLowerCase().includes(activeGenre.toLowerCase());
  });

  const activeHeroItem = featured[currentHeroIndex] || DEFAULT_DEMO_ANIME[0];
  const activeHeroFavorited = activeHeroItem ? isFavorite(activeHeroItem.id) : false;

  const renderRankedCard = ({ item, index }: { item: AnimeItem; index: number }) => {
    const favorited = isFavorite(item.id);
    return (
      <Pressable
        style={styles.rankedCardContainer}
        onPress={() => handleWatch(item.id)}
      >
        <Text style={styles.rankNumber}>{index + 1}</Text>
        <View style={[styles.posterCard, { backgroundColor: themeColors.backgroundCard }]}>
          <Image
            source={{ uri: item.image_url || PLACEHOLDER_HERO_IMAGES[0] }}
            style={styles.posterImage}
            resizeMode="cover"
          />
          <Pressable
            style={styles.cardHeartBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              toggleFavorite(item);
            }}
          >
            <Heart
              color={favorited ? '#E50914' : '#fff'}
              fill={favorited ? '#E50914' : 'rgba(0,0,0,0.4)'}
              size={16}
            />
          </Pressable>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.cardMeta, { color: themeColors.textSecondary }]}>
              {item.episodes > 0 ? `${item.episodes} Episodes` : item.genre ?? 'Series'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderStandardCard = ({ item }: { item: AnimeItem }) => {
    const favorited = isFavorite(item.id);
    return (
      <Pressable
        style={[styles.standardCard, { backgroundColor: themeColors.backgroundCard }]}
        onPress={() => handleWatch(item.id)}
      >
        <View style={styles.standardImageWrapper}>
          <Image
            source={{ uri: item.image_url || PLACEHOLDER_HERO_IMAGES[0] }}
            style={styles.standardImage}
            resizeMode="cover"
          />
          <Pressable
            style={styles.cardHeartBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              toggleFavorite(item);
            }}
          >
            <Heart
              color={favorited ? '#E50914' : '#fff'}
              fill={favorited ? '#E50914' : 'rgba(0,0,0,0.4)'}
              size={16}
            />
          </Pressable>
          {item.episodes > 0 && (
            <View style={styles.epBadge}>
              <Text style={styles.epBadgeText}>{item.episodes} EPS</Text>
            </View>
          )}
        </View>
        <View style={styles.standardCardInfo}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.cardMeta, { color: themeColors.textSecondary }]} numberOfLines={1}>
            {item.genre ?? 'Anime Series'}
          </Text>
        </View>
      </Pressable>
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
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Top Brand Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.brandRow}>
          <View style={[styles.brandIcon, { backgroundColor: themeColors.primary }]}>
            <Sparkles color="#fff" size={18} />
          </View>
          <Text style={styles.brandName}>
            ANIME<Text style={{ color: themeColors.primary }}>STREAM</Text>
          </Text>
        </View>
      </View>

      {/* 🎬 Animated 4-Second Auto-Moving Hero Banner */}
      {featured.length > 0 && (
        <View style={styles.heroSection}>
          <Animated.View style={[styles.heroSlide, { opacity: fadeAnim }]}>
            <Image
              source={{ uri: activeHeroItem.image_url || PLACEHOLDER_HERO_IMAGES[0] }}
              style={styles.heroBackdrop}
              resizeMode="cover"
            />
            <View style={styles.heroDarkGradient} />

            <View style={styles.heroContent}>
              {/* Badges Row */}
              <View style={styles.heroBadges}>
                <View style={[styles.pillBadge, { backgroundColor: themeColors.primary }]}>
                  <Text style={styles.pillBadgeText}>FEATURED</Text>
                </View>
                <View style={styles.pillGlass}>
                  <Text style={styles.pillGlassText}>4K ULTRA HD</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Star color="#FFB800" size={12} fill="#FFB800" />
                  <Text style={styles.ratingText}>9.8</Text>
                </View>
              </View>

              <Text style={styles.heroTitle} numberOfLines={2}>
                {activeHeroItem.title}
              </Text>

              {activeHeroItem.description ? (
                <Text style={styles.heroDesc} numberOfLines={2}>
                  {activeHeroItem.description}
                </Text>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.heroActions}>
                <Pressable
                  style={[styles.playBtn, { backgroundColor: themeColors.primary }]}
                  onPress={() => handleWatch(activeHeroItem.id)}
                >
                  <Play color="#fff" size={18} fill="#fff" />
                  <Text style={styles.playBtnText}>Play Now</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.listBtn,
                    { backgroundColor: activeHeroFavorited ? '#33080A' : 'rgba(255,255,255,0.15)' },
                  ]}
                  onPress={() => toggleFavorite(activeHeroItem)}
                >
                  <Heart
                    color={activeHeroFavorited ? themeColors.primary : '#fff'}
                    fill={activeHeroFavorited ? themeColors.primary : 'none'}
                    size={18}
                  />
                  <Text
                    style={[
                      styles.listBtnText,
                      { color: activeHeroFavorited ? themeColors.primary : '#fff' },
                    ]}
                  >
                    {activeHeroFavorited ? 'In My List' : '+ My List'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Left / Right Carousel Chevrons */}
          <Pressable style={[styles.navArrow, styles.navArrowLeft]} onPress={prevHero}>
            <ChevronLeft color="#fff" size={24} />
          </Pressable>
          <Pressable style={[styles.navArrow, styles.navArrowRight]} onPress={nextHero}>
            <ChevronRight color="#fff" size={24} />
          </Pressable>

          {/* Indicator Dots */}
          <View style={styles.indicatorRow}>
            {featured.map((_, idx) => (
              <Pressable
                key={idx}
                onPress={() => goToSlide(idx)}
                style={[
                  styles.dot,
                  idx === currentHeroIndex
                    ? [styles.activeDot, { backgroundColor: themeColors.primary }]
                    : { backgroundColor: 'rgba(255,255,255,0.3)' },
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* 🏷️ Genre Filter Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreContainer}
      >
        {GENRES.map((genre) => {
          const isSelected = activeGenre === genre;
          return (
            <Pressable
              key={genre}
              style={[
                styles.genreChip,
                isSelected
                  ? [styles.genreChipActive, { backgroundColor: themeColors.primary }]
                  : { backgroundColor: themeColors.backgroundElement },
              ]}
              onPress={() => setActiveGenre(genre)}
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

      {/* 🔥 TOP 10 Ranked Row */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <TrendingUp color={themeColors.primary} size={20} />
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Top 10 Today</Text>
        </View>
      </View>
      <FlatList
        data={allAnime.slice(0, 10)}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRankedCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rankedList}
      />

      {/* ⚡ Trending / Filtered Rail */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Compass color={themeColors.accentCyan} size={20} />
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            {activeGenre === 'All' ? 'Trending Now' : `${activeGenre} Anime`}
          </Text>
        </View>
        <Text style={[styles.sectionCount, { color: themeColors.textSecondary }]}>
          {filteredAnime.length} Shows
        </Text>
      </View>
      <FlatList
        data={filteredAnime}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderStandardCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.standardList}
      />

      {/* 🌟 New Releases Rail */}
      {allAnime.length > 3 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Sparkles color="#FFB800" size={20} />
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>New Releases</Text>
            </View>
          </View>
          <FlatList
            data={[...allAnime].reverse()}
            keyExtractor={(item) => `rev-${item.id}`}
            renderItem={renderStandardCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.standardList}
          />
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
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
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  heroSection: {
    height: HERO_HEIGHT,
    position: 'relative',
  },
  heroSlide: {
    height: HERO_HEIGHT,
    width: '100%',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  heroDarkGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 7, 10, 0.65)',
  },
  heroContent: {
    padding: 20,
    paddingBottom: 32,
    zIndex: 5,
  },
  heroBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pillBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pillGlass: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pillGlassText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  heroDesc: {
    color: '#D0D0DC',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: '90%',
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    boxShadow: '0px 4px 10px rgba(229, 9, 20, 0.5)',
  },
  playBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  listBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  listBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  navArrow: {
    position: 'absolute',
    top: '40%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  navArrowLeft: {
    left: 12,
  },
  navArrowRight: {
    right: 12,
  },
  indicatorRow: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    zIndex: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  genreContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#242436',
  },
  genreChipActive: {
    borderColor: '#E50914',
  },
  genreChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  rankedList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  rankedCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  rankNumber: {
    fontSize: 80,
    fontWeight: '900',
    color: '#303046',
    marginRight: -18,
    zIndex: 5,
  },
  posterCard: {
    width: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#242436',
  },
  posterImage: {
    width: 140,
    height: 200,
  },
  cardHeartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cardInfo: {
    padding: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: 11,
  },
  standardList: {
    paddingHorizontal: 16,
    gap: 14,
  },
  standardCard: {
    width: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#242436',
  },
  standardImageWrapper: {
    position: 'relative',
    width: 140,
    height: 200,
  },
  standardImage: {
    width: '100%',
    height: '100%',
  },
  epBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  epBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  standardCardInfo: {
    padding: 8,
  },
});
