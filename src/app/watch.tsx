import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { enableContentProtection, disableContentProtection } from '@/lib/content-protection';
import { PrimaryGradient } from '@/components/PrimaryGradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage } from '@/hooks/use-language';
import {
  Heart,
  Star,
  Play,
  Pause,
  ArrowLeft,
  RotateCw,
  RotateCcw,
  Gauge,
  Volume2,
  VolumeX,
  Maximize2,
  Tv,
  Layers,
  Settings,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getPlaybackUrl } from '@/lib/playback';
import { getDeletedMediaIds, getEditedMediaOverrides } from '@/lib/admin-operations';
import { useFavorites, AnimeItem } from '@/hooks/useFavorites';
import { useReviews } from '@/hooks/useReviews';
import { DEFAULT_CATALOG } from './(tabs)/index';
import { useResponsive } from '@/hooks/useResponsive';
import { ReviewsSection } from '@/components/ReviewsSection';
import { useToast } from '@/hooks/useToast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { EpisodeSelector } from '@/components/EpisodeSelector';
import { PlayerSettingsModal, VideoQuality, AudioTrack } from '@/components/PlayerSettingsModal';

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0];

export default function WatchScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const themeColors = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getStatsForMedia } = useReviews();
  const { maxContentWidth, railCardWidth, railCardHeight, isDesktop, isTablet } = useResponsive();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };
  const { updateProgress } = useWatchHistory();

  const [anime, setAnime] = useState<AnimeItem | null>(null);
  const [recommendations, setRecommendations] = useState<AnimeItem[]>([]);

  // Player state
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality>('4K (2160p)');
  const [selectedAudio, setSelectedAudio] = useState<AudioTrack>('Kurdish Dubbed');
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [isExpandedSynopsis, setIsExpandedSynopsis] = useState(false);

  const videoViewRef = useRef<VideoView>(null);
  const [videoSource, setVideoSource] = useState<any>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    if (Platform.OS !== 'web') {
      p.play();
    }
  });

  // Enable DRM content protection when screen mounts; remove when leaving
  useEffect(() => {
    enableContentProtection();
    return () => {
      disableContentProtection();
    };
  }, []);

  useEffect(() => {
    try {
      player.playbackRate = playbackSpeed;
    } catch (err) {
      if (__DEV__) console.warn('[Watch] playbackRate sync error:', err);
    }
  }, [playbackSpeed, player]);

  // Periodic playback progress saver
  useEffect(() => {
    if (!anime || !player) return;

    const saveInterval = setInterval(() => {
      try {
        if (player.currentTime > 0 && player.duration > 0) {
          updateProgress(anime, player.currentTime, player.duration, selectedEpisode);
        }
      } catch (_e) {}
    }, 3500);

    return () => clearInterval(saveInterval);
  }, [anime, player, selectedEpisode, updateProgress]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const [deletedIds, overrides] = await Promise.all([
          getDeletedMediaIds(),
          getEditedMediaOverrides(),
        ]);

        if (deletedIds.includes(String(id))) {
          setPlaybackError('This media item has been removed by the administrator.');
          setAnime(null);
          return;
        }

        const defaultMatch = DEFAULT_CATALOG.find((item) => item.id === id);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id));

        let data = null;
        if (isUuid) {
          const { data: supabaseData } = await supabase
            .from('anime')
            .select('id, title, description, image_url, episodes, genre, category, is_featured, video_asset_key, video_url')
            .eq('id', id)
            .single();
          data = supabaseData;
        }

        if (data) {
          const itemWithOverrides = { ...(data as AnimeItem), ...(overrides[String(id)] || {}) };
          setAnime(itemWithOverrides);
          setPlaybackError(null);
        } else if (defaultMatch) {
          const itemWithOverrides = { ...defaultMatch, ...(overrides[String(id)] || {}) };
          setAnime(itemWithOverrides);
        } else {
          setAnime({
            id: String(id),
            title: `Title #${String(id).slice(0, 6)}`,
            description: 'Experience this thrilling title in full high definition with original audio and multiple subtitle tracks.',
            episodes: 24,
            genre: 'Action, Drama',
            category: 'Movies',
            image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80',
            is_featured: false,
            ...(overrides[String(id)] || {}),
          });
        }

        let recs = null;
        if (isUuid) {
          const { data: supabaseRecs } = await supabase
            .from('anime')
            .select('id, title, description, image_url, episodes, genre, category, is_featured, video_asset_key, video_url')
            .neq('id', id)
            .limit(6);
          recs = supabaseRecs;
        }

        const safeRecs = (recs && recs.length > 0) ? recs : [];
        const customRecs = safeRecs
          .filter((item: any) => !deletedIds.includes(item.id))
          .map((item: any) => ({ ...(item as AnimeItem), ...(overrides[item.id] || {}) }));

        setRecommendations(customRecs.length > 0 ? customRecs : DEFAULT_CATALOG.filter((i) => i.id !== id).slice(0, 6));
      } catch (e) {
        console.warn('[Watch] Error loading media data:', e);
        setPlaybackError('Failed to load media details.');
      }
    }

    void loadData();
  }, [id]);

  useEffect(() => {
    if (!anime) return;
    let cancelled = false;

    const specificEpisodeUrl = anime.episode_links?.find((e: any) => e.episode === selectedEpisode)?.url?.trim();
    const directUrl =
      (specificEpisodeUrl && specificEpisodeUrl.startsWith('http'))
        ? specificEpisodeUrl
        : (anime.video_url && anime.video_url.trim().startsWith('http'))
        ? anime.video_url.trim()
        : (anime.video_asset_key && anime.video_asset_key.trim().startsWith('http'))
        ? anime.video_asset_key.trim()
        : null;

    if (directUrl) {
      setVideoSource(directUrl);
      setPlaybackError(null);
      return;
    }

    void getPlaybackUrl(anime.id)
      .then(({ url }) => {
        if (!cancelled) {
          setVideoSource(url);
          setPlaybackError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          if (directUrl) {
            setVideoSource({ uri: directUrl });
            setPlaybackError(null);
          } else {
            setPlaybackError('Secure 4K stream is unavailable for this episode.');
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [anime, selectedEpisode]);

  const handlePlayPause = () => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const handleToggleMute = () => {
    if (!player) return;
    player.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeekForward10 = () => {
    if (!player) return;
    try {
      player.currentTime = (player.currentTime || 0) + 10;
    } catch (e) {
      if (__DEV__) console.warn('[Watch] seek forward error:', e);
    }
  };

  const handleSeekBackward10 = () => {
    if (!player) return;
    try {
      player.currentTime = Math.max(0, (player.currentTime || 0) - 10);
    } catch (e) {
      if (__DEV__) console.warn('[Watch] seek backward error:', e);
    }
  };

  const handleSelectSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const handleFullscreen = async () => {
    try {
      if (videoViewRef.current?.enterFullscreen) {
        await videoViewRef.current.enterFullscreen();
      }
    } catch {
      setPlaybackError('Failed to toggle fullscreen.');
    }
  };

  const { showSuccess } = useToast();

  const favorited = anime ? isFavorite(anime.id) : false;
  const stats = anime ? getStatsForMedia(anime.id) : { average: 4.9, count: 64 };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      
      {/* 🔙 Minimalist Navigation Header Bar */}
      <View style={[
        styles.headerBar,
        {
          backgroundColor: themeColors.backgroundElement,
          borderBottomColor: themeColors.border,
          paddingTop: Math.max(insets.top + 6, 14),
        }
      ]}>
        <Pressable
          style={[styles.headerBtn, { backgroundColor: themeColors.backgroundCard }]}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft color={themeColors.text} size={20} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {anime?.title ?? 'AniFlix Cinema'}
        </Text>

        {/* Protected stream — no share/copy allowed */}
        <View style={styles.headerBtn} />
      </View>



      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.contentWrapper, { maxWidth: maxContentWidth }]}>
          
          {/* 🎬 Clean Cinema Video Frame */}
          <View style={styles.playerWrapper}>
            <View style={[styles.videoBox, (isDesktop || isTablet) && styles.videoBoxDesktop]}>
              <VideoView
                ref={videoViewRef}
                style={styles.videoElement}
                player={player}
                contentFit="contain"
                nativeControls={false}
                allowsFullscreen={false}
                allowsPictureInPicture={false}
              />

              {playbackError && (
                <View style={styles.videoErrorBox}>
                  <Tv color={themeColors.error} size={32} />
                  <Text style={[styles.videoErrorText, { color: themeColors.textSecondary }]}>{playbackError}</Text>
                </View>
              )}
            </View>

            {/* Sleek Minimalist Controls Bar */}
            <View style={[styles.controlsRow, { backgroundColor: themeColors.backgroundElement, borderBottomColor: themeColors.border }]}>
              <Pressable style={styles.controlIconBtn} onPress={handleSeekBackward10}>
                <RotateCcw color={themeColors.textSecondary} size={18} />
              </Pressable>

              <Pressable style={styles.playPauseBtn} onPress={handlePlayPause}>
                <PrimaryGradient borderRadius={20} />
                {isPlaying ? <Pause color="#FFFFFF" size={18} fill="#FFFFFF" /> : <Play color="#FFFFFF" size={18} fill="#FFFFFF" />}
              </Pressable>

              <Pressable style={styles.controlIconBtn} onPress={handleSeekForward10}>
                <RotateCw color={themeColors.textSecondary} size={18} />
              </Pressable>

              <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

              {/* Speed Menu Toggle */}
              <Pressable
                style={[styles.pillBtn, { backgroundColor: themeColors.backgroundCard }, showSpeedMenu && styles.pillBtnActive]}
                onPress={() => setShowSpeedMenu(!showSpeedMenu)}
              >
                <Gauge color={showSpeedMenu ? themeColors.primary : themeColors.textSecondary} size={15} />
                <Text style={[styles.pillBtnText, { color: showSpeedMenu ? themeColors.primary : themeColors.textSecondary }]}>
                  {playbackSpeed}x
                </Text>
              </Pressable>

              {/* Stream Quality & Audio Settings Button */}
              <Pressable
                style={[styles.pillBtn, { backgroundColor: themeColors.backgroundCard }]}
                onPress={() => setShowSettingsModal(true)}
              >
                <Settings color={themeColors.primary} size={15} />
                <Text style={[styles.pillBtnText, { color: themeColors.text }]}>
                  {selectedQuality.split(' ')[0]}
                </Text>
              </Pressable>

              {/* Mute Button */}
              <Pressable style={styles.controlIconBtn} onPress={handleToggleMute}>
                {isMuted ? <VolumeX color={themeColors.error} size={18} /> : <Volume2 color={themeColors.textSecondary} size={18} />}
              </Pressable>

              {/* Fullscreen Button */}
              <Pressable style={styles.controlIconBtn} onPress={handleFullscreen}>
                <Maximize2 color={themeColors.textSecondary} size={18} />
              </Pressable>
            </View>

            {/* Speed Selector Menu */}
            {showSpeedMenu && (
              <View style={[styles.speedMenu, { backgroundColor: themeColors.backgroundElement, borderBottomColor: themeColors.border }]}>
                <View style={styles.speedRow}>
                  {SPEED_OPTIONS.map((speed) => {
                    const isCurrent = playbackSpeed === speed;
                    return (
                      <Pressable
                        key={speed}
                        style={[
                          styles.speedChip,
                          { backgroundColor: themeColors.backgroundCard },
                          isCurrent && { backgroundColor: themeColors.primary }
                        ]}
                        onPress={() => handleSelectSpeed(speed)}
                      >
                        <Text style={[
                          styles.speedChipText,
                          { color: isCurrent ? '#FFFFFF' : themeColors.textSecondary }
                        ]}>
                          {speed === 1.0 ? '1x' : `${speed}x`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* 🌟 NETFLIX-STYLE MEDIA POSTER HEADER CARD (Theme Colors Preserved) */}
          {anime && (
            <View style={[
              styles.mediaRichCard,
              { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }
            ]}>
              <View style={styles.mediaHeaderFlex}>
                {/* Poster Artwork Image */}
                <Image
                  source={{ uri: anime.image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80' }}
                  style={styles.posterThumbnail}
                  resizeMode="cover"
                />

                {/* Title & Metadata */}
                <View style={styles.mediaHeaderInfo}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.catBadge, { backgroundColor: themeColors.primary }]}>
                      <Text style={styles.catBadgeText}>{(anime.category || 'ANIME').toUpperCase()}</Text>
                    </View>
                    {anime.qualities && anime.qualities.length > 0 && (
                      <View style={[styles.hdBadge, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border, borderWidth: 1 }]}>
                        <Text style={[styles.hdBadgeText, { color: themeColors.text }]}>{anime.qualities[0].toUpperCase()}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.mediaTitleText, { color: themeColors.text }]} numberOfLines={2}>
                    {language === 'ku' && anime.title_ku ? anime.title_ku : anime.title}
                  </Text>

                  <Text style={[styles.genreSubText, { color: themeColors.accentCyan || themeColors.primary }]}>
                    {anime.genre ?? 'General'}
                  </Text>

                  <View style={styles.statsRow}>
                    <View style={styles.ratingBox}>
                      <Star color="#FFB800" size={13} fill="#FFB800" />
                      <Text style={styles.ratingVal}>{stats.average.toFixed(1)}</Text>
                    </View>
                    <Text style={[styles.dotSeparator, { color: themeColors.textMuted }]}>·</Text>
                    <Text style={[styles.epCountText, { color: themeColors.textSecondary }]}>{anime.episodes || 1} EPS</Text>
                    {anime.audio_tracks && anime.audio_tracks.length > 0 && (
                      <>
                        <Text style={[styles.dotSeparator, { color: themeColors.textMuted }]}>·</Text>
                        <Text style={[styles.subLabelText, { color: themeColors.textMuted }]}>{anime.audio_tracks.join(' / ').toUpperCase()}</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {/* Action CTAs Row */}
              <View style={styles.richActionRow}>
                <Pressable
                  style={[
                    styles.myListBtn,
                    { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border },
                    favorited && { borderColor: themeColors.primary, backgroundColor: 'rgba(3, 86, 197, 0.15)' }
                  ]}
                  onPress={() => toggleFavorite(anime)}
                >
                  <Heart
                    color={favorited ? themeColors.primary : themeColors.text}
                    fill={favorited ? themeColors.primary : 'none'}
                    size={18}
                  />
                  <Text style={[styles.myListBtnText, { color: favorited ? themeColors.primary : themeColors.text }]}>
                    {favorited ? 'In My List' : '+ My List'}
                  </Text>
                </Pressable>

                {/* Share button removed — stream links are protected */}
              </View>

              {/* Synopsis Box */}
              <Pressable
                style={[styles.synopsisWrapper, { backgroundColor: themeColors.backgroundElement }]}
                onPress={() => setIsExpandedSynopsis(!isExpandedSynopsis)}
              >
                <Text style={[styles.synopsisText, { color: themeColors.textSecondary }]} numberOfLines={isExpandedSynopsis ? undefined : 3}>
                  {language === 'ku' && anime.description_ku ? anime.description_ku : (anime.description || 'Experience this epic title with master audio and original subtitles.')}
                </Text>
                <Text style={[styles.readMoreBtn, { color: themeColors.primary }]}>
                  {isExpandedSynopsis ? 'Show less' : 'Read more...'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* 🍿 Enhanced Interactive Episode & Season Selector Component */}
          <EpisodeSelector
            totalEpisodes={anime?.episodes || 1}
            selectedEpisode={selectedEpisode}
            onSelectEpisode={(ep) => setSelectedEpisode(ep)}
            category={anime?.category}
          />

          {/* 🌟 RECOMMENDATIONS RAIL (Theme-aware Poster Cards) */}
          {recommendations.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Layers color={themeColors.primary} size={18} />
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>You Might Also Like</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recRail}>
                {recommendations.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[styles.recPosterCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border, width: railCardWidth }]}
                    onPress={() => router.push({ pathname: '/watch', params: { id: item.id } })}
                  >
                    <Image
                      source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80' }}
                      style={[styles.recPosterImg, { width: railCardWidth, height: railCardHeight }]}
                      resizeMode="cover"
                    />
                    <View style={styles.recBadgeOverlay}>
                      <Star color="#FFB800" size={10} fill="#FFB800" />
                      <Text style={styles.recBadgeText}>4.9</Text>
                    </View>
                    <View style={styles.recMetaContainer}>
                      <Text style={[styles.recTitleText, { color: themeColors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.recGenreText, { color: themeColors.textSecondary }]} numberOfLines={1}>
                        {item.genre ?? 'Anime'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ⭐ COMMUNITY REVIEWS SECTION */}
          {anime && (
            <View style={{ marginTop: 16 }}>
              <ReviewsSection mediaId={anime.id} mediaTitle={anime.title} />
            </View>
          )}

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* ⚙️ Player Quality, Audio & Speed Settings Modal */}
      <PlayerSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        playbackSpeed={playbackSpeed}
        onSelectSpeed={(speed) => {
          setPlaybackSpeed(speed);
          try { player.playbackRate = speed; } catch (_e) {}
        }}
        availableQualities={anime?.qualities}
        activeQuality={selectedQuality}
        onSelectQuality={(q) => setSelectedQuality(q)}
        availableAudioTracks={anime?.audio_tracks}
        activeAudio={selectedAudio}
        onSelectAudio={(a) => setSelectedAudio(a)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderColor: '#00E676',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  toastText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
  },
  contentWrapper: {
    width: '100%',
    alignSelf: 'center',
  },

  /* VIDEO PLAYER */
  playerWrapper: {
    width: '100%',
    backgroundColor: '#000000',
  },
  videoBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBoxDesktop: {
    maxHeight: 520,
  },
  videoElement: {
    width: '100%',
    height: '100%',
  },
  videoErrorBox: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 15, 0.94)',
    gap: 8,
  },
  videoErrorText: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* CONTROLS ROW */
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  controlIconBtn: {
    padding: 6,
  },
  playPauseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 18,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  pillBtnActive: {
    backgroundColor: 'rgba(3, 86, 197, 0.15)',
  },
  pillBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  speedMenu: {
    padding: 12,
    borderBottomWidth: 1,
  },
  speedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  speedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  speedChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* MEDIA RICH CARD */
  mediaRichCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  mediaHeaderFlex: {
    flexDirection: 'row',
    gap: 14,
  },
  posterThumbnail: {
    width: 90,
    height: 125,
    borderRadius: 10,
  },
  mediaHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  catBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  catBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  hdBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hdBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  mediaTitleText: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
    marginBottom: 4,
  },
  genreSubText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingVal: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '800',
  },
  dotSeparator: {
    fontSize: 12,
  },
  epCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subLabelText: {
    fontSize: 10,
    fontWeight: '700',
  },

  /* RICH ACTION ROW */
  richActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 12,
  },
  myListBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  myListBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  synopsisWrapper: {
    padding: 12,
    borderRadius: 10,
  },
  synopsisText: {
    fontSize: 13,
    lineHeight: 20,
  },
  readMoreBtn: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },

  /* SECTIONS */
  sectionContainer: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  seasonTag: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* EPISODES GRID TILES */
  episodesListGrid: {
    gap: 10,
  },
  epCardTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  epTileLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  epPlayIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  epTileNumberText: {
    fontSize: 12,
    fontWeight: '800',
  },
  epTileTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  epTileMetaText: {
    fontSize: 11,
    marginTop: 2,
  },
  playingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  playingTagText: {
    fontSize: 10,
    fontWeight: '900',
  },

  /* RECOMMENDATIONS RAIL */
  recRail: {
    gap: 12,
  },
  recPosterCard: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  recPosterImg: {
    width: '100%',
  },
  recBadgeOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recBadgeText: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '800',
  },
  recMetaContainer: {
    padding: 8,
  },
  recTitleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  recGenreText: {
    fontSize: 11,
    marginTop: 2,
  },
});
