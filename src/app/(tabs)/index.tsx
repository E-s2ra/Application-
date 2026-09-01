import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { PrimaryGradient } from '@/components/PrimaryGradient';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation, useLanguage } from '@/hooks/use-language';
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
  Globe,
  Crown,
  Menu,
  Coins,
} from 'lucide-react-native';
import { useFavorites, AnimeItem, MediaCategory } from '@/hooks/useFavorites';
import { MediaService } from '@/services/media.service';
import { useGamification } from '@/hooks/useGamification';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/hooks/useResponsive';
import { useSidebar } from '@/context/SidebarContext';
import { RewardsHubModal } from '@/components/RewardsHubModal';
import { VipSubscriptionModal } from '@/components/VipSubscriptionModal';

import { useWatchHistory } from '@/hooks/useWatchHistory';
import { RotateCcw, Trash2 } from 'lucide-react-native';

export const CATEGORIES: { id: 'All' | MediaCategory; label: string; icon: any }[] = [
  { id: 'All', label: 'All', icon: Compass },
  { id: 'Movies', label: 'Movies', icon: Film },
  { id: 'Anime Movies', label: 'Anime Movies', icon: Clapperboard },
  { id: 'K-Drama', label: 'K-Drama', icon: Tv },
  { id: 'Drama', label: 'Drama', icon: Flame },
  { id: 'Anime Series', label: 'Anime Series', icon: Sparkles },
];

const PLACEHOLDER_HERO_IMAGES = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
];

export const DEFAULT_CATALOG: AnimeItem[] = [];

