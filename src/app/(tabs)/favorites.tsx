import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import { useLanguage } from '@/hooks/use-language';
import { useTheme } from '@/hooks/use-theme';
import { useFavorites, AnimeItem, MediaCategory } from '@/hooks/useFavorites';
import { useResponsive } from '@/hooks/useResponsive';
import { 
  Play, Heart, Star, Bookmark, Sparkles, Film, Clapperboard, Tv, Flame, Compass, TrendingUp, ChevronRight 
} from 'lucide-react-native';
import { EmptyState } from '@/components/EmptyState';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { PrimaryGradient } from '@/components/PrimaryGradient';

const PLACEHOLDER_HERO = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80';
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
];

const CATEGORIES: { id: 'All' | MediaCategory; label: string; icon: any }[] = [
  { id: 'All', label: 'All Saved', icon: Compass },
  { id: 'Movies', label: 'Movies', icon: Film },
  { id: 'Anime Movies', label: 'Anime', icon: Clapperboard },
  { id: 'K-Drama', label: 'K-Drama', icon: Sparkles },
  { id: 'Drama', label: 'Drama', icon: Tv },
  { id: 'Anime Series', label: 'Series', icon: Flame },
];

export default function FavoritesScreen() {
  const router = useRouter();
  const themeColors = useTheme();
  const { language, t } = useLanguage();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const { numCols, cardWidth, cardGap, pagePad, maxContentWidth, heroHeight } = useResponsive();

  const [activeCategory, setActiveCategory] = useState<'All' | MediaCategory>('All');

  const filteredFavorites = activeCategory === 'All' 
    ? favorites 
    : favorites.filter(item => item.category === activeCategory);

  const topHeroItem = favorites.length > 0 ? favorites[0] : null;

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

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GlobalNavbar title="My Saved List" showBrandLogo={false} />

      <View style={[styles.contentWrapper, { maxWidth: maxContentWidth }]}>
        {favorites.length > 0 ? (
          <FlatList
            data={filteredFavorites}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderStandardCard}
            numColumns={numCols}
            key={`fav-home-grid-${numCols}`}
            contentContainerStyle={{ padding: pagePad, paddingBottom: 60 }}
            columnWrapperStyle={numCols > 1 ? { gap: cardGap, marginBottom: cardGap } : undefined}
            ListHeaderComponent={
              <View style={styles.headerContainer}>
                {/* 🏷️ Home Page Category Pills Bar */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                  contentContainerStyle={styles.categoryContent}
                >
                  {CATEGORIES.map((cat) => {
                    const isActive = activeCategory === cat.id;
                    const count = cat.id === 'All' 
                      ? favorites.length 
                      : favorites.filter(f => f.category === cat.id).length;
                    const Icon = cat.icon;

                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setActiveCategory(cat.id)}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isActive ? themeColors.primary : themeColors.backgroundCard,
                            borderColor: isActive ? themeColors.primary : themeColors.border,
                          },
                        ]}
                      >
                        {isActive && <PrimaryGradient borderRadius={20} />}
                        <Icon size={12} color={isActive ? '#FFFFFF' : themeColors.textSecondary} />
                        <Text
                          style={[
                            styles.categoryText,
                            {
                              color: isActive ? '#FFFFFF' : themeColors.textSecondary,
                              fontWeight: isActive ? '800' : '600',
                            },
                          ]}
                        >
                          {cat.label} ({count})
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Section Header */}
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Sparkles color={themeColors.primary} size={18} />
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                      {activeCategory === 'All' ? 'Saved Titles' : activeCategory}
                    </Text>
                  </View>
                  <Text style={[styles.sectionCount, { color: themeColors.textSecondary }]}>
                    {filteredFavorites.length} Titles
                  </Text>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={[styles.emptyFilterBox, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
                <Bookmark size={36} color={themeColors.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyFilterTitle, { color: themeColors.text }]}>No Saved Titles in {activeCategory}</Text>
                <Text style={[styles.emptyFilterSub, { color: themeColors.textSecondary }]}>
                  Select another category filter above or add titles to your watchlist.
                </Text>
              </View>
            }
          />
        ) : (
          <EmptyState
            icon={Bookmark}
            title="Your Watchlist is Empty"
            description="Tap the heart icon on any movie or series to save it to your personal watchlist."
            actionLabel="Explore Catalog"
            onAction={() => router.push('/(tabs)' as any)}
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
  headerContainer: {
    marginBottom: 16,
    gap: 16,
  },
  heroCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 7, 10, 0.65)',
  },
  heroContent: {
    padding: 16,
    gap: 8,
    zIndex: 5,
  },
  heroTopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroBadgeText: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '800',
  },
  metaDot: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  metaText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  heroPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  heroPlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  categoryScroll: {
    maxHeight: 40,
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
    ...StyleSheet.absoluteFillObject,
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
  emptyFilterBox: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyFilterTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyFilterSub: {
    fontSize: 12,
    textAlign: 'center',
  },
});
