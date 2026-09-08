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
  StatusBar,
  Modal,
  PanResponder,
  ActivityIndicator,
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
  Volume1,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Tv,
  Layers,
  Settings,
  Lock,
  SkipForward,
  Check,
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
import { VipSubscriptionModal } from '@/components/VipSubscriptionModal';
import { AdMobBanner } from '@/components/AdMobBanner';

import { VideoJsPlayer } from '@/components/VideoJsPlayer';

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export default function WatchScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const themeColors = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getStatsForMedia } = useReviews();
  const { maxContentWidth, railCardWidth, railCardHeight, isDesktop, isTablet, pagePad } = useResponsive();
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
  const [volume, setVolume] = useState(1.0);

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto');
  const [selectedAudio, setSelectedAudio] = useState<string>('Kurdish Dubbed');
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [isExpandedSynopsis, setIsExpandedSynopsis] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Player timing & aspect ratio states
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [contentFit, setContentFit] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [progressTrackWidth, setProgressTrackWidth] = useState(240);

  // Gesture states & refs for smooth timeline scrubber & volume dragging
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);
  const [scrubberDragTime, setScrubberDragTime] = useState<number | null>(null);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  const scrubberTrackRef = useRef<View>(null);
  const volumeTrackRef = useRef<View>(null);
  const scrubberPageXRef = useRef<number>(0);
  const volumePageXRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const progressTrackWidthRef = useRef<number>(240);
  const volumeTrackWidthRef = useRef<number>(70);
  const ignoreSyncUntilRef = useRef<number>(0);
  const lastSeekTimeRef = useRef<number>(0);

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

  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  // Enable DRM content protection when screen mounts; remove when leaving
  useEffect(() => {
    enableContentProtection();
    return () => {
      disableContentProtection();
    };
  }, []);

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
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

  // Synchronize playback position & duration from player
  useEffect(() => {
    const activePlayer = playerRef.current || player;
    if (!activePlayer) return;
    const interval = setInterval(() => {
      try {
        const p = playerRef.current || player;
        if (!p) return;
        if (p.duration && p.duration > 0) {
          setDuration(p.duration);
        }
        if (
          typeof p.currentTime === 'number' &&
          !isDraggingScrubber &&
          Date.now() > ignoreSyncUntilRef.current
        ) {
          setCurrentTime(p.currentTime);
        }
      } catch (_e) {}
    }, 300);
    return () => clearInterval(interval);
  }, [player, isDraggingScrubber]);

  const formatTime = (secs: number): string => {
    if (!secs || isNaN(secs) || secs < 0) return '00:00';
    const totalSecs = Math.floor(secs);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const remainingSecs = totalSecs % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    if (hours > 0) {
      return `${hours}:${pad(mins)}:${pad(remainingSecs)}`;
    }
    return `${pad(mins)}:${pad(remainingSecs)}`;
  };

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const handleSeekTo = (targetTime: number) => {
    const activePlayer = playerRef.current || player;
    if (!activePlayer) return;
    try {
      const dur = durationRef.current || activePlayer.duration || 0;
      const clamped = Math.max(0, Math.min(targetTime, dur));

      setCurrentTime(clamped);
      setIsSeeking(true);
      ignoreSyncUntilRef.current = Date.now() + 2500;

      try {
        activePlayer.currentTime = clamped;
      } catch (e) {
        if (__DEV__) console.warn('[Watch] activePlayer currentTime error:', e);
      }

      if (isPlaying) {
        try {
          activePlayer.play();
        } catch (_e) {}
      }

      setTimeout(() => {
        setIsSeeking(false);
      }, 500);
    } catch (e) {
      setIsSeeking(false);
      if (__DEV__) console.warn('[Watch] seek error:', e);
    }
  };

  const handleSeekToRef = useRef(handleSeekTo);
  useEffect(() => {
    handleSeekToRef.current = handleSeekTo;
  }, [handleSeekTo]);

  const updateScrubberPageX = () => {
    if (Platform.OS === 'web' && scrubberTrackRef.current) {
      const rect = (scrubberTrackRef.current as any)?.getBoundingClientRect?.();
      if (rect) {
        scrubberPageXRef.current = rect.left;
        progressTrackWidthRef.current = rect.width;
        return;
      }
    }
    scrubberTrackRef.current?.measureInWindow((x, _y, width) => {
      if (width > 0) {
        scrubberPageXRef.current = x;
        progressTrackWidthRef.current = width;
      }
    });
  };

  const updateVolumePageX = () => {
    if (Platform.OS === 'web' && volumeTrackRef.current) {
      const rect = (volumeTrackRef.current as any)?.getBoundingClientRect?.();
      if (rect) {
        volumePageXRef.current = rect.left;
        volumeTrackWidthRef.current = rect.width;
        return;
      }
    }
    volumeTrackRef.current?.measureInWindow((x, _y, width) => {
      if (width > 0) {
        volumePageXRef.current = x;
        volumeTrackWidthRef.current = width;
      }
    });
  };

  const getScrubberTargetTime = (pageX: number) => {
    let trackX = scrubberPageXRef.current;
    let w = progressTrackWidthRef.current > 0 ? progressTrackWidthRef.current : 240;
    if (Platform.OS === 'web' && scrubberTrackRef.current) {
      const rect = (scrubberTrackRef.current as any)?.getBoundingClientRect?.();
      if (rect) {
        trackX = rect.left;
        w = rect.width;
      }
    }
    const touchX = pageX - trackX;
    const ratio = Math.max(0, Math.min(1, touchX / (w || 1)));
    const activeP = playerRef.current;
    const dur = durationRef.current || activeP?.duration || 0;
    return dur > 0 ? ratio * dur : 0;
  };

  const getVolumeRatio = (pageX: number) => {
    const trackX = volumePageXRef.current;
    const w = volumeTrackWidthRef.current > 0 ? volumeTrackWidthRef.current : 70;
    const touchX = pageX - trackX;
    return Math.max(0, Math.min(1, touchX / w));
  };

  const scrubberPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        setIsDraggingScrubber(true);
        updateScrubberPageX();
        setScrubberDragTime(getScrubberTargetTime(evt.nativeEvent.pageX));
      },
      onPanResponderMove: (evt) => {
        setScrubberDragTime(getScrubberTargetTime(evt.nativeEvent.pageX));
      },
      onPanResponderRelease: (evt) => {
        const targetTime = getScrubberTargetTime(evt.nativeEvent.pageX);
        handleSeekToRef.current(targetTime);
        setIsDraggingScrubber(false);
        setScrubberDragTime(null);
      },
      onPanResponderTerminate: () => {
        setIsDraggingScrubber(false);
        setScrubberDragTime(null);
      },
    })
  ).current;

  const volumePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        setIsDraggingVolume(true);
        updateVolumePageX();
        handleVolumeChangeRef.current(getVolumeRatio(evt.nativeEvent.pageX));
      },
      onPanResponderMove: (evt) => {
        handleVolumeChangeRef.current(getVolumeRatio(evt.nativeEvent.pageX));
      },
      onPanResponderRelease: (evt) => {
        handleVolumeChangeRef.current(getVolumeRatio(evt.nativeEvent.pageX));
        setIsDraggingVolume(false);
      },
      onPanResponderTerminate: () => {
        setIsDraggingVolume(false);
      },
    })
  ).current;

  const displayTime = isDraggingScrubber && scrubberDragTime !== null ? scrubberDragTime : currentTime;
  const scrubberPercent = duration > 0 ? Math.max(0, Math.min(100, (displayTime / duration) * 100)) : 0;
  const isLoadingVideo = isSeeking || isDraggingScrubber || player?.status === 'loading' || (player as any)?.isBuffering;

  const handleSkipIntro = () => {
    const activePlayer = playerRef.current || player;
    if (!activePlayer) return;
    try {
      const current = activePlayer.currentTime || 0;
      const target = Math.min(current + 85, duration || current + 85);
      handleSeekTo(target);
      showSuccess('Skipped Intro (+85s) ⏩');
    } catch (_e) {}
  };

  const handleNextEpisode = () => {
    if (!anime) return;
    const totalEps = anime.episodes || 24;
    if (selectedEpisode < totalEps) {
      setSelectedEpisode((prev) => prev + 1);
      showSuccess(`Loading Episode ${selectedEpisode + 1}... 📺`);
    } else {
      showSuccess('You are watching the latest episode!');
    }
  };

  const toggleContentFit = () => {
    setContentFit((prev) => (prev === 'contain' ? 'cover' : prev === 'cover' ? 'fill' : 'contain'));
  };

  // Periodic playback progress saver
  useEffect(() => {
    const activePlayer = playerRef.current || player;
    if (!anime || !activePlayer) return;

    const saveInterval = setInterval(() => {
      try {
        const p = playerRef.current || player;
        if (p && p.currentTime > 0 && p.duration > 0) {
          updateProgress(anime, p.currentTime, p.duration, selectedEpisode);
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
  const isKDrama = anime?.category === 'K-Drama' || anime?.category === 'Drama';
  const animeCategory = anime?.category ?? 'Anime';
  const unlockCost = isMovie ? 125 : isKDrama ? 100 : 80;
  const unlockKey = anime && !isMovie ? `${anime.id}_ep_${selectedEpisode}` : anime?.id;
  const isUnlocked = isVIP || (unlockKey && unlockedMediaIds.includes(unlockKey));

  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlockMedia = async () => {
    if (!anime) return;
    setIsUnlocking(true);
    // Pass category so server reads the authoritative cost from content_cost_registry
    const success = await unlockMedia(anime.id, isMovie ? undefined : selectedEpisode, unlockCost, animeCategory);
    setIsUnlocking(false);
    if (!success) {
      showError('Not enough coins or server error. Try watching an ad to earn more!');
    }
  };

  const handlePlayPause = () => {
    const activePlayer = playerRef.current || player;
    if (!activePlayer) return;
    if (!isUnlocked) return;
    if (isPlaying) {
      try { activePlayer.pause(); } catch (_e) {}
      setIsPlaying(false);
    } else {
      try { activePlayer.play(); } catch (_e) {}
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    setIsMuted(clamped === 0);
    const activePlayer = playerRef.current || player;
    if (activePlayer) {
      try {
        activePlayer.volume = clamped;
        activePlayer.muted = clamped === 0;
      } catch (_e) {}
    }
  };

  const handleToggleMute = () => {
    const activePlayer = playerRef.current || player;
    if (!activePlayer) return;
    if (isMuted || volume === 0) {
      const restoreVol = volume > 0 ? volume : 1.0;
      try {
        activePlayer.muted = false;
        activePlayer.volume = restoreVol;
      } catch (_e) {}
      setIsMuted(false);
      setVolume(restoreVol);
    } else {
      try {
        activePlayer.muted = true;
      } catch (_e) {}
      setIsMuted(true);
    }
  };

  const handleSeekForward10 = () => {
    const activePlayer = playerRef.current || player;
    if (!activePlayer) return;
    try {
      const current = typeof activePlayer.currentTime === 'number' ? activePlayer.currentTime : currentTime;
      const target = Math.min((durationRef.current || activePlayer.duration || 0), current + 10);
      handleSeekTo(target);
    } catch (e) {
      if (__DEV__) console.warn('[Watch] seek forward error:', e);
    }
  };

  const handleSeekBackward10 = () => {
    const activePlayer = playerRef.current || player;
    if (!activePlayer) return;
    try {
      const current = typeof activePlayer.currentTime === 'number' ? activePlayer.currentTime : currentTime;
      const target = Math.max(0, current - 10);
      handleSeekTo(target);
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
    setShowControls(true);

    if (nextFullscreen && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }

    if (Platform.OS === 'web') {
      try {
        if (nextFullscreen) {
          const docEl = document.documentElement;
          if (docEl.requestFullscreen) {
            await docEl.requestFullscreen();
          } else if ((docEl as any).webkitRequestFullscreen) {
            await (docEl as any).webkitRequestFullscreen();
          }
        } else {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          } else if ((document as any).webkitFullscreenElement) {
            await (document as any).webkitExitFullscreen();
          }
        }
      } catch (e) {
        if (__DEV__) console.warn('[Watch] web fullscreen error:', e);
      }
    } else {
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

  // Sync web fullscreen exit via ESC key or browser gesture
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleFsChange = () => {
        const isFs = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
        setIsLayoutFullscreen(isFs);
        setShowControls(true);
      };
      document.addEventListener('fullscreenchange', handleFsChange);
      document.addEventListener('webkitfullscreenchange', handleFsChange);
      return () => {
        document.removeEventListener('fullscreenchange', handleFsChange);
        document.removeEventListener('webkitfullscreenchange', handleFsChange);
      };
    }
  }, []);

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
      
      {/* 🔙 Minimalist Navigation Header Bar (Hidden during Fullscreen) */}
      {!isLayoutFullscreen && (
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
      )}



      {/* 🎬 PERSISTENT VIDEO PLAYER CONTAINER (NEVER UNMOUNTS VideoView) */}
      <View
        style={[
          styles.playerWrapper,
          isLayoutFullscreen && styles.playerWrapperFullscreen,
        ]}
      >
        <View style={[
          styles.videoBox,
          isLayoutFullscreen ? styles.videoBoxFullscreen : (!isUnlocked && styles.videoBoxLocked),
          (!isLayoutFullscreen && (isDesktop || isTablet)) && styles.videoBoxDesktop,
        ]}>
          {!isUnlocked && anime ? (
            // ═══════════════════════════════════════════════
            // PREMIUM LOCK PAYWALL OVERLAY
            // ═══════════════════════════════════════════════
            <View style={styles.paywallOverlay}>
              {/* Blurred background thumbnail */}
              {anime.image_url && (
                <Image
                  source={{ uri: anime.image_url }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  blurRadius={8}
                />
              )}
              {/* Dark gradient veil */}
              <View style={styles.paywallVeil} />

              <View style={styles.paywallContent}>
                {/* Lock icon */}
                <View style={styles.lockIconCircle}>
                  <Lock color="#FFB800" size={30} />
                </View>

                {/* Title */}
                <Text style={styles.paywallTitle}>
                  {isMovie
                    ? `🎬 ${anime.title}`
                    : `📺 Episode ${selectedEpisode} — ${anime.title}`}
                </Text>

                {/* Category pill */}
                <View style={styles.paywallCategoryPill}>
                  <Text style={styles.paywallCategoryText}>
                    {isMovie ? '🎥 Movie' : isKDrama ? '🇰🇷 K-Drama / Drama' : '⚡ Anime'}
                  </Text>
                </View>

                {/* Cost badge */}
                <View style={styles.paywallCostRow}>
                  <Text style={styles.paywallCostLabel}>Unlock Cost</Text>
                  <View style={styles.paywallCostBadge}>
                    <Text style={styles.paywallCostAmount}>{unlockCost} 💰</Text>
                  </View>
                </View>

                {/* Coin balance */}
                <Text style={styles.paywallBalance}>
                  Your balance: <Text style={{ color: coins >= unlockCost ? '#00E676' : '#FF5252' }}>{coins} 💰</Text>
                </Text>

                {/* Primary action */}
                {coins >= unlockCost ? (
                  <Pressable
                    style={styles.unlockBtn}
                    onPress={handleUnlockMedia}
                    disabled={isUnlocking}
                    accessibilityRole="button"
                    accessibilityLabel={`Unlock for ${unlockCost} coins`}
                  >
                    <Text style={styles.unlockBtnText}>
                      {isUnlocking ? '⏳ Unlocking...' : `🔓 Unlock for ${unlockCost} 💰`}
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      style={[styles.unlockBtn, styles.unlockBtnDisabled]}
                      disabled={true}
                    >
                      <Text style={styles.unlockBtnTextDisabled}>
                        🔒 Need {unlockCost - coins} more coins
                      </Text>
                    </Pressable>

                    {/* Earn coins via ad */}
                    <Pressable
                      style={styles.earnMoreBtn}
                      onPress={() => showRewardedAd({
                        rewardCoins: 12,
                        rewardType: 'coins',
                        onRewarded: () => showSuccess('You earned 12 💰 — keep watching ads!'),
                      })}
                      accessibilityRole="button"
                      accessibilityLabel="Watch an ad to earn 12 coins"
                    >
                      <Text style={styles.earnMoreBtnText}>📺 Watch Ad → Earn +12 💰</Text>
                    </Pressable>
                  </>
                )}

                {/* VIP upsell strip */}
                <Pressable
                  style={styles.vipUpsellStrip}
                  onPress={() => setShowVipModal(true)}
                >
                  <Text style={styles.vipUpsellText}>
                    👑 VIP members watch everything free — Ad-Free + 4K Ultra HD
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : Platform.OS === 'web' ? (
            <VideoJsPlayer
              src={typeof videoSource === 'string' ? videoSource : videoSource?.uri}
              poster={anime?.image_url}
              title={anime?.title}
              onFullscreenChange={(fs) => setIsLayoutFullscreen(fs)}
            />
          ) : (
            <View style={styles.videoOverlayContainer}>
              <VideoView
                ref={videoViewRef}
                style={styles.videoElement}
                player={player}
                contentFit={contentFit}
                nativeControls={false}
                allowsFullscreen={true}
              />

              {/* Backdrop Pressable to toggle controls when tapping empty video space */}
              <Pressable
                style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
                onPress={() => {
                  setShowControls((prev) => !prev);
                  setShowSpeedMenu(false);
                }}
              />

              {playbackError && (
                <View style={styles.videoErrorBox} pointerEvents="none">
                  <Tv color={themeColors.error} size={32} />
                  <Text style={[styles.videoErrorText, { color: themeColors.textSecondary }]}>{playbackError}</Text>
                </View>
              )}

              {/* Center Play / Loading button when controls are hidden and video is buffering/loading */}
              {!showControls && isLoadingVideo && !playbackError && (
                <View style={styles.centerLoadingOverlay} pointerEvents="none">
                  <View style={styles.youtubePlayBtnBg}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                </View>
              )}

              {/* Ultra-HD Cinema Player Overlay */}
              {showControls && (
                <View
                  style={[
                    styles.youtubeOverlay,
                    isLayoutFullscreen && {
                      paddingHorizontal: Math.max(insets.left, insets.right, 16),
                      paddingBottom: Math.max(insets.bottom, 8),
                      paddingTop: Math.max(insets.top, 8),
                    }
                  ]}
                  pointerEvents="box-none"
                >
                  {/* Top Bar - Spacer */}
                  <View style={styles.youtubeTopBar} pointerEvents="none">
                    <View style={{ flex: 1 }} />
                  </View>

                  {/* Center Play/Pause & Skip Buttons */}
                  <View style={styles.youtubeCenterBar} pointerEvents="auto">
                    <Pressable
                      style={styles.youtubeSkipBtn}
                      onPress={handleSeekBackward10}
                    >
                      <View style={styles.skipBtnBox}>
                        <RotateCcw color="#FFFFFF" size={26} />
                        <Text style={styles.skipBtnText}>-10s</Text>
                      </View>
                    </Pressable>

                    <Pressable
                      style={styles.youtubePlayBtn}
                      onPress={handlePlayPause}
                    >
                      <View style={styles.youtubePlayBtnBg}>
                        {isLoadingVideo ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : isPlaying ? (
                          <Pause color="#FFFFFF" size={34} fill="#FFFFFF" />
                        ) : (
                          <Play color="#FFFFFF" size={34} fill="#FFFFFF" style={{ marginLeft: 4 }} />
                        )}
                      </View>
                    </Pressable>

                    <Pressable
                      style={styles.youtubeSkipBtn}
                      onPress={handleSeekForward10}
                    >
                      <View style={styles.skipBtnBox}>
                        <RotateCw color="#FFFFFF" size={26} />
                        <Text style={styles.skipBtnText}>+10s</Text>
                      </View>
                    </Pressable>
                  </View>

                  {/* Bottom Bar - Scrubber & Custom Actions */}
                  <View style={styles.youtubeBottomBar} pointerEvents="auto">
                    {/* Interactive Scrubber Bar & Timestamp */}
                    <View style={styles.scrubberRow}>
                      <View
                        ref={scrubberTrackRef}
                        style={styles.scrubberTrack}
                        onLayout={(e) => {
                          const w = e.nativeEvent.layout.width;
                          if (w > 0) {
                            setProgressTrackWidth(w);
                            progressTrackWidthRef.current = w;
                          }
                        }}
                        hitSlop={{ top: 16, bottom: 16, left: 10, right: 10 }}
                        {...scrubberPanResponder.panHandlers}
                      >
                        <View
                          style={[
                            styles.scrubberFill,
                            {
                              width: `${scrubberPercent}%`,
                            },
                          ]}
                          pointerEvents="none"
                        />
                        <View
                          style={[
                            styles.scrubberDot,
                            isDraggingScrubber && styles.scrubberDotActive,
                            {
                              left: `${scrubberPercent}%`,
                            },
                          ]}
                          pointerEvents="none"
                        />
                      </View>

                      <Text style={styles.youtubeTimeText}>
                        {formatTime(displayTime)} / {formatTime(duration)}
                      </Text>
                    </View>

                    {/* Controls Toolbar Row */}
                    <View style={styles.youtubeControlsRow}>
                      {/* Volume Control Group (Icon + Slider) */}
                      <View style={styles.volumeControlGroup}>
                        <Pressable
                          style={styles.youtubeIconBtn}
                          onPress={handleToggleMute}
                          accessibilityRole="button"
                          accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX color="#FF5252" size={20} />
                          ) : volume < 0.5 ? (
                            <Volume1 color="#FFFFFF" size={20} />
                          ) : (
                            <Volume2 color="#FFFFFF" size={20} />
                          )}
                        </Pressable>

                        <View
                          ref={volumeTrackRef}
                          style={styles.volumeBarTrack}
                          onLayout={(e) => {
                            const w = e.nativeEvent.layout.width;
                            if (w > 0) volumeTrackWidthRef.current = w;
                          }}
                          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                          {...volumePanResponder.panHandlers}
                        >
                          <View
                            style={[
                              styles.volumeBarFill,
                              { width: `${isMuted ? 0 : volume * 100}%` }
                            ]}
                            pointerEvents="none"
                          />
                          <View
                            style={[
                              styles.volumeBarThumb,
                              isDraggingVolume && styles.volumeBarThumbActive,
                              { left: `${isMuted ? 0 : volume * 100}%` }
                            ]}
                            pointerEvents="none"
                          />
                        </View>
                      </View>

                      <View style={{ flex: 1 }} />

                      {/* Next Episode Button */}
                      {!isMovie && (
                        <Pressable
                          style={styles.nextEpPillBtn}
                          onPress={handleNextEpisode}
                        >
                          <Text style={styles.nextEpPillText}>Next Ep</Text>
                          <SkipForward size={13} color="#FFFFFF" />
                        </Pressable>
                      )}

                      {/* Settings Gear Button */}
                      <Pressable
                        style={styles.youtubeIconBtn}
                        onPress={() => setShowSettingsModal(true)}
                      >
                        <Settings color="#FFFFFF" size={20} />
                      </Pressable>

                      {/* Fullscreen Toggle */}
                      <Pressable
                        style={styles.youtubeIconBtn}
                        onPress={handleFullscreen}
                      >
                        {isLayoutFullscreen ? <Minimize2 color="#FFFFFF" size={20} /> : <Maximize2 color="#FFFFFF" size={20} />}
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* 📜 BELOW-PLAYER SCROLLVIEW (Hidden during Fullscreen) */}
      {!isLayoutFullscreen && (
        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }} 
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentWrapper, { maxWidth: maxContentWidth }]}>
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

            {/* 📢 Sponsored Banner */}
            <AdMobBanner placement="watch_bottom" style={{ paddingHorizontal: pagePad, marginTop: 14 }} />

            {/* ⭐ COMMUNITY REVIEWS SECTION */}
            {anime && (
              <View style={{ marginTop: 16 }}>
                <ReviewsSection mediaId={anime.id} mediaTitle={anime.title} />
              </View>
            )}

            <View style={{ height: 80 }} />
          </View>
        </ScrollView>
      )}

      {/* ⚙️ Player Quality, Audio & Speed Settings Modal */}
      <PlayerSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        playbackSpeed={playbackSpeed}
        onSelectSpeed={(speed) => {
          setPlaybackSpeed(speed);
          try { (playerRef.current || player).playbackRate = speed; } catch (_e) {}
        }}
        availableQualities={anime?.qualities?.length ? anime.qualities : ['4K Ultra HD', '1080p Full HD', '720p HD', '480p SD']}
        activeQuality={selectedQuality}
        onSelectQuality={(q) => {
          setSelectedQuality(q);
          showSuccess(`Stream quality set to ${q}`);
        }}
        availableAudioTracks={anime?.audio_tracks}
        activeAudio={selectedAudio}
        onSelectAudio={(a) => setSelectedAudio(a)}
        isVIP={isVIP}
        onOpenVipModal={() => {
          setShowSettingsModal(false);
          setShowVipModal(true);
        }}
      />

      <VipSubscriptionModal
        visible={showVipModal}
        onClose={() => setShowVipModal(false)}
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
    width: '100%',
    height: '100%',
    zIndex: 999999,
    elevation: 999999,
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
  videoBoxLocked: {
    aspectRatio: undefined,
    minHeight: 380,
  },
  videoBoxDesktop: {
    maxHeight: 600,
  },
  videoBoxFullscreen: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
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
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 100,
    elevation: 100,
  },
  youtubeTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 150,
    elevation: 150,
  },
  playerTitleBox: {
    flex: 1,
    paddingRight: 10,
  },
  playerTitleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  playerTopRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 160,
    elevation: 160,
  },
  playerPillBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  playerPillBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  playerPillBadgePrimary: {
    backgroundColor: 'rgba(3, 86, 197, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0356C5',
  },
  playerPillBadgePrimaryText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '900',
  },
  skipBtnBox: {
    alignItems: 'center',
    gap: 2,
  },
  skipBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scrubberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  scrubberTrack: {
    flex: 1,
    height: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  scrubberFill: {
    height: 4,
    backgroundColor: '#0356C5',
    borderRadius: 2,
  },
  scrubberDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00D2FF',
    marginTop: -5,
    marginLeft: -7,
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  scrubberDotActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: -7,
    marginLeft: -9,
    backgroundColor: '#FFFFFF',
  },
  skipIntroPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 184, 0, 0.18)',
    borderWidth: 1,
    borderColor: '#FFB800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skipIntroPillText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '800',
  },
  nextEpPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(3, 86, 197, 0.35)',
    borderWidth: 1,
    borderColor: '#0356C5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nextEpPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  youtubeSettingsBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    elevation: 200,
  },
  youtubeCenterBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    zIndex: 150,
    elevation: 150,
  },
  youtubeSkipBtn: {
    padding: 10,
    opacity: 0.9,
    zIndex: 160,
    elevation: 160,
  },
  youtubePlayBtn: {
    padding: 10,
    zIndex: 170,
    elevation: 170,
  },
  youtubePlayBtnBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedPopoverCard: {
    position: 'absolute',
    right: 8,
    bottom: 30,
    width: 145,
    backgroundColor: '#0A0E1A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: 6,
    zIndex: 300,
    elevation: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  speedPopoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 6,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  speedPopoverTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  speedOptionsList: {
    flexDirection: 'column',
    gap: 2,
  },
  speedOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  speedOptionActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
  },
  speedOptionText: {
    color: '#B0B5C6',
    fontSize: 11,
    fontWeight: '600',
  },
  speedOptionTextActive: {
    color: '#00D2FF',
    fontWeight: '800',
  },
  youtubeBottomBar: {
    flexDirection: 'column',
    gap: 4,
    zIndex: 150,
    elevation: 150,
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
    gap: 12,
  },
  youtubeIconBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
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
  centerLoadingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 150,
  },
  paywallOverlay: {
    width: '100%',
    minHeight: 380,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 20,
    paddingVertical: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  paywallContent: {
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  lockIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255, 184, 0, 0.18)',
    borderWidth: 1.5, borderColor: 'rgba(255,184,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  paywallTitle: {
    color: '#FFFFFF', fontSize: 17, fontWeight: '900',
    marginBottom: 8, textAlign: 'center', lineHeight: 22,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  unlockBtnTextDisabled: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 15, fontWeight: '800',
  },
  earnMoreBtn: {
    marginTop: 10,
    backgroundColor: 'rgba(3, 86, 197, 0.22)',
    borderWidth: 1, borderColor: '#0356C5',
    paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 12, width: '100%', alignItems: 'center',
  },
  earnMoreBtnText: {
    color: '#00D2FF', fontSize: 14, fontWeight: '800',
  },
  paywallVeil: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  paywallCategoryPill: {
    backgroundColor: 'rgba(255,184,0,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.4)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
    marginBottom: 14,
  },
  paywallCategoryText: {
    color: '#FFB800', fontSize: 11, fontWeight: '800', letterSpacing: 0.5,
  },
  paywallCostRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6,
  },
  paywallCostLabel: {
    color: '#A0A0B8', fontSize: 13, fontWeight: '600',
  },
  paywallCostBadge: {
    backgroundColor: '#1C1C28', borderWidth: 1, borderColor: '#FFB800',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  paywallCostAmount: {
    color: '#FFD700', fontSize: 15, fontWeight: '900',
  },
  paywallBalance: {
    color: '#A0A0B8', fontSize: 12, fontWeight: '600', marginBottom: 18,
  },
  vipUpsellStrip: {
    marginTop: 14,
    backgroundColor: 'rgba(156, 39, 176, 0.2)',
    borderWidth: 1, borderColor: 'rgba(156, 39, 176, 0.5)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    width: '100%',
  },
  vipUpsellText: {
    color: '#CE93D8', fontSize: 11, fontWeight: '700',
    textAlign: 'center', lineHeight: 16,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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

  /* VOLUME CONTROL STYLES */
  volumeControlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  volumeBarTrack: {
    width: 70,
    height: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  volumeBarFill: {
    height: 4,
    backgroundColor: '#00D2FF',
    borderRadius: 2,
  },
  volumeBarThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    marginTop: -4,
    marginLeft: -6,
  },
  volumeBarThumbActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: -6,
    marginLeft: -8,
    backgroundColor: '#00D2FF',
  },

});