export default function HomeScreen() {
  const router = useRouter();
  const themeColors = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };
  const { isFavorite, toggleFavorite } = useFavorites();
  const { history: watchHistory, removeFromHistory } = useWatchHistory();
  const { coins, streakDays, isVIP, vipDaysRemaining } = useGamification();
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const {
    heroHeight,
    railCardWidth,
    railCardHeight,
    rankedCardWidth,
    rankedCardHeight,
    maxContentWidth,
    isDesktop,
    isTablet,
    width,
  } = useResponsive();
  
  const { openSidebar } = useSidebar();

  const [allMedia, setAllMedia] = useState<AnimeItem[]>(DEFAULT_CATALOG);
  const [activeCategory, setActiveCategory] = useState<'All' | MediaCategory>('All');
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const heroFlatListRef = useRef<FlatList>(null);
  const heroWidth = Math.min(width - 24, maxContentWidth - 24);

  const getCategoryLabel = (id: string, defaultLabel: string) => {
    if (id === 'All') return t('catAll', defaultLabel);
    if (id === 'Movies') return t('catMovies', defaultLabel);
    if (id === 'Anime Movies') return t('catAnimeMovies', defaultLabel);
    if (id === 'K-Drama') return t('catKDrama', defaultLabel);
    if (id === 'Drama') return t('catDrama', defaultLabel);
    if (id === 'Anime Series') return t('catAnimeSeries', defaultLabel);
    return defaultLabel;
  };

  const fetchMedia = async () => {
    try {
      const items = await MediaService.getCatalog(0);
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
      setAllMedia([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMedia();
    }, [])
  );

  // Filter media by Category
  const categoryFiltered =
    activeCategory === 'All'
      ? allMedia
      : allMedia.filter((item) => item.category === activeCategory);

  // Featured Carousel List
  const featured = categoryFiltered.filter((a) => a.is_featured).length > 0
    ? categoryFiltered.filter((a) => a.is_featured)
    : categoryFiltered.slice(0, 5);

  // Rails by Category
  const moviesRail = allMedia.filter((item) => item.category === 'Movies');
  const animeMoviesRail = allMedia.filter((item) => item.category === 'Anime Movies');
  const kdramaRail = allMedia.filter((item) => item.category === 'K-Drama');
  const dramaRail = allMedia.filter((item) => item.category === 'Drama');
  const animeSeriesRail = allMedia.filter((item) => item.category === 'Anime Series');

  // Auto-sliding Hero timer: 5 seconds
  useEffect(() => {
    if (featured.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentHeroIndex((prev) => {
        const nextIndex = (prev + 1) % featured.length;
        heroFlatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [featured.length]);

  const goToSlide = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= featured.length) return;
    setCurrentHeroIndex(newIndex);
    heroFlatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
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

  const renderHeroSlide = ({ item }: { item: AnimeItem }) => {
    const favorited = isFavorite(item.id);
    const heroImgUri = item?.image_url && String(item.image_url).trim().length > 0
      ? String(item.image_url).trim()
      : PLACEHOLDER_HERO_IMAGES[0];

    return (
      <View style={[styles.heroSlideItem, { width: heroWidth, height: heroHeight }]}>
        <Image
          source={{ uri: heroImgUri }}
          style={styles.heroBackdrop}
          resizeMode="cover"
        />
        <View style={styles.heroDarkGradient} />

        <View style={[styles.heroContent, isDesktop && styles.heroContentDesktop]}>
          {/* Badges Row */}
          <View style={styles.heroBadges}>
            <View style={[styles.pillBadge, { backgroundColor: themeColors.primary }]}>
              <PrimaryGradient borderRadius={4} />
              <Text style={styles.pillBadgeText}>
                {item.category ? getCategoryLabel(item.category, item.category).toUpperCase() : 'FEATURED'}
              </Text>
            </View>
            <View style={styles.pillGlass}>
              <Text style={styles.pillGlassText}>4K ULTRA HD</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Star color="#FFB800" size={11} fill="#FFB800" />
              <Text style={styles.ratingText}>9.8</Text>
            </View>
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
              style={[styles.playBtn, { backgroundColor: themeColors.primary }]}
              onPress={() => handleWatch(item.id)}
            >
              <PrimaryGradient borderRadius={8} />
              <Play color="#FFFFFF" size={16} fill="#FFFFFF" />
              <Text style={styles.playBtnText}>{t('watchNow', 'Watch Now')}</Text>
            </Pressable>

            <Pressable
              style={[
                styles.listBtn,
                { backgroundColor: favorited ? themeColors.backgroundCard : 'rgba(255,255,255,0.15)', borderColor: themeColors.border },
              ]}
              onPress={() => toggleFavorite(item)}
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

  const renderRankedCard = ({ item, index }: { item: AnimeItem; index: number }) => {
    const favorited = isFavorite(item.id);
    const cardImg = (item?.image_url && String(item.image_url).trim().length > 0)
      ? String(item.image_url).trim()
      : PLACEHOLDER_HERO_IMAGES[0];

    return (
      <Pressable
        style={[styles.rankedCardContainer, { width: rankedCardWidth + 28 }]}
        onPress={() => handleWatch(item.id)}
      >
        <Text style={[styles.rankNumber, { fontSize: isTablet || isDesktop ? 56 : 46, color: themeColors.primary }]}>
          {index + 1}
        </Text>
        <View
          style={[
            styles.posterCard,
            {
              backgroundColor: themeColors.backgroundCard,
              borderColor: themeColors.border,
              width: rankedCardWidth,
              height: rankedCardHeight,
            },
          ]}
        >
          <Image
            source={{ uri: cardImg }}
            style={styles.posterImage}
            resizeMode="cover"
          />
          <View style={styles.cardImageOverlay} />

          {item.category && (
            <View style={[styles.cardCategoryBadge, { backgroundColor: themeColors.primary }]}>
              <PrimaryGradient borderRadius={4} />
              <Text style={styles.cardCategoryText}>{item.category.toUpperCase()}</Text>
            </View>
          )}

          <Pressable
            style={[styles.cardHeartBtn, { backgroundColor: favorited ? 'rgba(3, 86, 197, 0.3)' : 'rgba(0,0,0,0.5)', borderColor: favorited ? themeColors.primary : 'rgba(255,255,255,0.2)' }]}
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

          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: '#FFFFFF' }]} numberOfLines={1}>
              {language === 'ku' && item.title_ku ? item.title_ku : item.title}
            </Text>
            <View style={styles.cardMetaRow}>
              <Star size={10} color="#FFB800" fill="#FFB800" />
              <Text style={styles.cardRatingText}>9.8</Text>
              <Text style={styles.cardMetaDot}>·</Text>
              <Text style={[styles.cardMeta, { color: 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>
                {item.episodes > 1 ? `${item.episodes} EPS` : item.genre || 'Movie'}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderStandardCard = ({ item }: { item: AnimeItem }) => {
    const favorited = isFavorite(item.id);
    const cardImg = (item?.image_url && String(item.image_url).trim().length > 0)
      ? String(item.image_url).trim()
      : PLACEHOLDER_HERO_IMAGES[0];

    return (
      <Pressable
        style={[
          styles.standardCard,
          {
            backgroundColor: themeColors.backgroundCard,
            borderColor: themeColors.border,
            width: railCardWidth,
          },
        ]}
        onPress={() => handleWatch(item.id)}
      >
        <View style={[styles.standardImageWrapper, { width: railCardWidth, height: railCardHeight }]}>
          <Image
            source={{ uri: cardImg }}
            style={styles.standardImage}
            resizeMode="cover"
          />
          <View style={styles.cardImageOverlay} />

          {item.category && (
            <View style={[styles.cardCategoryBadge, { backgroundColor: themeColors.primary }]}>
              <PrimaryGradient borderRadius={4} />
              <Text style={styles.cardCategoryText}>{getCategoryLabel(item.category, item.category).toUpperCase()}</Text>
            </View>
          )}

          <Pressable
            style={[styles.cardHeartBtn, { backgroundColor: favorited ? 'rgba(3, 86, 197, 0.3)' : 'rgba(0,0,0,0.5)', borderColor: favorited ? themeColors.primary : 'rgba(255,255,255,0.2)' }]}
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
              {item.genre || getCategoryLabel(item.category || '', item.category || '') || 'Stream'}
            </Text>
          </View>
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
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <GlobalNavbar showBrandLogo={true} />

      <ScrollView
        style={[styles.container, { backgroundColor: themeColors.background }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentWrapper, { maxWidth: maxContentWidth }]}>



        {/* 🎬 Native Touch-Swipeable Hero Slider Banner */}
        {featured.length > 0 && (
          <View style={[styles.heroSection, { height: heroHeight }]}>
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

            {/* Left / Right Carousel Chevrons */}
            {featured.length > 1 && (
              <>
                <Pressable style={[styles.navArrow, styles.navArrowLeft]} onPress={prevHero}>
                  <ChevronLeft color="#FFFFFF" size={22} />
                </Pressable>
                <Pressable style={[styles.navArrow, styles.navArrowRight]} onPress={nextHero}>
                  <ChevronRight color="#FFFFFF" size={22} />
                </Pressable>
              </>
            )}

            {/* Indicator Dots */}
            {featured.length > 1 && (
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
            )}
          </View>
        )}

        {/* 🍿 Dynamic Rails Content */}
        {activeCategory === 'All' ? (
          <>
            {/* ⏯️ Continue Watching Rail */}
            {watchHistory.length > 0 && (
              <View style={styles.railSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <RotateCcw color={themeColors.primary} size={18} />
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Continue Watching</Text>
                  </View>
                  <Text style={[styles.sectionCount, { color: themeColors.textSecondary }]}>
                    {watchHistory.length} Titles
                  </Text>
                </View>
                <FlatList
                  horizontal
                  data={watchHistory}
                  keyExtractor={(item) => `history-${item.animeId}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.standardList}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.standardCard, { width: railCardWidth }]}
                      onPress={() => handleWatch(item.animeId)}
                    >
                      <View style={[styles.posterCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border, height: railCardHeight }]}>
                        <Image source={{ uri: item.image_url || PLACEHOLDER_HERO_IMAGES[0] }} style={styles.posterImage} resizeMode="cover" />
                        <View style={styles.cardImageOverlay} />

                        <View style={styles.centerPlayCircle}>
                          <View style={[styles.playCircleInner, { backgroundColor: themeColors.primary }]}>
                            <Play size={12} color="#FFFFFF" fill="#FFFFFF" />
                          </View>
                        </View>

                        <Pressable
                          style={[styles.cardHeartBtn, { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.2)' }]}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            removeFromHistory(item.animeId);
                          }}
                        >
                          <Trash2 color="#FF4D4D" size={12} />
                        </Pressable>

                        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.2)' }}>
                          <View style={{ height: '100%', width: `${item.progressPercent}%`, backgroundColor: themeColors.primary }} />
                        </View>
                      </View>

                      <View style={styles.standardCardInfo}>
                        <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={1}>
                          {language === 'ku' && item.title_ku ? item.title_ku : item.title}
                        </Text>
                        <View style={styles.cardMetaRow}>
                          <Text style={[styles.cardRatingText, { color: themeColors.primary, fontWeight: '800' }]}>
                            {item.progressPercent}% Watched
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  )}
                />
              </View>
            )}

            {/* 🍿 Unified Published Media Grid */}
            {allMedia.length > 0 && (
              <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Film color={themeColors.primary} size={18} />
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>All Published Shows</Text>
                  </View>
                  <Text style={[styles.sectionCount, { color: themeColors.textSecondary }]}>{allMedia.length} Titles</Text>
                </View>

                <View style={styles.gridWrap}>
                  {allMedia.map((item) => (
                    <View key={`grid-all-${item.id}`}>
                      {renderStandardCard({ item })}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Empty Catalog Fallback */}
            {allMedia.length === 0 && (
              <View style={[styles.emptyBox, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
                <Film size={40} color={themeColors.primary} style={{ marginBottom: 10 }} />
                <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
                  {t('noMediaTitle', 'No Products Published Yet')}
                </Text>
                <Text style={[styles.emptySub, { color: themeColors.textSecondary }]}>
                  {t('noMediaSub', 'Your cinema catalog is clean and ready. Add and publish your real anime, movies, and series from the Admin Control Center!')}
                </Text>
                <Pressable
                  style={[styles.adminBtn, { backgroundColor: themeColors.primary }]}
                  onPress={() => router.push('/admin' as any)}
                >
                  <PrimaryGradient borderRadius={10} />
                  <Sparkles size={15} color="#FFFFFF" />
                  <Text style={styles.adminBtnText}>Admin Console</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : (
          /* Category Filtered Grid View */
          <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Flame color={themeColors.primary} size={18} />
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                  {getCategoryLabel(activeCategory, activeCategory)}
                </Text>
              </View>
              <Text style={[styles.sectionCount, { color: themeColors.textSecondary }]}>
                {categoryFiltered.length} Titles
              </Text>
            </View>

            <View style={styles.gridWrap}>
              {categoryFiltered.map((item) => {
                const card = renderStandardCard({ item });
                return (
                  <View key={`grid-cat-${item.id}`}>
                    {card}
                  </View>
                );
              })}
            </View>
          </View>
        )}



        <View style={{ height: 40 }} />
      </View>

      {/* 🎁 AniFlix Gamification & Rewards Hub Modal */}
      <RewardsHubModal visible={showRewardsModal} onClose={() => setShowRewardsModal(false)} />

      {/* 👑 VIP Sovereign Subscription Modal */}
      <VipSubscriptionModal visible={showVipModal} onClose={() => setShowVipModal(false)} />
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
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
    marginTop: 4,
    borderRadius: 14,
    overflow: 'hidden',
    marginHorizontal: 12,
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
    backgroundColor: 'rgba(7, 7, 10, 0.55)',
  },
  heroContent: {
    padding: 16,
    paddingBottom: 28,
    zIndex: 5,
  },
  heroContentDesktop: {
    padding: 32,
    paddingBottom: 40,
  },
  heroBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  pillBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pillBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pillGlass: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pillGlassText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  ratingText: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '800',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    marginBottom: 4,
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  playBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  listBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },
  listBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  navArrow: {
    position: 'absolute',
    top: '45%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    gap: 5,
    zIndex: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  activeDot: {
    width: 18,
    borderRadius: 2.5,
  },

  /* RAILS & CARDS */
  railSection: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
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
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
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
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    zIndex: 5,
  },
  cardCategoryBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 5,
  },
  cardCategoryText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(7, 7, 10, 0.88)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
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
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '800',
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
    gap: 12,
    paddingTop: 10,
  },
  standardCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  standardImageWrapper: {
    position: 'relative',
  },
  standardImage: {
    width: '100%',
    height: '100%',
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
    padding: 8,
  },

  /* EMPTY STATE */
  emptyBox: {
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
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
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
});
