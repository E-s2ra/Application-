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
  StatusBar
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
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
  Minimize2,
  Tv,
  Layers,
  Settings,
  Lock,
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
import { PlayerSettingsModal } from '@/components/PlayerSettingsModal';
import { useGamification } from '@/hooks/useGamification';
import { useAdMob } from '@/hooks/useAdMob';

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
  const { unlockedMediaIds, unlockMedia, coins, isVIP } = useGamification();
  const { showRewardedAd } = useAdMob();
  const { showSuccess, showError } = useToast();

  const [anime, setAnime] = useState<AnimeItem | null>(null);
  const [recommendations, setRecommendations] = useState<AnimeItem[]>([]);

  // Player state
  const [isLayoutFullscreen, setIsLayoutFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(Platform.OS !== 'web');
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto');
  const [selectedAudio, setSelectedAudio] = useState<string>('Kurdish Dubbed');
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [isExpandedSynopsis, setIsExpandedSynopsis] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const videoViewRef = useRef<VideoView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
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

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls && isPlaying) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls, isPlaying]);

  const handleTapVideo = () => {
    setShowControls(prev => !prev);
  };

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

        const defaultMatch = DEFAULT_CATALOG.find((item: any) => item.id === id);
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
        
        const fallbackSimilar = DEFAULT_CATALOG
          .filter((i: any) => i.id !== id && !deletedIds.includes(i.id))
          .map((i: any) => ({ ...i, ...(overrides[i.id] || {}) }))
          .sort(() => 0.5 - Math.random());

        setRecommendations(customRecs.length > 0 ? customRecs : fallbackSimilar.slice(0, 6));
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

  const isMovie = anime?.category === 'Movies' || anime?.category === 'Anime Movies';
  const unlockCost = isMovie ? 125 : 80;
  const unlockKey = anime && !isMovie ? `${anime.id}_ep_${selectedEpisode}` : anime?.id;
  const isUnlocked = isVIP || (unlockKey && unlockedMediaIds.includes(unlockKey));

  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlockMedia = async () => {
    if (!anime) return;
    setIsUnlocking(true);
    const success = await unlockMedia(anime.id, isMovie ? undefined : selectedEpisode, unlockCost);
    setIsUnlocking(false);
    if (!success) {
      showError('Server error: Failed to unlock media.');
    }
  };

  const handlePlayPause = () => {
    if (!player) return;
    if (!isUnlocked) return;
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
    const nextFullscreen = !isLayoutFullscreen;
    setIsLayoutFullscreen(nextFullscreen);

    if (nextFullscreen && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }

    if (Platform.OS !== 'web') {
      try {
        if (nextFullscreen) {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          StatusBar.setHidden(true);
        } else {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          StatusBar.setHidden(false);
        }
      } catch (e) {
        console.log('Orientation lock failed:', e);
      }
    }
  };

  // Cleanup orientation on unmount
  useEffect(() => {
    return () => {
      if (Platform.OS !== 'web') {
        ScreenOrientation.unlockAsync().catch(() => {});
        StatusBar.setHidden(false);
      }
    };
  }, []);

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



      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isLayoutFullscreen}
      >
        <View style={[styles.contentWrapper, { maxWidth: maxContentWidth }]}>
          
          {/* 🎬 Clean Cinema Video Frame */}
          <View style={[styles.playerWrapper, isLayoutFullscreen && styles.playerWrapperFullscreen]}>
            <View style={[styles.videoBox, (isDesktop || isTablet) && styles.videoBoxDesktop, isLayoutFullscreen && styles.videoBoxFullscreen]}>
              {!isUnlocked && anime ? (
                <View style={styles.paywallOverlay}>
                  <View style={styles.paywallContent}>
                    <View style={styles.lockIconCircle}>
                      <Lock color="#FFB800" size={32} />
                    </View>
                    <Text style={styles.paywallTitle}>Unlock {isMovie ? 'Movie' : `Episode ${selectedEpisode}`}</Text>
                    <Text style={styles.paywallDesc}>
                      {isMovie 
                        ? 'Unlock this full 4K movie permanently to watch anytime.' 
                        : 'Unlock this episode permanently to watch anytime.'}
                    </Text>
                    
                    {coins >= unlockCost ? (
                      <Pressable 
                        style={styles.unlockBtn} 
                        onPress={handleUnlockMedia}
                        disabled={isUnlocking}
                      >
                        <Text style={styles.unlockBtnText}>
                          {isUnlocking ? 'Unlocking...' : `Unlock Now (${unlockCost} 💰)`}
                        </Text>
                      </Pressable>
                    ) : (
                      <View style={{ width: '100%', alignItems: 'center', gap: 12 }}>
                        <Pressable 
                          style={[styles.unlockBtn, styles.unlockBtnDisabled]} 
                          disabled={true}
                        >
                          <Text style={styles.unlockBtnTextDisabled}>
                            Not Enough Coins ({coins}/{unlockCost})
                          </Text>
                        </Pressable>
                        <Pressable 
                          style={styles.earnMoreBtn} 
                          onPress={() => showRewardedAd({ rewardCoins: 12, rewardType: 'coins' })}
                        >
                          <Text style={styles.earnMoreBtnText}>Watch Ad to Earn +12 💰</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <Pressable style={styles.videoOverlayContainer} onPress={handleTapVideo}>
                  <VideoView
                    ref={videoViewRef}
                    style={styles.videoElement}
                    player={player}
                    contentFit="contain"
                    nativeControls={false}
                  />

                  {playbackError && (
                    <View style={styles.videoErrorBox}>
                      <Tv color={themeColors.error} size={32} />
                      <Text style={[styles.videoErrorText, { color: themeColors.textSecondary }]}>{playbackError}</Text>
                    </View>
                  )}

                  {/* YouTube Style Overlay */}
                  {showControls && (
                    <Pressable style={styles.youtubeOverlay} onPress={handleTapVideo}>
                      {/* Top Bar - Settings */}
                      <View style={styles.youtubeTopBar}>
                        <View style={{ flex: 1 }} />
                        <Pressable style={styles.youtubeSettingsBtn} onPress={(e) => { e.stopPropagation(); setShowSettingsModal(true); }}>
                          <Settings color="#fff" size={24} />
                        </Pressable>
                      </View>

                      {/* Center Play/Pause & Skip */}
                      <View style={styles.youtubeCenterBar}>
                        <Pressable style={styles.youtubeSkipBtn} onPress={(e) => { e.stopPropagation(); handleSeekBackward10(); }}>
                          <RotateCcw color="#fff" size={32} />
                        </Pressable>
                        <Pressable style={styles.youtubePlayBtn} onPress={(e) => { e.stopPropagation(); handlePlayPause(); }}>
                          <View style={styles.youtubePlayBtnBg}>
                            {isPlaying ? <Pause color="#fff" size={36} fill="#fff" /> : <Play color="#fff" size={36} fill="#fff" style={{ marginLeft: 4 }} />}
                          </View>
                        </Pressable>
                        <Pressable style={styles.youtubeSkipBtn} onPress={(e) => { e.stopPropagation(); handleSeekForward10(); }}>
                          <RotateCw color="#fff" size={32} />
                        </Pressable>
                      </View>

                      {/* Bottom Bar - Scrubber & Fullscreen */}
                      <View style={styles.youtubeBottomBar}>
                        <View style={styles.youtubeTimeRow}>
                           <Text style={styles.youtubeTimeText}>
                             {/* Time info not readily available from expo-video without custom hook, but we have a dummy for UI */}
                           </Text>
                        </View>
                        <View style={styles.youtubeControlsRow}>
                          <Pressable style={styles.youtubeIconBtn} onPress={(e) => { e.stopPropagation(); handleToggleMute(); }}>
                            {isMuted ? <VolumeX color="#fff" size={24} /> : <Volume2 color="#fff" size={24} />}
                          </Pressable>
                          
                          <View style={{ flex: 1 }} />
                          
                          {/* Speed Toggle */}
                          <Pressable style={styles.youtubeIconBtn} onPress={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); }}>
                            <Text style={styles.youtubeSpeedText}>{playbackSpeed}x</Text>
                          </Pressable>

                          <Pressable style={styles.youtubeIconBtn} onPress={(e) => { e.stopPropagation(); handleFullscreen(); }}>
                            {isLayoutFullscreen ? <Minimize2 color="#fff" size={24} /> : <Maximize2 color="#fff" size={24} />}
                          </Pressable>
                        </View>
                      </View>
                    </Pressable>
                  )}
                </Pressable>
              )}
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
        availableQualities={(anime?.qualities?.length ? anime.qualities : ['4K', '1080p', '720p', '480p']).map(q => (q.includes('4K') || q.includes('1080p')) ? `${q} 👑` : q)}
        activeQuality={selectedQuality}
        onSelectQuality={(q) => {
          if (q.includes('👑') && !isVIP) {
            showError('High Quality streams are exclusive to VIP members!');
            return;
          }
          setSelectedQuality(q);
          showSuccess(`Stream quality set to ${q}`);
        }}
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
  playerWrapperFullscreen: {
    ...(Platform.OS === 'web' ? { position: 'fixed' as any } : { position: 'absolute' }),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#000',
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
    maxHeight: 600,
  },
  videoBoxFullscreen: {
    flex: 1,
    height: '100%',
    maxHeight: undefined,
    aspectRatio: undefined,
  },
  videoOverlayContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 100,
  },
  youtubeTopBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  youtubeSettingsBtn: {
    padding: 8,
  },
  youtubeCenterBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  youtubeSkipBtn: {
    padding: 10,
    opacity: 0.9,
  },
  youtubePlayBtn: {
    padding: 10,
  },
  youtubePlayBtnBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubeBottomBar: {
    flexDirection: 'column',
    gap: 10,
  },
  youtubeTimeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  youtubeTimeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  youtubeControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  youtubeIconBtn: {
    padding: 8,
  },
  youtubeSpeedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  videoElement: {
    width: '100%',
    height: '100%',
  },
  videoErrorBox: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 15, 0.94)',
    gap: 8,
  },
  videoErrorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  paywallOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    padding: 24,
  },
  paywallContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  lockIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  paywallTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  paywallDesc: {
    color: '#A0A0A0',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  unlockBtn: {
    backgroundColor: '#FFB800',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  unlockBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
  unlockBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  unlockBtnTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 15,
    fontWeight: '800',
  },
  earnMoreBtn: {
    paddingVertical: 12,
  },
  earnMoreBtnText: {
    color: '#FFB800',
    fontSize: 14,
    fontWeight: '700',
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
    borderRadius: 16,
    overflow: 'hidden',
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
