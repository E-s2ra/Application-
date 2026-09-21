import React, { useState } from 'react';
import { useRouter } from 'expo-router';
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
import { useFavorites, AnimeItem, MediaCategory } from '@/hooks/useFavorites';
import { useResponsive } from '@/hooks/useResponsive';
import { 
  Heart, Bookmark, Sparkles, Film, Clapperboard, Tv, Flame, Compass
} from 'lucide-react-native';
import { EmptyState } from '@/components/EmptyState';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { AppSectionHeader } from '@/components/ui';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { releaseWebFocus } from '@/lib/web-focus';

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
  const { numCols, cardWidth, cardGap, pagePad, maxContentWidth } = useResponsive();

  const [activeCategory, setActiveCategory] = useState<'All' | MediaCategory>('All');

  const getCategoryLabel = (id: string, fallback: string) => {
    if (id === 'All') return t('catAll', fallback);
    if (id === 'Movies') return t('catMovies', fallback);
    if (id === 'Anime Movies') return t('catAnimeMovies', fallback);
    if (id === 'K-Drama') return t('catKDrama', fallback);
    if (id === 'Drama') return t('catDrama', fallback);
    if (id === 'Anime Series') return t('catAnimeSeries', fallback);
    return fallback;
  };

  const filteredFavorites = activeCategory === 'All' 
    ? favorites 
    : favorites.filter(item => item.category === activeCategory);

  const handleWatch = (id: string) => {
    releaseWebFocus();
    router.push({ pathname: '/watch', params: { id } });
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

            {item.episodes > 1 && (
              <View style={styles.epBadge}>
                <Text style={styles.epBadgeText}>
                  {item.episodes} {t('ep', 'EPS')}
                </Text>
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
          <View style={styles.cardMetaRow}>
            <Text style={[styles.cardMeta, { color: themeColors.textSecondary }]} numberOfLines={1}>
              {item.genre ?? getCategoryLabel(item.category ?? '', item.category ?? '')}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GlobalNavbar title={t('myFavoritesList', 'My Saved List')} showBrandLogo={false} />

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
                        style={({ pressed }) => [
                          styles.categoryChip,
                          {
                            backgroundColor: isActive ? themeColors.backgroundSelected : 'transparent',
                            borderColor: isActive ? themeColors.backgroundSelected : themeColors.border,
                            opacity: pressed ? 0.72 : 1,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${language === 'ku' ? 'پاڵاوتنی خەزنکراوەکان بە' : 'Filter saved titles by'} ${getCategoryLabel(cat.id, cat.label)}`}
                        accessibilityState={{ selected: isActive }}
                      >
                        <Icon size={13} color={isActive ? themeColors.primary : themeColors.textSecondary} />
                        <Text
                          style={[
                            styles.categoryText,
                            {
                              color: isActive ? themeColors.text : themeColors.textSecondary,
                              fontWeight: isActive ? '700' : '500',
                            },
                          ]}
                        >
                          {getCategoryLabel(cat.id, cat.label)} ({count})
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <AppSectionHeader
                  style={styles.sectionHeader}
                  title={activeCategory === 'All'
                    ? (language === 'ku' ? 'بەرهەمە خەزنکراوەکان' : 'Saved titles')
                    : getCategoryLabel(activeCategory, activeCategory)}
                  action={
                    <Text style={[styles.sectionCount, { color: themeColors.textSecondary }]}>
                      {language === 'ku' ? `${filteredFavorites.length} بەرهەم` : `${filteredFavorites.length} titles`}
                    </Text>
                  }
                />
              </View>
            }
            ListEmptyComponent={
              <EmptyState
                icon={Bookmark}
                title={language === 'ku'
                  ? `هیچ بەرهەمێکی خەزنکراو لە ${getCategoryLabel(activeCategory, activeCategory)} نییە`
                  : `No saved titles in ${getCategoryLabel(activeCategory, activeCategory)}`}
                description={language === 'ku'
                  ? 'بەشێکی تر هەڵبژێرە یان بەرهەم بۆ لیستەکەت زیاد بکە.'
                  : 'Choose another category or add more titles to your list.'}
                actionLabel={language === 'ku' ? 'هەموو خەزنکراوەکان' : 'Show all saved titles'}
                onAction={() => setActiveCategory('All')}
              />
            }
          />
        ) : (
          <EmptyState
            icon={Bookmark}
            title={t('noFavoritesTitle', 'Your list is empty')}
            description={t('noFavoritesSub', 'Save movies and series to find them here later.')}
            actionLabel={t('browseMedia', 'Explore Catalog')}
            onAction={() => router.push('/(tabs)/search' as any)}
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
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
  heroGradientOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
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
    maxHeight: 44,
  },
  categoryContent: {
    gap: 6,
    paddingHorizontal: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  categoryText: {
    fontSize: 12.5,
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
    ...Typography.h2,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  standardCard: {
    marginBottom: 16,
  },
  posterCard: {
    borderRadius: Radius.md,
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
  emptyFilterBox: {
    padding: Spacing.xxl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyFilterTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyFilterSub: {
    fontSize: 12,
    textAlign: 'center',
  },
});
