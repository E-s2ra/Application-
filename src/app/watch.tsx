import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
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
  AppState,
  useWindowDimensions,
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
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
  ArrowRight,
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
  RefreshCw,
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
import { SourceSelector } from '@/components/SourceSelector';
import { VideoSource } from '@/types';
import { PlayerSettingsModal } from '@/components/PlayerSettingsModal';
import { useGamification } from '@/hooks/useGamification';
import { useAdMob } from '@/hooks/useAdMob';
import { VipSubscriptionModal } from '@/components/VipSubscriptionModal';
import { AdMobBanner } from '@/components/AdMobBanner';
import { releaseWebFocus } from '@/lib/web-focus';

import { VideoJsPlayer } from '@/components/VideoJsPlayer';

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export default function WatchScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const themeColors = useTheme();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getStatsForMedia } = useReviews();
  const { maxContentWidth, railCardWidth, railCardHeight, isDesktop, isTablet, isMobile, pagePad } = useResponsive({ desktopRailWidth: 0 });
  const { width: windowWidth } = useWindowDimensions();
  const defaultVideoHeight = Math.round((windowWidth * 9) / 16);
  const { language, isRTL, t } = useLanguage();
  const insets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };
  const { updateProgress } = useWatchHistory();
  const { isMediaUnlocked, getUnlockedMediaRemainingDays, unlockMedia, coins, isVIP } = useGamification();
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
  // Declared early so volumePanResponder can safely reference it via .current
  // (the actual handleVolumeChange function is synced via useEffect below)
  const handleVolumeChangeRef = useRef<(vol: number) => void>(() => {});

  const videoViewRef = useRef<VideoView>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [videoSource, setVideoSource] = useState<any>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isAuthorizingPlayback, setIsAuthorizingPlayback] = useState(false);
  const [playbackRetryKey, setPlaybackRetryKey] = useState(0);

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    try {
      p.muted = false;
      p.play();
    } catch (_e) {}
  });

  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  // Enable DRM content protection when screen mounts; remove when leaving
  useEffect(() => {
    enableContentProtection(isAdmin);
    return () => {
      disableContentProtection();
    };
  }, [isAdmin]);

  // Stop background video playback when app is minimized, inactive, or tab hidden
  useEffect(() => {
    // 1. Mobile AppState listener
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        try {
          if (playerRef.current) playerRef.current.pause();
        } catch (_e) {}
        setIsPlaying(false);
      }
    });

    // 2. Web visibilitychange listener
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        try {
          if (playerRef.current) playerRef.current.pause();
          document.querySelectorAll('video').forEach((v) => v.pause());
        } catch (_e) {}
        setIsPlaying(false);
      }
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      appStateSub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  // Guarantee video pauses immediately when user navigates away or screen loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        try {
          if (playerRef.current) playerRef.current.pause();
          if (Platform.OS === 'web' && typeof document !== 'undefined') {
            document.querySelectorAll('video').forEach((v) => v.pause());
          }
        } catch (_e) {}
        setIsPlaying(false);
      };
    }, [])
  );

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

  const updateScrubberPageX = useCallback(() => {
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
  }, []);

  const updateVolumePageX = useCallback(() => {
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
  }, []);

  const getScrubberTargetTime = useCallback((pageX: number) => {
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
  }, []);

  const getVolumeRatio = useCallback((pageX: number) => {
    const trackX = volumePageXRef.current;
    const w = volumeTrackWidthRef.current > 0 ? volumeTrackWidthRef.current : 70;
    const touchX = pageX - trackX;
    return Math.max(0, Math.min(1, touchX / w));
  }, []);

  // PanResponder callbacks run on gestures, not during render. The React 19
  // refs rule cannot see through PanResponder.create and reports these refs as
  // render-time reads, so keep the standard stable responder pattern scoped.
  /* eslint-disable react-hooks/refs */
  const [scrubberPanResponder] = useState(() =>
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
  );

  const [volumePanResponder] = useState(() =>
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
  );
  /* eslint-enable react-hooks/refs */

  const displayTime = isDraggingScrubber && scrubberDragTime !== null ? scrubberDragTime : currentTime;
  const scrubberPercent = duration > 0 ? Math.max(0, Math.min(100, (displayTime / duration) * 100)) : 0;
  const isLoadingVideo = isSeeking || isDraggingScrubber || (isPlaying && (player?.status === 'loading' || (player as any)?.isBuffering));

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
      showSuccess(`Loading Episode ${selectedEpisode + 1}...`);
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
    let cancelled = false;

    // A recommendation uses router.replace on this same screen instance. Reset
    // title-specific playback state immediately so the previous episode/player
    // cannot leak into the newly selected title while its metadata is loading.
    setSelectedEpisode(1);
    setAnime(null);
    setRecommendations([]);
    setVideoSource(null);
    setPlaybackError(null);
    setCurrentTime(0);
    setDuration(0);

    async function loadData() {
      if (!id) return;
      try {
        const [deletedIds, overrides] = await Promise.all([
          getDeletedMediaIds(),
          getEditedMediaOverrides(),
        ]);
        if (cancelled) return;

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
            .select('id, title, description, image_url, episodes, genre, category, is_featured')
            .eq('id', id)
            .single();
          if (cancelled) return;
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
          setAnime(null);
          setRecommendations([]);
          setPlaybackError('This title is not available in the catalog.');
          return;
        }

        let recs = null;
        if (isUuid) {
          const { data: supabaseRecs } = await supabase
            .from('anime')
            .select('id, title, description, image_url, episodes, genre, category, is_featured')
            .neq('id', id)
            .limit(6);
          if (cancelled) return;
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
        if (cancelled) return;
        console.warn('[Watch] Error loading media data:', e);
        setPlaybackError('Failed to load media details.');
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const isMovie = anime?.category === 'Movies' || anime?.category === 'Anime Movies';
  const unlockKey = anime && !isMovie ? `${anime.id}_ep_${selectedEpisode}` : anime?.id;
  const isUnlocked = isVIP || Boolean(unlockKey && isMediaUnlocked(unlockKey));
  const remainingUnlockDays = isUnlocked && !isVIP && unlockKey ? getUnlockedMediaRemainingDays(unlockKey) : null;
  const [unlockQuote, setUnlockQuote] = useState<{ category: string; costCoins: number } | null>(null);
  const [unlockQuoteError, setUnlockQuoteError] = useState<string | null>(null);
  const [isLoadingUnlockQuote, setIsLoadingUnlockQuote] = useState(false);

  useEffect(() => {
    if (!anime || isVIP) {
      setUnlockQuote(null);
      setUnlockQuoteError(null);
      setIsLoadingUnlockQuote(false);
      return;
    }

    let cancelled = false;
    setIsLoadingUnlockQuote(true);
    setUnlockQuoteError(null);
    setUnlockQuote(null);

    void (async () => {
      try {
        const { data, error } = await supabase.rpc('quote_media_unlock', {
          p_media_id: anime.id,
          p_episode: isMovie ? null : selectedEpisode,
        });
        if (cancelled) return;
        if (error || !data || !Number.isFinite(Number((data as any).cost_coins))) {
          setUnlockQuoteError(error?.message || 'Unlock price is unavailable.');
          setIsLoadingUnlockQuote(false);
          return;
        }
        setUnlockQuote({
          category: String((data as any).category),
          costCoins: Number((data as any).cost_coins),
        });
        setIsLoadingUnlockQuote(false);
      } catch (error) {
        if (cancelled) return;
        setUnlockQuoteError(error instanceof Error ? error.message : 'Unlock price is unavailable.');
        setIsLoadingUnlockQuote(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [anime, isMovie, isVIP, selectedEpisode]);

  // Playback sources are intentionally server-issued only. Raw episode/source
  // URLs are never trusted by the watch screen.
  const currentEpSources: VideoSource[] = [];
  const [activeSourceId, setActiveSourceId] = useState<string | undefined>(undefined);

  const handleSelectSource = (_srcItem: VideoSource) => {};

  useEffect(() => {
    if (!anime) return;

    // STRICT SECURITY LOCK: If content is NOT unlocked, never fetch or assign videoSource!
    if (!isUnlocked) {
      setVideoSource(null);
      setPlaybackError(null);
      setIsAuthorizingPlayback(false);
      return;
    }

    let cancelled = false;
    setIsAuthorizingPlayback(true);
    setPlaybackError(null);

    void getPlaybackUrl(anime.id, isMovie ? undefined : selectedEpisode)
      .then(({ url }) => {
        if (!cancelled && isUnlocked) {
          setActiveSourceId(undefined);
          setVideoSource(url);
          setPlaybackError(null);
          setIsAuthorizingPlayback(false);
        }
      })
      .catch((error) => {
        if (!cancelled && isUnlocked) {
          setActiveSourceId(undefined);
          setVideoSource(null);
          setPlaybackError(error instanceof Error ? error.message : 'Unable to authorize playback.');
          setIsAuthorizingPlayback(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [anime, isMovie, selectedEpisode, isUnlocked, playbackRetryKey]);

  const [isUnlocking, setIsUnlocking] = useState(false);

  // PAYWALL LOCK & VIDEO SOURCE LOADER
  useEffect(() => {
    const activePlayer = playerRef.current || player;
    if (!activePlayer) return;

    if (!isUnlocked || !videoSource) {
      try {
        activePlayer.pause();
        activePlayer.muted = true;
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
          document.querySelectorAll('video').forEach((v) => {
            v.pause();
            v.muted = true;
          });
        }
      } catch (_e) {}
      setIsPlaying(false);
      return;
    }

    // Content is unlocked & videoSource is ready — load source and play
    try {
      const srcObj = videoSource;
      if (typeof (activePlayer as any).replaceAsync === 'function') {
        void (activePlayer as any).replaceAsync(srcObj)
          .then(() => {
            try {
              activePlayer.muted = false;
              activePlayer.play();
              setIsPlaying(true);
            } catch (_err) {}
          })
          .catch(() => {
            try {
              activePlayer.muted = false;
              activePlayer.play();
              setIsPlaying(true);
            } catch (_err) {}
          });
      } else if (typeof (activePlayer as any).replace === 'function') {
        (activePlayer as any).replace(srcObj);
        activePlayer.muted = false;
        activePlayer.play();
        setIsPlaying(true);
      } else {
        activePlayer.muted = false;
        activePlayer.play();
        setIsPlaying(true);
      }
    } catch (_e) {
      try {
        activePlayer.muted = false;
        activePlayer.play();
        setIsPlaying(true);
      } catch (_err) {}
    }
  }, [isUnlocked, videoSource, selectedEpisode, player]);

  const handleUnlockMedia = async () => {
    if (!anime || !unlockQuote) return;
    setIsUnlocking(true);
    const success = await unlockMedia(anime.id, isMovie ? undefined : selectedEpisode);
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
      try {
        activePlayer.muted = false;
        activePlayer.play();
      } catch (_e) {}
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

  // Sync latest handleVolumeChange into the ref (declared earlier to avoid ReferenceError in PanResponder)
  useEffect(() => {
    handleVolumeChangeRef.current = handleVolumeChange;
  }, [handleVolumeChange]);

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
  const stats = anime ? getStatsForMedia(anime.id) : { average: 0, count: 0, breakdown: {} };

  const nativeVideoPlayer = (
    <View style={styles.videoOverlayContainer}>
      <VideoView
        ref={videoViewRef}
        style={styles.videoElement}
        player={player}
        contentFit={contentFit}
        nativeControls={false}
      />

      {/* Backdrop Pressable to toggle controls when tapping empty video space */}
      <Pressable
        style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
        accessible={false}
        onPress={() => {
          setShowControls((prev) => !prev);
          setShowSpeedMenu(false);
        }}
      />

      {playbackError && (
        <View style={styles.videoErrorBox}>
          <Tv color={themeColors.error} size={32} />
          <Text style={[styles.videoErrorText, { color: themeColors.textSecondary }]}>{playbackError}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => {
              setPlaybackError(null);
              setVideoSource(null);
              setPlaybackRetryKey((value) => value + 1);
            }}
            accessibilityRole="button"
            accessibilityLabel="Retry playback"
          >
            <RefreshCw size={14} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Retry Stream</Text>
          </Pressable>
        </View>
      )}

      {/* Center Play / Loading button when controls are hidden and video is buffering/loading */}
      {!showControls && isLoadingVideo && !playbackError && (
        <View style={[styles.centerLoadingOverlay, { pointerEvents: 'none' }]}>
          <View style={styles.youtubePlayBtnBg}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        </View>
      )}

      {/* Ultra-HD Cinema Player Overlay */}
      {showControls && !playbackError && (
        <View
          style={[
            styles.youtubeOverlay,
            { pointerEvents: 'box-none' },
            isLayoutFullscreen && {
              paddingHorizontal: Math.max(insets.left, insets.right, 16),
              paddingBottom: Math.max(insets.bottom, 8),
              paddingTop: Math.max(insets.top, 8),
            }
          ]}
        >
          {/* Top Bar - Spacer */}
          <View style={[styles.youtubeTopBar, { pointerEvents: 'none' }]}>
            <View style={{ flex: 1 }} />
          </View>

          {/* Center Play/Pause & Skip Buttons */}
          <View style={[styles.youtubeCenterBar, { pointerEvents: 'auto' }]}>
            <Pressable
              style={styles.youtubeSkipBtn}
              onPress={handleSeekBackward10}
              accessibilityRole="button"
              accessibilityLabel="Rewind 10 seconds"
            >
              <View style={styles.skipBtnBox}>
                <RotateCcw color="#FFFFFF" size={26} />
                <Text style={styles.skipBtnText}>-10s</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.youtubePlayBtn}
              onPress={handlePlayPause}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}
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
              accessibilityRole="button"
              accessibilityLabel="Forward 10 seconds"
            >
              <View style={styles.skipBtnBox}>
                <RotateCw color="#FFFFFF" size={26} />
                <Text style={styles.skipBtnText}>+10s</Text>
              </View>
            </Pressable>
          </View>

          {/* Bottom Bar - Scrubber & Custom Actions */}
          <View style={[styles.youtubeBottomBar, { pointerEvents: 'auto' }]}>
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
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel="Playback position"
                accessibilityValue={{
                  min: 0,
                  max: Math.max(0, Math.round(duration)),
                  now: Math.max(0, Math.round(displayTime)),
                  text: `${formatTime(displayTime)} of ${formatTime(duration)}`,
                }}
                accessibilityActions={[
                  { name: 'decrement', label: 'Rewind 10 seconds' },
                  { name: 'increment', label: 'Forward 10 seconds' },
                ]}
                onAccessibilityAction={({ nativeEvent }) => {
                  if (nativeEvent.actionName === 'increment') handleSeekForward10();
                  if (nativeEvent.actionName === 'decrement') handleSeekBackward10();
                }}
                {...scrubberPanResponder.panHandlers}
              >
                <View
                  style={[
                    styles.scrubberFill,
                    {
                      width: `${scrubberPercent}%`,
                      pointerEvents: 'none',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.scrubberDot,
                    isDraggingScrubber && styles.scrubberDotActive,
                    {
                      left: `${scrubberPercent}%`,
                      pointerEvents: 'none',
                    },
                  ]}
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

                {!isMobile && (
                  <View
                    ref={volumeTrackRef}
                    style={styles.volumeBarTrack}
                    onLayout={(e) => {
                      const w = e.nativeEvent.layout.width;
                      if (w > 0) volumeTrackWidthRef.current = w;
                    }}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                    accessible
                    accessibilityRole="adjustable"
                    accessibilityLabel="Volume"
                    accessibilityValue={{ min: 0, max: 100, now: Math.round((isMuted ? 0 : volume) * 100), text: `${Math.round((isMuted ? 0 : volume) * 100)} percent` }}
                    accessibilityActions={[
                      { name: 'decrement', label: 'Decrease volume' },
                      { name: 'increment', label: 'Increase volume' },
                    ]}
                    onAccessibilityAction={({ nativeEvent }) => {
                      if (nativeEvent.actionName === 'increment') handleVolumeChange(Math.min(1, volume + 0.1));
                      if (nativeEvent.actionName === 'decrement') handleVolumeChange(Math.max(0, volume - 0.1));
                    }}
                    {...volumePanResponder.panHandlers}
                  >
                    <View
                      style={[
                        styles.volumeBarFill,
                        { width: `${isMuted ? 0 : volume * 100}%`, pointerEvents: 'none' }
                      ]}
                    />
                    <View
                      style={[
                        styles.volumeBarThumb,
                        isDraggingVolume && styles.volumeBarThumbActive,
                        { left: `${isMuted ? 0 : volume * 100}%`, pointerEvents: 'none' }
                      ]}
                    />
                  </View>
                )}
              </View>

              <View style={{ flex: 1 }} />

              {/* Next Episode Button */}
              {!isMovie && (
                <Pressable
                  style={styles.nextEpPillBtn}
                  onPress={handleNextEpisode}
                  accessibilityRole="button"
                  accessibilityLabel="Play next episode"
                >
                  <Text style={styles.nextEpPillText}>Next Ep</Text>
                  <SkipForward size={13} color="#FFFFFF" />
                </Pressable>
              )}

              {/* Settings Gear Button */}
              <Pressable
                style={styles.youtubeIconBtn}
                onPress={() => setShowSettingsModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Open player settings"
              >
                <Settings color="#FFFFFF" size={20} />
              </Pressable>

              {/* Fullscreen Toggle */}
              <Pressable
                style={styles.youtubeIconBtn}
                onPress={handleFullscreen}
                accessibilityRole="button"
                accessibilityLabel={isLayoutFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isLayoutFullscreen ? <Minimize2 color="#FFFFFF" size={20} /> : <Maximize2 color="#FFFFFF" size={20} />}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );

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
            {isRTL ? <ArrowRight color={themeColors.text} size={20} /> : <ArrowLeft color={themeColors.text} size={20} />}
          </Pressable>

          <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
            {anime?.title ?? 'AniFlix Cinema'}
          </Text>

          {/* Protected stream — no share/copy allowed */}
          <View style={styles.headerBtn} />
        </View>
      )}



      {/* 📜 MAIN WATCH SCREEN SCROLLVIEW (Hidden during Fullscreen) */}
      {!isLayoutFullscreen ? (
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 🎬 PERSISTENT VIDEO PLAYER CONTAINER */}
          <View style={styles.playerWrapper}>
        <View style={[
          styles.videoBox,
          { height: !isLayoutFullscreen && isUnlocked ? defaultVideoHeight : undefined },
          isLayoutFullscreen ? styles.videoBoxFullscreen : (!isUnlocked && styles.videoBoxLocked),
          (!isLayoutFullscreen && (isDesktop || isTablet)) && styles.videoBoxDesktop,
        ]}>
          {!isUnlocked ? (
            // ═══════════════════════════════════════════════
            // PREMIUM LOCK PAYWALL OVERLAY
            // ═══════════════════════════════════════════════
            <View style={styles.paywallOverlay}>
              {!anime ? (
                <View style={styles.paywallContent}>
                  <ActivityIndicator size="large" color={themeColors.primary} />
                  <Text style={{ color: themeColors.textSecondary, marginTop: 12, fontSize: 13, fontWeight: '600' }}>
                    {t('loadingMedia', 'Loading media details...')}
                  </Text>
                </View>
              ) : (
                <>
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
                        ? anime.title
                        : `Episode ${selectedEpisode} — ${anime.title}`}
                    </Text>

                    {(unlockQuote?.category || anime.category) && (
                      <View style={styles.paywallCategoryPill}>
                        <Text style={styles.paywallCategoryText}>
                          {unlockQuote?.category || anime.category}
                        </Text>
                      </View>
                    )}

                    <View style={styles.paywallCostRow}>
                      <Text style={styles.paywallCostLabel}>Unlock Cost</Text>
                      <View style={styles.paywallCostBadge}>
                        <Text style={styles.paywallCostAmount}>
                          {isLoadingUnlockQuote ? 'Checking…' : unlockQuote ? `${unlockQuote.costCoins} Coins` : 'Unavailable'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.paywallBalance}>
                      Your balance: <Text style={{ color: unlockQuote && coins >= unlockQuote.costCoins ? '#00E676' : themeColors.textSecondary }}>{coins} Coins</Text>
                    </Text>

                    {unlockQuoteError ? (
                      <Text style={[styles.videoErrorText, { color: themeColors.error, textAlign: 'center' }]}>Unlock pricing is unavailable. Please try again.</Text>
                    ) : unlockQuote && coins >= unlockQuote.costCoins ? (
                      <Pressable
                        style={styles.unlockBtn}
                        onPress={handleUnlockMedia}
                        disabled={isUnlocking}
                        accessibilityRole="button"
                        accessibilityLabel={`Unlock for ${unlockQuote.costCoins} coins`}
                        accessibilityState={{ disabled: isUnlocking }}
                      >
                        <Text style={styles.unlockBtnText}>
                          {isUnlocking ? 'Unlocking...' : `Unlock for ${unlockQuote.costCoins} Coins`}
                        </Text>
                      </Pressable>
                    ) : unlockQuote ? (
                      <>
                        <Pressable
                          style={[styles.unlockBtn, styles.unlockBtnDisabled]}
                          disabled={true}
                          accessibilityRole="button"
                          accessibilityState={{ disabled: true }}
                        >
                          <Text style={styles.unlockBtnTextDisabled}>
                            Need {Math.max(0, unlockQuote.costCoins - coins)} more coins
                          </Text>
                        </Pressable>

                        {Platform.OS !== 'web' ? (
                          <Pressable
                            style={styles.earnMoreBtn}
                            onPress={() => showRewardedAd({
                              rewardCoins: 12,
                              rewardType: 'coins',
                            })}
                            accessibilityRole="button"
                            accessibilityLabel="Watch a verified ad to earn 12 coins"
                          >
                            <Text style={styles.earnMoreBtnText}>Watch Verified Ad · +12 Coins</Text>
                          </Pressable>
                        ) : (
                          <Text style={[styles.videoErrorText, { color: themeColors.textSecondary, textAlign: 'center' }]}>
                            Rewarded coins are available in the Android and iOS apps.
                          </Text>
                        )}
                      </>
                    ) : null}

                    {/* VIP upsell strip */}
                    <Pressable
                      style={styles.vipUpsellStrip}
                      onPress={() => setShowVipModal(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Open VIP membership options"
                    >
                      <Text style={styles.vipUpsellText}>
                        VIP members watch everything free — Ad-Free
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          ) : isAuthorizingPlayback ? (
            <View style={styles.videoErrorBox} accessible accessibilityLabel="Authorizing secure playback">
              <ActivityIndicator size="large" color={themeColors.primary} />
              <Text style={[styles.videoErrorText, { color: themeColors.textSecondary }]}>Authorizing secure playback…</Text>
            </View>
          ) : playbackError ? (
            <View style={styles.videoErrorBox}>
              <Tv color={themeColors.error} size={32} />
              <Text style={[styles.videoErrorText, { color: themeColors.textSecondary }]}>{playbackError}</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => {
                  setPlaybackError(null);
                  setVideoSource(null);
                  setPlaybackRetryKey((value) => value + 1);
                }}
                accessibilityRole="button"
                accessibilityLabel="Retry playback"
              >
                <RefreshCw size={14} color="#FFFFFF" />
                <Text style={styles.retryBtnText}>Retry Stream</Text>
              </Pressable>
            </View>
          ) : !videoSource ? (
            <View style={styles.videoErrorBox}>
              <ActivityIndicator size="large" color={themeColors.primary} />
              <Text style={[styles.videoErrorText, { color: themeColors.textSecondary }]}>Preparing stream…</Text>
            </View>
          ) : Platform.OS === 'web' ? (
            <VideoJsPlayer
              src={typeof videoSource === 'string' ? videoSource : videoSource?.uri}
              poster={anime?.image_url ?? undefined}
              title={anime?.title ?? undefined}
              onFullscreenChange={(fs) => setIsLayoutFullscreen(fs)}
            />
          ) : (
            nativeVideoPlayer
          )}
        </View>
          </View>
          <View style={[styles.contentWrapper, { maxWidth: maxContentWidth }]}>
            {/* 🌟 NETFLIX-STYLE MEDIA POSTER HEADER CARD (Theme Colors Preserved) */}
            {anime && (
              <View style={[
                styles.mediaRichCard,
                { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border, marginHorizontal: pagePad }
              ]}>
                <View style={styles.mediaHeaderFlex}>
                  {/* Poster Artwork Image */}
                  {anime.image_url ? (
                    <Image source={{ uri: anime.image_url }} style={styles.posterThumbnail} resizeMode="cover" />
                  ) : (
                    <View style={[styles.posterThumbnail, styles.artworkPlaceholder, { backgroundColor: themeColors.backgroundElement }]}>
                      <Tv color={themeColors.textMuted} size={24} />
                    </View>
                  )}

                  {/* Title & Metadata */}
                  <View style={styles.mediaHeaderInfo}>
                    <View style={styles.badgeRow}>
                      {anime.category ? (
                        <View style={[styles.catBadge, { backgroundColor: themeColors.primary }]}>
                          <Text style={styles.catBadgeText}>{anime.category.toUpperCase()}</Text>
                        </View>
                      ) : null}
                      {anime.qualities && anime.qualities.length > 0 && (
                        <View style={[styles.hdBadge, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border, borderWidth: 1 }]}>
                          <Text style={[styles.hdBadgeText, { color: themeColors.text }]}>{anime.qualities[0].toUpperCase()}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.mediaTitleText, { color: themeColors.text }]} numberOfLines={2}>
                      {language === 'ku' && anime.title_ku ? anime.title_ku : anime.title}
                    </Text>

                    {anime.genre ? (
                      <Text style={[styles.genreSubText, { color: themeColors.accentCyan || themeColors.primary }]}>{anime.genre}</Text>
                    ) : null}

                    <View style={styles.statsRow}>
                      {stats.count > 0 && (
                        <>
                          <View style={styles.ratingBox}>
                            <Star color="#FFB800" size={13} fill="#FFB800" />
                            <Text style={styles.ratingVal}>{stats.average.toFixed(1)}</Text>
                          </View>
                          <Text style={[styles.dotSeparator, { color: themeColors.textMuted }]}>·</Text>
                        </>
                      )}
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
                      favorited && { borderColor: themeColors.primary, backgroundColor: 'rgba(77, 124, 254, 0.15)' }
                    ]}
                    onPress={() => toggleFavorite(anime)}
                    accessibilityRole="button"
                    accessibilityLabel={favorited ? `Remove ${anime.title} from My List` : `Add ${anime.title} to My List`}
                    accessibilityState={{ selected: favorited }}
                  >
                    <Heart
                      color={favorited ? themeColors.primary : themeColors.text}
                      fill={favorited ? themeColors.primary : 'none'}
                      size={18}
                    />
                    <Text style={[styles.myListBtnText, { color: favorited ? themeColors.primary : themeColors.text }]}>
                      {favorited ? t('inMyList', 'In My List') : t('addToMyList', '+ My List')}
                    </Text>
                  </Pressable>
                </View>

                {/* Synopsis Box */}
                <Pressable
                  style={[styles.synopsisWrapper, { backgroundColor: themeColors.backgroundElement }]}
                  onPress={() => setIsExpandedSynopsis(!isExpandedSynopsis)}
                  accessibilityRole="button"
                  accessibilityLabel={isExpandedSynopsis ? 'Collapse synopsis' : 'Expand synopsis'}
                  accessibilityState={{ expanded: isExpandedSynopsis }}
                >
                  <Text style={[styles.synopsisText, { color: themeColors.textSecondary }]} numberOfLines={isExpandedSynopsis ? undefined : 3}>
                    {language === 'ku' && anime.description_ku ? anime.description_ku : (anime.description || 'No description available.')}
                  </Text>
                  <Text style={[styles.readMoreBtn, { color: themeColors.primary }]}>
                    {isExpandedSynopsis ? t('showLess', 'Show less') : t('readMore', 'Read more...')}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* 📡 Dynamic Multi-Source Server Selector Component */}
            <View style={{ paddingHorizontal: pagePad }}>
              <SourceSelector
                sources={currentEpSources}
                activeSourceId={activeSourceId}
                onSelectSource={handleSelectSource}
              />
            </View>

            {/* 🍿 Enhanced Interactive Episode & Season Selector Component */}
            <View style={{ paddingHorizontal: pagePad }}>
              <EpisodeSelector
                totalEpisodes={anime?.episodes || 1}
                selectedEpisode={selectedEpisode}
                onSelectEpisode={(ep) => setSelectedEpisode(ep)}
                category={anime?.category}
              />
            </View>

            {/* 🌟 RECOMMENDATIONS RAIL (Theme-aware Poster Cards) */}
            {recommendations.length > 0 && (
              <View style={[styles.sectionContainer, { paddingHorizontal: pagePad }]}>
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Layers color={themeColors.primary} size={18} />
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t('youMightAlsoLike', 'You Might Also Like')}</Text>
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recRail}>
                  {recommendations.map((item) => (
                    <Pressable
                      key={item.id}
                      style={[styles.recPosterCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border, width: railCardWidth }]}
                      onPress={() => {
                        releaseWebFocus();
                        router.replace({ pathname: '/watch', params: { id: item.id } });
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${item.title}`}
                    >
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={[styles.recPosterImg, { width: railCardWidth, height: railCardHeight }]} resizeMode="cover" />
                      ) : (
                        <View style={[styles.recPosterImg, styles.artworkPlaceholder, { width: railCardWidth, height: railCardHeight, backgroundColor: themeColors.backgroundElement }]}>
                          <Tv color={themeColors.textMuted} size={26} />
                        </View>
                      )}
                      <View style={styles.recMetaContainer}>
                        <Text style={[styles.recTitleText, { color: themeColors.text }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        {(item.genre || item.category) && (
                          <Text style={[styles.recGenreText, { color: themeColors.textSecondary }]} numberOfLines={1}>
                            {item.genre ?? item.category}
                          </Text>
                        )}
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
      ) : (
        /* 🎬 FULLSCREEN PLAYER CONTAINER */
        <View style={styles.playerWrapperFullscreen}>
          <View style={styles.videoBoxFullscreen}>
            {Platform.OS === 'web' ? (
              isAuthorizingPlayback || !videoSource ? (
                <View style={styles.videoErrorBox}>
                  <ActivityIndicator size="large" color={themeColors.primary} />
                  <Text style={[styles.videoErrorText, { color: themeColors.textSecondary }]}>Preparing stream…</Text>
                </View>
              ) : playbackError ? (
                <View style={styles.videoErrorBox}>
                  <Tv color={themeColors.error} size={32} />
                  <Text style={[styles.videoErrorText, { color: themeColors.textSecondary }]}>{playbackError}</Text>
                </View>
              ) : (
                <VideoJsPlayer
                  src={typeof videoSource === 'string' ? videoSource : videoSource?.uri}
                  poster={anime?.image_url ?? undefined}
                  title={anime?.title ?? undefined}
                  onFullscreenChange={(fs) => setIsLayoutFullscreen(fs)}
                />
              )
            ) : (
              nativeVideoPlayer
            )}
          </View>
        </View>
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
        availableQualities={anime?.qualities ?? []}
        availableAudioTracks={anime?.audio_tracks}
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
    overflow: 'hidden',
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
    overflow: 'hidden',
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
    backgroundColor: 'rgba(77, 124, 254, 0.32)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4D7CFE',
  },
  playerPillBadgePrimaryText: {
    color: '#4D7CFE',
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
    backgroundColor: '#4D7CFE',
    borderRadius: 2,
  },
  scrubberDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4D7CFE',
    marginTop: -5,
    marginLeft: -7,
    boxShadow: '0px 0px 4px rgba(77, 124, 254, 0.65)',
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
    backgroundColor: 'rgba(77, 124, 254, 0.28)',
    borderWidth: 1,
    borderColor: '#4D7CFE',
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
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
    boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.8)',
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
    backgroundColor: 'rgba(77, 124, 254, 0.15)',
  },
  speedOptionText: {
    color: '#B0B5C6',
    fontSize: 11,
    fontWeight: '600',
  },
  speedOptionTextActive: {
    color: '#4D7CFE',
    fontWeight: '700',
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
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
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4D7CFE',
    paddingHorizontal: 14,
    minHeight: 44,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    backgroundColor: 'rgba(77, 124, 254, 0.16)',
    borderWidth: 1, borderColor: '#4D7CFE',
    paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 12, width: '100%', alignItems: 'center',
  },
  earnMoreBtnText: {
    color: '#4D7CFE', fontSize: 14, fontWeight: '700',
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
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderWidth: 1, borderColor: 'rgba(255, 184, 0, 0.45)',
    borderRadius: 10, paddingHorizontal: 14, minHeight: 44,
    width: '100%',
    justifyContent: 'center',
  },
  vipUpsellText: {
    color: '#FFB800', fontSize: 11, fontWeight: '700',
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
    backgroundColor: 'rgba(77, 124, 254, 0.15)',
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
  artworkPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 44,
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
    backgroundColor: '#4D7CFE',
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
    backgroundColor: '#4D7CFE',
  },

});
