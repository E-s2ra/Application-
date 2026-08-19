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
import {
  Play,
  Heart,
  Star,
  Sparkles,
  TrendingUp,
  Compass,
  ChevronLeft,
  ChevronRight,
  Film,
  Clapperboard,
  Tv,
  Flame,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useFavorites, AnimeItem, MediaCategory } from '@/hooks/useFavorites';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = Platform.OS === 'web' ? Math.min(width * 0.46, 480) : 410;

export const CATEGORIES: { id: 'All' | MediaCategory; label: string; icon: string }[] = [
  { id: 'All', label: 'All', icon: '🌟' },
  { id: 'Movies', label: 'Movies', icon: '🎬' },
  { id: 'Anime Movies', label: 'Anime Movies', icon: '🎌' },
  { id: 'K-Drama', label: 'K-Drama', icon: '🌸' },
  { id: 'Drama', label: 'Drama', icon: '🎭' },
  { id: 'Anime Series', label: 'Anime Series', icon: '⚡' },
];

const GENRES = ['All', '🔥 Trending', 'Action', 'Drama', 'Romance', 'Sci-Fi', 'Thriller', 'Fantasy', 'Comedy', 'Horror'];

const PLACEHOLDER_HERO_IMAGES = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
];

export const DEFAULT_CATALOG: AnimeItem[] = [
  // 🎬 MOVIES
  {
    id: 'movie-1',
    title: 'Inception',
    description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    image_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&q=80',
    episodes: 1,
    genre: 'Sci-Fi, Action, Thriller',
    category: 'Movies',
    is_featured: true,
  },
  {
    id: 'movie-2',
    title: 'Interstellar',
    description: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft along with a team of researchers to find a new planet for humans.',
    image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80',
    episodes: 1,
    genre: 'Sci-Fi, Adventure, Drama',
    category: 'Movies',
    is_featured: true,
  },
  {
    id: 'movie-3',
    title: 'Oppenheimer',
    description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.',
    image_url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1200&q=80',
    episodes: 1,
    genre: 'Biography, Drama, History',
    category: 'Movies',
    is_featured: false,
  },
  {
    id: 'movie-4',
    title: 'Dune: Part Two',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    image_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80',
    episodes: 1,
    genre: 'Sci-Fi, Adventure, Action',
    category: 'Movies',
    is_featured: false,
  },
  {
    id: 'movie-5',
    title: 'The Dark Knight',
    description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    image_url: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=1200&q=80',
    episodes: 1,
    genre: 'Action, Crime, Drama',
    category: 'Movies',
    is_featured: false,
  },

  // 🎌 ANIME MOVIES
  {
    id: 'amovie-1',
    title: 'Your Name (Kimi no Na wa)',
    description: 'Two teenagers share a profound, magical connection upon discovering they are swapping bodies. Things manage to become even more complicated when the boy and girl decide to meet in person.',
    image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80',
    episodes: 1,
    genre: 'Romance, Fantasy, Drama',
    category: 'Anime Movies',
    is_featured: true,
  },
  {
    id: 'amovie-2',
    title: 'Spirited Away',
    description: 'During her family move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts.',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80',
    episodes: 1,
    genre: 'Fantasy, Adventure',
    category: 'Anime Movies',
    is_featured: true,
  },
  {
    id: 'amovie-3',
    title: 'Suzume',
    description: 'A modern action adventure road story where a 17-year-old girl named Suzume helps a mysterious young man close doors from the outside that are releasing disasters all over Japan.',
    image_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&q=80',
    episodes: 1,
    genre: 'Adventure, Fantasy',
    category: 'Anime Movies',
    is_featured: false,
  },
  {
    id: 'amovie-4',
    title: 'Demon Slayer: Mugen Train',
    description: 'After completing their rehabilitation training, Tanjiro and his comrades arrive at their next mission on the Mugen Train, where over forty people have disappeared in a very short time.',
    image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
    episodes: 1,
    genre: 'Action, Supernatural, Fantasy',
    category: 'Anime Movies',
    is_featured: false,
  },
  {
    id: 'amovie-5',
    title: 'A Silent Voice',
    description: 'A young man is ostracized by his classmates after he bullies a deaf girl to the point where she moves away. Years later, he sets off on a path for redemption.',
    image_url: 'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=1200&q=80',
    episodes: 1,
    genre: 'Drama, Romance',
    category: 'Anime Movies',
    is_featured: false,
  },

  // 🌸 K-DRAMA
  {
    id: 'kdrama-1',
    title: 'Queen of Tears',
    description: 'The queen of department stores and the prince of supermarkets weather a marital crisis until love miraculously begins to bloom again.',
    image_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&q=80',
    episodes: 16,
    genre: 'Romance, Comedy, Drama',
    category: 'K-Drama',
    is_featured: true,
  },
  {
    id: 'kdrama-2',
    title: 'Squid Game',
    description: 'Hundreds of cash-strapped players accept a strange invitation to compete in children games. Inside, a tempting prize awaits with deadly high stakes.',
    image_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&q=80',
    episodes: 9,
    genre: 'Thriller, Mystery, Drama',
    category: 'K-Drama',
    is_featured: true,
  },
  {
    id: 'kdrama-3',
    title: 'Crash Landing on You',
    description: 'A South Korean heiress accidentally paraglides into North Korea and into the life of an army officer, who decides he will help her hide.',
    image_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1200&q=80',
    episodes: 16,
    genre: 'Romance, Comedy, Drama',
    category: 'K-Drama',
    is_featured: false,
  },
  {
    id: 'kdrama-4',
    title: 'Vincenzo',
    description: 'During a visit to his motherland, a Korean-Italian mafia lawyer gives a conglomerate a taste of its own medicine with a side of justice.',
    image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80',
    episodes: 20,
    genre: 'Crime, Comedy, Drama',
    category: 'K-Drama',
    is_featured: false,
  },
  {
    id: 'kdrama-5',
    title: 'Goblin (Guardian)',
    description: 'In his quest for a bride to break his immortal curse, a 939-year-old guardian of souls meets a grim reaper and a cheerful student with a tragic past.',
    image_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=1200&q=80',
    episodes: 16,
    genre: 'Fantasy, Romance, Drama',
    category: 'K-Drama',
    is_featured: false,
  },

  // 🎭 DRAMA
  {
    id: 'drama-1',
    title: 'Succession',
    description: 'The Roy family is known for controlling the biggest media and entertainment company in the world. However, their world changes when their aging father steps down from the company.',
    image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
    episodes: 39,
    genre: 'Drama, Satire',
    category: 'Drama',
    is_featured: true,
  },
  {
    id: 'drama-2',
    title: 'Breaking Bad',
    description: 'A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his family future.',
    image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80',
    episodes: 62,
    genre: 'Crime, Drama, Thriller',
    category: 'Drama',
    is_featured: true,
  },
  {
    id: 'drama-3',
    title: 'The Last of Us',
    description: 'After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl who may be humanity last hope.',
    image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
    episodes: 9,
    genre: 'Action, Adventure, Drama',
    category: 'Drama',
    is_featured: false,
  },
  {
    id: 'drama-4',
    title: 'Chernobyl',
    description: 'In April 1986, an explosion at the Chernobyl nuclear power plant in the Union of Soviet Socialist Republics becomes one of the world worst man-made catastrophes.',
    image_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80',
    episodes: 5,
    genre: 'History, Drama, Thriller',
    category: 'Drama',
    is_featured: false,
  },

  // ⚡ ANIME SERIES
  {
    id: 'anime-1',
    title: 'Solo Leveling: Arise',
    description: 'In a world where hunters battle deadly monsters, Sung Jinwoo discovers an extraordinary system that awakens limitless power.',
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80',
    episodes: 24,
    genre: 'Action, Fantasy',
    category: 'Anime Series',
    is_featured: true,
  },
  {
    id: 'anime-2',
    title: 'Demon Slayer: Hashira Training',
    description: 'Tanjiro undergoes rigorous training with the Stone Hashira to prepare for the final confrontation against Muzan.',
    image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80',
    episodes: 12,
    genre: 'Shonen, Supernatural',
    category: 'Anime Series',
    is_featured: true,
  },
  {
    id: 'anime-3',
    title: 'Jujutsu Kaisen: Shibuya Incident',
    description: 'Curses and sorcerers clash in an unprecedented, explosive battle across the crowded streets of Tokyo.',
    image_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&q=80',
    episodes: 23,
    genre: 'Action, Dark Fantasy',
    category: 'Anime Series',
    is_featured: false,
  },
  {
    id: 'anime-4',
    title: 'Attack on Titan: The Final Chapters',
    description: 'The fate of humanity hangs in the balance as the Rumbling approaches its apocalyptic climax.',
    image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
    episodes: 28,
    genre: 'Action, Drama',
    category: 'Anime Series',
    is_featured: false,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeColors = Colors.dark;
  const { isFavorite, toggleFavorite } = useFavorites();

  const [allMedia, setAllMedia] = useState<AnimeItem[]>(DEFAULT_CATALOG);
  const [activeCategory, setActiveCategory] = useState<'All' | MediaCategory>('All');
  const [activeGenre, setActiveGenre] = useState('All');
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fadeAnim] = useState(() => new Animated.Value(1));

  const fetchMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('anime')
        .select('id, title, description, image_url, episodes, genre, category, is_featured')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        // Merge Supabase items with defaults
        const customItems = data.map((item) => ({
          ...item,
          category: item.category || 'Anime Series',
        })) as AnimeItem[];
        setAllMedia([...customItems, ...DEFAULT_CATALOG]);
      } else {
        setAllMedia(DEFAULT_CATALOG);
      }
    } catch {
      setAllMedia(DEFAULT_CATALOG);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  // Category filtered media
  const categoryFiltered = allMedia.filter((item) => {
    if (activeCategory === 'All') return true;
    return item.category === activeCategory;
  });

  // Featured items for the hero carousel based on active category
  const featured = categoryFiltered.filter((a) => a.is_featured).length > 0
    ? categoryFiltered.filter((a) => a.is_featured)
    : categoryFiltered.slice(0, 4);

  // Genre filtered media
  const genreFiltered = categoryFiltered.filter((item) => {
    if (activeGenre === 'All' || activeGenre === '🔥 Trending') return true;
    return item.genre?.toLowerCase().includes(activeGenre.toLowerCase());
  });

  // Rails by Category
  const moviesRail = allMedia.filter((item) => item.category === 'Movies');
  const animeMoviesRail = allMedia.filter((item) => item.category === 'Anime Movies');
  const kdramaRail = allMedia.filter((item) => item.category === 'K-Drama');
  const dramaRail = allMedia.filter((item) => item.category === 'Drama');
  const animeSeriesRail = allMedia.filter((item) => item.category === 'Anime Series');

  // Auto-sliding Hero timer: 4 seconds
  useEffect(() => {
    if (featured.length <= 1) return;

    const timer = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0.2,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentHeroIndex((prev) => (prev + 1) % featured.length);
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
    fetchMedia();
  }, []);

  const handleWatch = (id: string) => {
    router.push({ pathname: '/watch', params: { id } });
  };

  const activeHeroItem = featured[currentHeroIndex] || DEFAULT_CATALOG[0];
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
          {item.category && (
            <View style={styles.cardCategoryBadge}>
              <Text style={styles.cardCategoryText}>{item.category.toUpperCase()}</Text>
            </View>
          )}
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
              {item.episodes > 1 ? `${item.episodes} Episodes` : item.genre ?? 'Feature'}
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
          {item.category && (
            <View style={styles.cardCategoryBadge}>
              <Text style={styles.cardCategoryText}>{item.category.toUpperCase()}</Text>
            </View>
          )}
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
          <View style={styles.epBadge}>
            <Text style={styles.epBadgeText}>
              {item.episodes > 1 ? `${item.episodes} EPS` : 'MOVIE'}
            </Text>
          </View>
        </View>
        <View style={styles.standardCardInfo}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.cardMeta, { color: themeColors.textSecondary }]} numberOfLines={1}>
            {item.genre ?? item.category ?? 'Stream'}
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
            STREAM<Text style={{ color: themeColors.primary }}>FLIX</Text>
          </Text>
        </View>
      </View>

      {/* 🚀 Main Category Switcher Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryPill,
                isSelected
                  ? [styles.categoryPillActive, { backgroundColor: themeColors.primary }]
                  : { backgroundColor: themeColors.backgroundElement },
              ]}
              onPress={() => {
                setActiveCategory(cat.id);
                setCurrentHeroIndex(0);
              }}
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
                  <Text style={styles.pillBadgeText}>
                    {activeHeroItem.category?.toUpperCase() || 'FEATURED'}
                  </Text>
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

      {/* When a specific category is chosen, show focused filtered list */}
      {activeCategory !== 'All' ? (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Flame color={themeColors.primary} size={20} />
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                {activeCategory} {activeGenre !== 'All' ? `· ${activeGenre}` : ''}
              </Text>
            </View>
            <Text style={[styles.sectionCount, { color: themeColors.textSecondary }]}>
              {genreFiltered.length} Titles
            </Text>
          </View>
          <FlatList
            data={genreFiltered}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderStandardCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.standardList}
          />
        </>
      ) : (
        /* When "All" is chosen, show organized categorized sections */
        <>
          {/* 🔥 TOP 10 Ranked Row */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <TrendingUp color={themeColors.primary} size={20} />
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Top 10 Today</Text>
            </View>
          </View>
          <FlatList
            data={allMedia.slice(0, 10)}
            keyExtractor={(item) => `top-${item.id}`}
            renderItem={renderRankedCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rankedList}
          />

          {/* 🎬 Blockbuster Movies Rail */}
          {moviesRail.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Film color="#E50914" size={20} />
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Blockbuster Movies</Text>
                </View>
                <Pressable onPress={() => setActiveCategory('Movies')}>
                  <Text style={[styles.seeAllText, { color: themeColors.primary }]}>See All →</Text>
                </Pressable>
              </View>
              <FlatList
                data={moviesRail}
                keyExtractor={(item) => `mov-${item.id}`}
                renderItem={renderStandardCard}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.standardList}
              />
            </>
          )}

          {/* 🎌 Anime Movies Rail */}
          {animeMoviesRail.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Clapperboard color="#FF8A00" size={20} />
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Must-Watch Anime Movies</Text>
                </View>
                <Pressable onPress={() => setActiveCategory('Anime Movies')}>
                  <Text style={[styles.seeAllText, { color: themeColors.primary }]}>See All →</Text>
                </Pressable>
              </View>
              <FlatList
                data={animeMoviesRail}
                keyExtractor={(item) => `amov-${item.id}`}
                renderItem={renderStandardCard}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.standardList}
              />
            </>
          )}

          {/* 🌸 Trending K-Drama Rail */}
          {kdramaRail.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Sparkles color="#FF69B4" size={20} />
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Trending K-Drama</Text>
                </View>
                <Pressable onPress={() => setActiveCategory('K-Drama')}>
                  <Text style={[styles.seeAllText, { color: themeColors.primary }]}>See All →</Text>
                </Pressable>
              </View>
              <FlatList
                data={kdramaRail}
                keyExtractor={(item) => `kd-${item.id}`}
                renderItem={renderStandardCard}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.standardList}
              />
            </>
          )}

          {/* 🎭 Gripping Drama Series Rail */}
          {dramaRail.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Tv color="#9D4EDD" size={20} />
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Critically Acclaimed Dramas</Text>
                </View>
                <Pressable onPress={() => setActiveCategory('Drama')}>
                  <Text style={[styles.seeAllText, { color: themeColors.primary }]}>See All →</Text>
                </Pressable>
              </View>
              <FlatList
                data={dramaRail}
                keyExtractor={(item) => `dr-${item.id}`}
                renderItem={renderStandardCard}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.standardList}
              />
            </>
          )}

          {/* ⚡ Anime Series Rail */}
          {animeSeriesRail.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Compass color={themeColors.accentCyan} size={20} />
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Popular Anime Series</Text>
                </View>
                <Pressable onPress={() => setActiveCategory('Anime Series')}>
                  <Text style={[styles.seeAllText, { color: themeColors.primary }]}>See All →</Text>
                </Pressable>
              </View>
              <FlatList
                data={animeSeriesRail}
                keyExtractor={(item) => `as-${item.id}`}
                renderItem={renderStandardCard}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.standardList}
              />
            </>
          )}
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
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#242436',
  },
  categoryPillActive: {
    borderColor: 'transparent',
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroSection: {
    height: HERO_HEIGHT,
    position: 'relative',
    marginTop: 4,
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
    color: '#rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  playBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  listBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navArrowLeft: {
    left: 12,
  },
  navArrowRight: {
    right: 12,
  },
  indicatorRow: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 18,
    borderRadius: 3,
  },
  genreContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242436',
  },
  genreChipActive: {
    borderColor: 'transparent',
  },
  genreChipText: {
    fontSize: 13,
    fontWeight: '600',
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
    fontSize: 13,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  rankedList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  rankedCardContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: 155,
  },
  rankNumber: {
    fontSize: 44,
    fontWeight: '900',
    color: '#2a2a42',
    lineHeight: 48,
    marginRight: -12,
    zIndex: 1,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  posterCard: {
    width: 130,
    height: 190,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#242436',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  cardHeartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  cardCategoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 3,
  },
  cardCategoryText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(7, 7, 10, 0.85)',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  standardList: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  standardCard: {
    width: 130,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#242436',
  },
  standardImageWrapper: {
    width: 130,
    height: 180,
    position: 'relative',
  },
  standardImage: {
    width: '100%',
    height: '100%',
  },
  epBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  epBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  standardCardInfo: {
    padding: 8,
  },
});
