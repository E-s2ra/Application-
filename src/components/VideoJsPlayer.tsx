import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Settings,
  Maximize2,
  Minimize2,
  PictureInPicture2,
  Tv,
  Check,
  ChevronLeft,
  ChevronRight,
  Captions,
  Sparkles,
  Gauge,
  Monitor,
} from 'lucide-react-native';

export type VideoJsQuality = 'Auto' | '1080p' | '720p' | '480p' | '360p';
export type VideoJsSpeed = 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 2.0;
export type VideoJsSubtitle = 'Off' | 'English' ;
export type SettingsSubMenu = 'main' | 'quality' | 'speed' | 'subtitles';

export interface VideoJsPlayerProps {
  // Video Source
  src?: string;
  poster?: string;
  title?: string;
  subtitleTrackUrl?: string;
  isVIP?: boolean;
  onOpenVipModal?: () => void;

  // Initial State Overrides for Design State Testing
  forcedState?: {
    showControls?: boolean;
    isPlaying?: boolean;
    isMuted?: boolean;
    isFullscreen?: boolean;
    isTheaterMode?: boolean;
    isPip?: boolean;
    isSettingsOpen?: boolean;
    settingsSubMenu?: SettingsSubMenu;
    selectedQuality?: VideoJsQuality;
    selectedSpeed?: VideoJsSpeed;
    selectedSubtitle?: VideoJsSubtitle;
    currentTime?: number;
    duration?: number;
    bufferedProgress?: number;
    volume?: number;
    isMobileView?: 'none' | 'portrait' | 'landscape';
  };

  // Callbacks
  onPlayStateChange?: (playing: boolean) => void;
  onFullscreenChange?: (fullscreen: boolean) => void;
  onTheaterChange?: (theater: boolean) => void;
}

const SAMPLE_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
const SAMPLE_POSTER =
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80';

export function VideoJsPlayer({
  src = SAMPLE_VIDEO,
  poster = SAMPLE_POSTER,
  title = 'Tears of Steel — AniFlix Cinema 4K',
  isVIP = false,
  onOpenVipModal,
  forcedState,
  onPlayStateChange,
  onFullscreenChange,
  onTheaterChange,
}: VideoJsPlayerProps) {
  // Container & Player References
  const containerRef = useRef<View | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const vjsPlayerRef = useRef<any>(null);
  // isDraggingRef: true while user holds mouse/touch on the scrubber
  const isDraggingRef = useRef<boolean>(false);
  // blockTimeupdateRef: when true, timeupdate MUST NOT overwrite currentTime state.
  // Set on seek start; cleared only after `seeked` fires AND drag is done.
  const blockTimeupdateRef = useRef<boolean>(false);
  const scrubberElRef = useRef<HTMLElement | null>(null);
  const lastForcedStateRef = useRef<any>(null);

  // Player Core States
  const [isPlaying, setIsPlaying] = useState(forcedState?.isPlaying ?? false);
  const [isMuted, setIsMuted] = useState(forcedState?.isMuted ?? false);
  const [volume, setVolume] = useState(forcedState?.volume ?? 0.8);
  const [currentTime, setCurrentTime] = useState(forcedState?.currentTime ?? 0);
  const [duration, setDuration] = useState(forcedState?.duration ?? 0);
  const [bufferedProgress, setBufferedProgress] = useState(forcedState?.bufferedProgress ?? 0);
  const [isBuffering, setIsBuffering] = useState(false);
  // dragPreviewTime: visual-only scrubber preview during drag. null = not dragging.
  const [dragPreviewTime, setDragPreviewTime] = useState<number | null>(null);

  // Display Modes
  const [isFullscreen, setIsFullscreen] = useState(forcedState?.isFullscreen ?? false);
  const [isTheaterMode, setIsTheaterMode] = useState(forcedState?.isTheaterMode ?? false);
  const [isPip, setIsPip] = useState(forcedState?.isPip ?? false);

  // Controls UI Visibility & Auto-Hide
  const [showControls, setShowControls] = useState(forcedState?.showControls ?? true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Settings Floating Menu States
  const [isSettingsOpen, setIsSettingsOpen] = useState(forcedState?.isSettingsOpen ?? false);
  const [settingsSubMenu, setSettingsSubMenu] = useState<SettingsSubMenu>(
    forcedState?.settingsSubMenu ?? 'main'
  );
  const [selectedQuality, setSelectedQuality] = useState<VideoJsQuality>(
    forcedState?.selectedQuality ?? '1080p'
  );
  const [selectedSpeed, setSelectedSpeed] = useState<VideoJsSpeed>(
    forcedState?.selectedSpeed ?? 1.0
  );
  const [selectedSubtitle, setSelectedSubtitle] = useState<VideoJsSubtitle>(
    forcedState?.selectedSubtitle ?? 'English'
  );

  // Timeline Scrubber & Tooltip States
  const [scrubberWidth, setScrubberWidth] = useState(500);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number>(0);


  // Apply forced state updates safely without overwriting active user seeking
  useEffect(() => {
    if (forcedState) {
      const prev = lastForcedStateRef.current;
      if (!prev || prev.showControls !== forcedState.showControls) {
        if (forcedState.showControls !== undefined) setShowControls(forcedState.showControls);
      }
      if (!prev || prev.isPlaying !== forcedState.isPlaying) {
        if (forcedState.isPlaying !== undefined) setIsPlaying(forcedState.isPlaying);
      }
      if (!prev || prev.isMuted !== forcedState.isMuted) {
        if (forcedState.isMuted !== undefined) setIsMuted(forcedState.isMuted);
      }
      if (!prev || prev.isFullscreen !== forcedState.isFullscreen) {
        if (forcedState.isFullscreen !== undefined) setIsFullscreen(forcedState.isFullscreen);
      }
      if (!prev || prev.isTheaterMode !== forcedState.isTheaterMode) {
        if (forcedState.isTheaterMode !== undefined) setIsTheaterMode(forcedState.isTheaterMode);
      }
      if (!prev || prev.isPip !== forcedState.isPip) {
        if (forcedState.isPip !== undefined) setIsPip(forcedState.isPip);
      }
      if (!prev || prev.isSettingsOpen !== forcedState.isSettingsOpen) {
        if (forcedState.isSettingsOpen !== undefined) setIsSettingsOpen(forcedState.isSettingsOpen);
      }
      if (!prev || prev.settingsSubMenu !== forcedState.settingsSubMenu) {
        if (forcedState.settingsSubMenu !== undefined) setSettingsSubMenu(forcedState.settingsSubMenu);
      }
      if (!prev || prev.selectedQuality !== forcedState.selectedQuality) {
        if (forcedState.selectedQuality !== undefined) setSelectedQuality(forcedState.selectedQuality);
      }
      if (!prev || prev.selectedSpeed !== forcedState.selectedSpeed) {
        if (forcedState.selectedSpeed !== undefined) setSelectedSpeed(forcedState.selectedSpeed);
      }
      if (!prev || prev.selectedSubtitle !== forcedState.selectedSubtitle) {
        if (forcedState.selectedSubtitle !== undefined) setSelectedSubtitle(forcedState.selectedSubtitle);
      }
      if (!prev || prev.currentTime !== forcedState.currentTime) {
        if (forcedState.currentTime !== undefined && !isDraggingRef.current && !blockTimeupdateRef.current) {
          setCurrentTime(forcedState.currentTime);
          if (vjsPlayerRef.current) {
            try {
              vjsPlayerRef.current.currentTime(forcedState.currentTime);
            } catch (_e) {}
          }
        }
      }
      if (!prev || prev.duration !== forcedState.duration) {
        if (forcedState.duration !== undefined) setDuration(forcedState.duration);
      }
      if (!prev || prev.bufferedProgress !== forcedState.bufferedProgress) {
        if (forcedState.bufferedProgress !== undefined) setBufferedProgress(forcedState.bufferedProgress);
      }
      if (!prev || prev.volume !== forcedState.volume) {
        if (forcedState.volume !== undefined) setVolume(forcedState.volume);
      }
      lastForcedStateRef.current = forcedState;
    }
  }, [forcedState]);

  // Video.js DOM Engine Initialization (Web Environment)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let vjsPlayer: any = null;

    const initVideoJs = async () => {
      try {
        const videojsModule = await import('video.js');
        const videojs = videojsModule.default || videojsModule;

        if (videoRef.current) {
          vjsPlayer = videojs(videoRef.current, {
            autoplay: false,
            controls: false, // We use our custom Video.js skin UI
            preload: 'auto',
            sources: [{ src, type: 'video/mp4' }],
            poster,
          });

          vjsPlayerRef.current = vjsPlayer;

          // timeupdate: skip update if we are dragging or mid-seek
          vjsPlayer.on('timeupdate', () => {
            if (vjsPlayer && !blockTimeupdateRef.current && !isDraggingRef.current) {
              setCurrentTime(vjsPlayer.currentTime() || 0);
              if (vjsPlayer.buffered() && vjsPlayer.buffered().length > 0) {
                const dur = vjsPlayer.duration() || 1;
                setBufferedProgress(vjsPlayer.buffered().end(0) / dur);
              }
            }
          });

          vjsPlayer.on('seeking', () => {
            blockTimeupdateRef.current = true;
            setIsBuffering(true);
          });

          // seeked: sync UI from player (source of truth), then unblock
          vjsPlayer.on('seeked', () => {
            if (vjsPlayer) setCurrentTime(vjsPlayer.currentTime() || 0);
            setIsBuffering(false);
            // Only unblock if drag is not still in progress
            if (!isDraggingRef.current) {
              blockTimeupdateRef.current = false;
            }
          });

          vjsPlayer.on('waiting', () => setIsBuffering(true));
          vjsPlayer.on('canplay', () => setIsBuffering(false));
          vjsPlayer.on('playing', () => setIsBuffering(false));

          vjsPlayer.on('durationchange', () => {
            if (vjsPlayer) setDuration(vjsPlayer.duration() || 734);
          });

          vjsPlayer.on('play', () => {
            setIsPlaying(true);
            onPlayStateChange?.(true);
          });

          vjsPlayer.on('pause', () => {
            setIsPlaying(false);
            onPlayStateChange?.(false);
          });

          vjsPlayer.on('volumechange', () => {
            if (vjsPlayer) {
              setIsMuted(vjsPlayer.muted());
              setVolume(vjsPlayer.volume());
            }
          });
        }
      } catch (err) {
        // Fallback for non-videojs bundling
      }
    };

    void initVideoJs();

    return () => {
      if (vjsPlayer) {
        try {
          vjsPlayer.dispose();
        } catch (_e) {}
      }
    };
  }, [src, poster, onPlayStateChange]);

  // Auto-hide controls after 3 seconds of inactivity (when playing and settings closed)
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    if (isPlaying && !isSettingsOpen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, isSettingsOpen]);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimer]);

  // Keyboard Interaction Handler (Space, F, M, P, Left/Right, Up/Down)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent keyboard triggers if user is typing in an input
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
        case 'KeyJ':
          e.preventDefault();
          handleSeekRelative(-10);
          break;
        case 'ArrowRight':
        case 'KeyL':
          e.preventDefault();
          handleSeekRelative(10);
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyP':
          e.preventDefault();
          togglePip();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume((prev) => Math.min(1, prev + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume((prev) => Math.max(0, prev - 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, isFullscreen, isPip, duration, currentTime]);

  // ─── Core Player Controls (all go through vjsPlayerRef) ───────────────────
  const togglePlayPause = () => {
    const vjs = vjsPlayerRef.current;
    if (vjs) {
      if (vjs.paused()) { vjs.play(); setIsPlaying(true); }
      else { vjs.pause(); setIsPlaying(false); }
    }
    onPlayStateChange?.(!isPlaying);
    resetControlsTimer();
  };

  const toggleMute = () => {
    const vjs = vjsPlayerRef.current;
    if (vjs) {
      const next = !vjs.muted();
      vjs.muted(next);
      setIsMuted(next);
    }
    resetControlsTimer();
  };

  const handleVolumeChange = (newVol: number) => {
    const vjs = vjsPlayerRef.current;
    const clamped = Math.max(0, Math.min(1, newVol));
    if (vjs) { vjs.volume(clamped); vjs.muted(clamped === 0); }
    setVolume(clamped);
    setIsMuted(clamped === 0);
  };

  const handleSeekRelative = (seconds: number) => {
    const vjs = vjsPlayerRef.current;
    const current = vjs ? (vjs.currentTime() ?? 0) : currentTime;
    handleSeekToTime((current || 0) + seconds);
  };

  // ─── THE ONE TRUE SEEK FUNCTION ────────────────────────────────────────────
  // All seeks funnel through here. No other place calls player.currentTime() for seeking.
  const handleSeekToTime = useCallback((targetTime: number) => {
    const vjs = vjsPlayerRef.current;
    const dur = vjs ? (vjs.duration() ?? 0) : duration;
    if (!Number.isFinite(dur) || dur <= 0) return;

    const clamped = Math.max(0, Math.min(targetTime, dur));
    blockTimeupdateRef.current = true;

    if (vjs) {
      try {
        vjs.currentTime(clamped);
        setCurrentTime(vjs.currentTime() ?? clamped);
      } catch (_e) {
        setCurrentTime(clamped);
      }
    } else {
      setCurrentTime(clamped);
    }
    setDragPreviewTime(null);
    resetControlsTimer();
  }, [duration, resetControlsTimer]);

  // ─── SCRUBBER: Mouse drag ──────────────────────────────────────────────────
  // During move: only update dragPreviewTime (visual). NO seek call.
  // On mouseup: ONE seekToTime() call with the final position.
  // setPointerCapture ensures events fire even outside the track element.
  const handleScrubberMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault?.();
    const trackEl = scrubberElRef.current;
    if (!trackEl) return;

    isDraggingRef.current = true;
    blockTimeupdateRef.current = true;

    try { trackEl.setPointerCapture((e as any).pointerId ?? 1); } catch (_) {}

    const timeFromX = (clientX: number): number => {
      const rect = trackEl.getBoundingClientRect();
      const vjs = vjsPlayerRef.current;
      const dur = vjs ? (vjs.duration() ?? 0) : 0;
      if (dur <= 0 || rect.width <= 0) return 0;
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * dur;
    };

    setDragPreviewTime(timeFromX(e.clientX));

    const onMove = (me: MouseEvent) => setDragPreviewTime(timeFromX(me.clientX));

    const onUp = (ue: MouseEvent) => {
      const t = timeFromX(ue.clientX);
      isDraggingRef.current = false;
      setDragPreviewTime(null);
      handleSeekToTime(t);
      setTimeout(() => {
        if (!isDraggingRef.current) blockTimeupdateRef.current = false;
      }, 400);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [handleSeekToTime]);

  // ─── SCRUBBER: Click-to-seek ───────────────────────────────────────────────
  const handleScrubberClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (isDraggingRef.current) return;
    const trackEl = scrubberElRef.current;
    if (!trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    const vjs = vjsPlayerRef.current;
    const dur = vjs ? (vjs.duration() ?? 0) : duration;
    if (dur <= 0 || rect.width <= 0) return;
    handleSeekToTime(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * dur);
  }, [duration, handleSeekToTime]);

  // ─── SCRUBBER: Touch drag ──────────────────────────────────────────────────
  const handleScrubberTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
    isDraggingRef.current = true;
    blockTimeupdateRef.current = true;

    const timeFromTouch = (touch: Touch): number => {
      const trackEl = scrubberElRef.current;
      if (!trackEl) return 0;
      const rect = trackEl.getBoundingClientRect();
      const vjs = vjsPlayerRef.current;
      const dur = vjs ? (vjs.duration() ?? 0) : 0;
      if (dur <= 0 || rect.width <= 0) return 0;
      return Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width)) * dur;
    };

    if (e.touches.length > 0) setDragPreviewTime(timeFromTouch(e.touches[0]));

    const onMove = (te: TouchEvent) => {
      if (te.touches.length > 0) setDragPreviewTime(timeFromTouch(te.touches[0]));
    };
    const onEnd = (te: TouchEvent) => {
      const touch = te.changedTouches[0];
      isDraggingRef.current = false;
      setDragPreviewTime(null);
      if (touch) handleSeekToTime(timeFromTouch(touch));
      setTimeout(() => {
        if (!isDraggingRef.current) blockTimeupdateRef.current = false;
      }, 400);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  }, [handleSeekToTime]);

  const toggleFullscreen = async () => {
    const nextFs = !isFullscreen;
    setIsFullscreen(nextFs);
    onFullscreenChange?.(nextFs);
    resetControlsTimer();

    if (Platform.OS === 'web') {
      try {
        if (nextFs) {
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
      } catch (err) {
        console.log('VideoJsPlayer fullscreen error:', err);
      }
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleFs = () => {
        const isFs = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
        setIsFullscreen(isFs);
        onFullscreenChange?.(isFs);
      };
      document.addEventListener('fullscreenchange', handleFs);
      document.addEventListener('webkitfullscreenchange', handleFs);
      return () => {
        document.removeEventListener('fullscreenchange', handleFs);
        document.removeEventListener('webkitfullscreenchange', handleFs);
      };
    }
  }, [onFullscreenChange]);

  const toggleTheaterMode = () => {
    const nextTheater = !isTheaterMode;
    setIsTheaterMode(nextTheater);
    onTheaterChange?.(nextTheater);
    resetControlsTimer();
  };

  const togglePip = async () => {
    const nextPip = !isPip;
    setIsPip(nextPip);
    if (Platform.OS === 'web' && videoRef.current) {
      try {
        if (nextPip && document.pictureInPictureElement !== videoRef.current) {
          await videoRef.current.requestPictureInPicture();
        } else if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        }
      } catch (_e) {}
    }
    resetControlsTimer();
  };

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

  const isMobileLayout = forcedState?.isMobileView !== 'none';
  // During drag: show dragPreviewTime (visual-only). Otherwise: real player time.
  const displayTime = dragPreviewTime !== null ? dragPreviewTime : currentTime;
  const progressRatio = duration > 0 ? Math.max(0, Math.min(1, displayTime / duration)) : 0;

  return (
    <View
      ref={containerRef}
      style={[
        styles.playerOuterWrapper,
        isTheaterMode && styles.playerTheaterMode,
        isFullscreen && styles.playerFullscreen,
        forcedState?.isMobileView === 'portrait' && styles.mobilePortraitMode,
        forcedState?.isMobileView === 'landscape' && styles.mobileLandscapeMode,
      ]}
      // @ts-ignore - Mouse events on Web
      onMouseMove={resetControlsTimer}
    >
      {/* 🎬 Video Canvas & Video.js Mount Target */}
      <View style={styles.videoCanvasBox}>
        {Platform.OS === 'web' ? (
          // @ts-ignore - HTML video tag for Video.js integration
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: selectedQuality === '1080p' ? 'cover' : 'contain',
              backgroundColor: '#000000',
            }}
            src={src}
            poster={poster}
            playsInline
          />
        ) : (
          <Image
            source={{ uri: poster }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        )}

        {/* Backdrop Tap Target to Toggle Controls */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setShowControls((prev) => !prev)}
        />

        {/* ═══════════════════════════════════════════════
            CENTER CONTROLS OVERLAY (-10s | Play/Pause | +10s)
           ═══════════════════════════════════════════════ */}
        {showControls && (
          <View style={styles.centerControlsOverlay} pointerEvents="box-none">
            {/* -10s Rewind Button */}
            <Pressable
              style={({ pressed }) => [
                styles.centerSkipBtn,
                pressed && styles.centerBtnPressed,
              ]}
              onPress={() => handleSeekRelative(-10)}
              accessibilityRole="button"
              accessibilityLabel="Rewind 10 seconds"
            >
              <View style={styles.centerSkipIconCircle}>
                <RotateCcw size={22} color="#FFFFFF" />
                <Text style={styles.centerSkipText}>10s</Text>
              </View>
            </Pressable>

            {/* Main Center Play / Pause Glass Button */}
            <Pressable
              style={({ pressed }) => [
                styles.centerPlayBtn,
                pressed && styles.centerBtnPressed,
              ]}
              onPress={togglePlayPause}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause Video' : 'Play Video'}
            >
              <View style={styles.centerPlayBtnGlow}>
                {isPlaying ? (
                  <Pause size={38} color="#FFFFFF" fill="#FFFFFF" />
                ) : (
                  <Play size={38} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 5 }} />
                )}
              </View>
            </Pressable>

            {/* +10s Forward Button */}
            <Pressable
              style={({ pressed }) => [
                styles.centerSkipBtn,
                pressed && styles.centerBtnPressed,
              ]}
              onPress={() => handleSeekRelative(10)}
              accessibilityRole="button"
              accessibilityLabel="Forward 10 seconds"
            >
              <View style={styles.centerSkipIconCircle}>
                <RotateCw size={22} color="#FFFFFF" />
                <Text style={styles.centerSkipText}>10s</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* ═══════════════════════════════════════════════
            FLOATING SETTINGS MENU & SUBMENUS
           ═══════════════════════════════════════════════ */}
        {showControls && isSettingsOpen && (
          <View style={styles.settingsMenuCard} pointerEvents="auto">
            {/* Submenu Header (when in submenu) */}
            {settingsSubMenu !== 'main' ? (
              <View style={styles.settingsMenuHeader}>
                <Pressable
                  style={styles.settingsBackBtn}
                  onPress={() => setSettingsSubMenu('main')}
                >
                  <ChevronLeft size={16} color="#FFFFFF" />
                  <Text style={styles.settingsMenuHeaderTitle}>
                    {settingsSubMenu === 'quality'
                      ? 'Quality'
                      : settingsSubMenu === 'speed'
                      ? 'Playback Speed'
                      : 'Subtitles & Audio'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.settingsMenuHeader}>
                <Sparkles size={14} color="#00D2FF" />
                <Text style={styles.settingsMenuHeaderTitle}>Playback Settings</Text>
              </View>
            )}

            {/* MAIN SETTINGS MENU */}
            {settingsSubMenu === 'main' && (
              <View style={styles.settingsOptionsList}>
                <Pressable
                  style={styles.settingsOptionRow}
                  onPress={() => setSettingsSubMenu('quality')}
                >
                  <View style={styles.settingsOptionLeft}>
                    <Monitor size={15} color="#A0A0B8" />
                    <Text style={styles.settingsOptionLabel}>Quality</Text>
                  </View>
                  <View style={styles.settingsOptionRight}>
                    <Text style={styles.settingsOptionValue}>{selectedQuality}</Text>
                    <ChevronRight size={14} color="#70708A" />
                  </View>
                </Pressable>

                <Pressable
                  style={styles.settingsOptionRow}
                  onPress={() => setSettingsSubMenu('speed')}
                >
                  <View style={styles.settingsOptionLeft}>
                    <Gauge size={15} color="#A0A0B8" />
                    <Text style={styles.settingsOptionLabel}>Speed</Text>
                  </View>
                  <View style={styles.settingsOptionRight}>
                    <Text style={styles.settingsOptionValue}>
                      {selectedSpeed === 1.0 ? 'Normal' : `${selectedSpeed}x`}
                    </Text>
                    <ChevronRight size={14} color="#70708A" />
                  </View>
                </Pressable>

                <Pressable
                  style={styles.settingsOptionRow}
                  onPress={() => setSettingsSubMenu('subtitles')}
                >
                  <View style={styles.settingsOptionLeft}>
                    <Captions size={15} color="#A0A0B8" />
                    <Text style={styles.settingsOptionLabel}>Subtitles</Text>
                  </View>
                  <View style={styles.settingsOptionRight}>
                    <Text style={styles.settingsOptionValue}>{selectedSubtitle}</Text>
                    <ChevronRight size={14} color="#70708A" />
                  </View>
                </Pressable>
              </View>
            )}

            {/* QUALITY SUBMENU */}
            {settingsSubMenu === 'quality' && (
              <View style={styles.settingsOptionsList}>
                {(['Auto', '1080p', '720p', '480p', '360p'] as VideoJsQuality[]).map(
                  (q) => {
                    const isSelected = selectedQuality === q;
                    const isVipLocked = q === '1080p' && !isVIP;
                    return (
                      <Pressable
                        key={q}
                        style={[
                          styles.settingsSubItemRow,
                          isSelected && styles.settingsSubItemActive,
                        ]}
                        onPress={() => {
                          if (isVipLocked) {
                            onOpenVipModal?.();
                            return;
                          }
                          setSelectedQuality(q);
                          setSettingsSubMenu('main');
                        }}
                      >
                        <Text
                          style={[
                            styles.settingsSubItemText,
                            isVipLocked ? { color: '#FFB800' } : isSelected ? styles.settingsSubItemTextActive : undefined,
                          ]}
                        >
                          {q === '1080p' ? '1080p Full HD (VIP Only)' : q === '720p' ? '720p HD' : q}
                        </Text>
                        {isVipLocked ? (
                          <Sparkles size={14} color="#FFB800" />
                        ) : isSelected ? (
                          <Check size={14} color="#00D2FF" />
                        ) : null}
                      </Pressable>
                    );
                  }
                )}
              </View>
            )}

            {/* PLAYBACK SPEED SUBMENU */}
            {settingsSubMenu === 'speed' && (
              <View style={styles.settingsOptionsList}>
                {([0.5, 0.75, 1.0, 1.25, 1.5, 2.0] as VideoJsSpeed[]).map((s) => {
                  const isSelected = selectedSpeed === s;
                  return (
                    <Pressable
                      key={s}
                      style={[
                        styles.settingsSubItemRow,
                        isSelected && styles.settingsSubItemActive,
                      ]}
                      onPress={() => {
                        setSelectedSpeed(s);
                        setSettingsSubMenu('main');
                      }}
                    >
                      <Text
                        style={[
                          styles.settingsSubItemText,
                          isSelected && styles.settingsSubItemTextActive,
                        ]}
                      >
                        {s === 1.0 ? 'Normal (1.0x)' : `${s}x`}
                      </Text>
                      {isSelected && <Check size={14} color="#00D2FF" />}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* SUBTITLES SUBMENU */}
            {settingsSubMenu === 'subtitles' && (
              <View style={styles.settingsOptionsList}>
                {(['Off', 'English', 'Bangla'] as VideoJsSubtitle[]).map((sub) => {
                  const isSelected = selectedSubtitle === sub;
                  return (
                    <Pressable
                      key={sub}
                      style={[
                        styles.settingsSubItemRow,
                        isSelected && styles.settingsSubItemActive,
                      ]}
                      onPress={() => {
                        setSelectedSubtitle(sub);
                        setSettingsSubMenu('main');
                      }}
                    >
                      <Text
                        style={[
                          styles.settingsSubItemText,
                          isSelected && styles.settingsSubItemTextActive,
                        ]}
                      >
                        {sub === 'Bangla' ? 'বাংলা (Bangla)' : sub}
                      </Text>
                      {isSelected && <Check size={14} color="#00D2FF" />}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════
            FULL CONTROLS OVERLAY (Top Title & Bottom Control Bar)
           ═══════════════════════════════════════════════ */}
        {showControls && (
          <View style={styles.controlsOverlayWrapper} pointerEvents="box-none">
            {/* Top Bar - Video Badges */}
            <View style={styles.playerTopHeaderRow} pointerEvents="auto">
              <View style={{ flex: 1 }} />

              <View style={styles.playerHeaderBadges}>
                <View style={styles.vjsBadge}>
                  <Text style={styles.vjsBadgeText}>Video.js</Text>
                </View>
              </View>
            </View>

            {/* Bottom Bar - Scrubber & Action Controls */}
            <View style={styles.playerBottomBarWrapper} pointerEvents="auto">
              {/* Timeline Scrubber Bar with Hover Tooltip Preview */}
              <View style={styles.timelineScrubberContainer}>
                {/* Hover Timestamp Preview Tooltip */}
                {hoverPosition !== null && (
                  <View
                    style={[
                      styles.hoverTooltipBox,
                      { left: Math.max(10, Math.min(hoverPosition - 30, scrubberWidth - 70)) },
                    ]}
                  >
                    <Text style={styles.hoverTooltipText}>{formatTime(hoverTime)}</Text>
                  </View>
                )}

                {/* Scrubber Track
                  - ref → scrubberElRef for fresh getBoundingClientRect in handlers
                  - onMouseDown → begins drag; mousemove only updates visual preview
                  - onClick → click-to-seek (skipped if drag already committed)
                  - onTouchStart → touch drag
                  - All children have pointerEvents="none" so they never steal events
                */}
                <View
                  ref={(el) => { scrubberElRef.current = el as HTMLElement | null; }}
                  style={styles.scrubberTrackBox}
                  onLayout={(e) => setScrubberWidth(e.nativeEvent.layout.width)}
                  // @ts-ignore
                  onMouseDown={handleScrubberMouseDown}
                  // @ts-ignore
                  onClick={handleScrubberClick}
                  // @ts-ignore
                  onTouchStart={handleScrubberTouchStart}
                  // @ts-ignore
                  onMouseMove={(e: React.MouseEvent<HTMLElement>) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const offsetX = e.clientX - rect.left;
                    setHoverPosition(offsetX);
                    const vjs = vjsPlayerRef.current;
                    const dur = vjs ? (vjs.duration() ?? 0) : duration;
                    setHoverTime(Math.max(0, Math.min(1, offsetX / rect.width)) * dur);
                  }}
                  // @ts-ignore
                  onMouseLeave={() => setHoverPosition(null)}
                >
                  <View style={styles.scrubberBgTrack} pointerEvents="none" />
                  <View
                    style={[
                      styles.scrubberBufferFill,
                      { width: `${Math.min(100, bufferedProgress * 100)}%` },
                    ]}
                    pointerEvents="none"
                  />
                  <View
                    style={[
                      styles.scrubberPlayedFill,
                      { width: `${Math.min(100, progressRatio * 100)}%` },
                    ]}
                    pointerEvents="none"
                  />
                  <View
                    style={[
                      styles.scrubberHandleDot,
                      { left: `${Math.min(100, progressRatio * 100)}%` },
                      dragPreviewTime !== null && styles.scrubberHandleDotDragging,
                    ]}
                    pointerEvents="none"
                  />
                </View>
              </View>

              {/* Bottom Action Controls Row */}
              <View style={styles.bottomControlsRow}>
                {/* Left Controls Group (Play/Pause, Rewind, Forward, Volume, Time) */}
                <View style={styles.leftControlsGroup}>
                  {/* Play / Pause Toggle */}
                  <Pressable
                    style={styles.ctrlIconBtn}
                    onPress={togglePlayPause}
                    accessibilityRole="button"
                    accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause size={18} color="#FFFFFF" fill="#FFFFFF" />
                    ) : (
                      <Play size={18} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
                    )}
                  </Pressable>

                  {/* Rewind 10s */}
                  <Pressable
                    style={styles.ctrlIconBtn}
                    onPress={() => handleSeekRelative(-10)}
                    accessibilityRole="button"
                    accessibilityLabel="Rewind 10s"
                  >
                    <RotateCcw size={16} color="#E0E0F0" />
                  </Pressable>

                  {/* Forward 10s */}
                  <Pressable
                    style={styles.ctrlIconBtn}
                    onPress={() => handleSeekRelative(10)}
                    accessibilityRole="button"
                    accessibilityLabel="Forward 10s"
                  >
                    <RotateCw size={16} color="#E0E0F0" />
                  </Pressable>

                  {/* Volume Button & Hover Slider */}
                  <View style={styles.volumeGroupRow}>
                    <Pressable
                      style={styles.ctrlIconBtn}
                      onPress={toggleMute}
                      accessibilityRole="button"
                      accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX size={18} color="#FF5252" />
                      ) : volume < 0.5 ? (
                        <Volume1 size={18} color="#FFFFFF" />
                      ) : (
                        <Volume2 size={18} color="#FFFFFF" />
                      )}
                    </Pressable>

                    {!isMobileLayout && (
                      <View style={styles.volumeTrackSliderBox}>
                        <Pressable
                          style={styles.volumeTrackBg}
                          onPress={(e) => {
                            const { locationX } = e.nativeEvent;
                            const newVol = Math.max(0, Math.min(1, locationX / 60));
                            handleVolumeChange(newVol);
                          }}
                        >
                          <View
                            style={[
                              styles.volumeFill,
                              { width: `${isMuted ? 0 : volume * 100}%` },
                            ]}
                          />
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {/* Current Time / Duration Display */}
                  <Text style={styles.timeDisplayLabel}>
                    {formatTime(displayTime)}{' '}
                    <Text style={{ color: '#70708A' }}>/</Text> {formatTime(duration)}
                  </Text>
                </View>

                {/* Right Controls Group (Settings, PiP, Theater, Fullscreen) */}
                <View style={styles.rightControlsGroup}>
                  {/* Settings Gear Button */}
                  <Pressable
                    style={[
                      styles.ctrlIconBtn,
                      isSettingsOpen && styles.ctrlIconBtnActive,
                    ]}
                    onPress={() => {
                      setIsSettingsOpen((prev) => !prev);
                      setSettingsSubMenu('main');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Playback Settings"
                  >
                    <Settings
                      size={18}
                      color={isSettingsOpen ? '#00D2FF' : '#FFFFFF'}
                    />
                  </Pressable>

                  {/* Picture-in-Picture (PiP) */}
                  {!isMobileLayout && (
                    <Pressable
                      style={[styles.ctrlIconBtn, isPip && styles.ctrlIconBtnActive]}
                      onPress={togglePip}
                      accessibilityRole="button"
                      accessibilityLabel="Picture in Picture"
                    >
                      <PictureInPicture2
                        size={18}
                        color={isPip ? '#00D2FF' : '#FFFFFF'}
                      />
                    </Pressable>
                  )}

                  {/* Theater Mode */}
                  {!isMobileLayout && (
                    <Pressable
                      style={[
                        styles.ctrlIconBtn,
                        isTheaterMode && styles.ctrlIconBtnActive,
                      ]}
                      onPress={toggleTheaterMode}
                      accessibilityRole="button"
                      accessibilityLabel="Theater Mode"
                    >
                      <Tv
                        size={18}
                        color={isTheaterMode ? '#00D2FF' : '#FFFFFF'}
                      />
                    </Pressable>
                  )}

                  {/* Fullscreen Toggle */}
                  <Pressable
                    style={styles.ctrlIconBtn}
                    onPress={toggleFullscreen}
                    accessibilityRole="button"
                    accessibilityLabel={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? (
                      <Minimize2 size={18} color="#FFFFFF" />
                    ) : (
                      <Maximize2 size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playerOuterWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1F2438',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  playerTheaterMode: {
    maxWidth: '100%',
    borderRadius: 0,
    borderWidth: 0,
  },
  playerFullscreen: {
    ...(Platform.OS === 'web'
      ? { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }
      : { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }),
    maxWidth: undefined,
    maxHeight: undefined,
    aspectRatio: undefined,
    borderRadius: 0,
    borderWidth: 0,
    zIndex: 999999,
    elevation: 999999,
  },
  mobilePortraitMode: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
  },
  mobileLandscapeMode: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  videoCanvasBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerControlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 32,
    zIndex: 150,
    elevation: 150,
  },
  centerPlayBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 160,
    zIndex: 160,
  },
  centerPlayBtnGlow: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerSkipBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 160,
    elevation: 160,
  },
  centerSkipIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerSkipText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 1,
  },
  centerBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.94 }],
  },
  controlsOverlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 180,
    elevation: 180,
    backgroundColor: 'transparent',
  },
  playerTopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  playerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 10,
  },
  playerTitleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  playerHeaderBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hdrBadge: {
    backgroundColor: 'rgba(255, 184, 0, 0.18)',
    borderWidth: 1,
    borderColor: '#FFB800',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  hdrBadgeText: {
    color: '#FFD700',
    fontSize: 9,
    fontWeight: '900',
  },
  vjsBadge: {
    backgroundColor: 'rgba(3, 86, 197, 0.3)',
    borderWidth: 1,
    borderColor: '#0356C5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  vjsBadgeText: {
    color: '#00D2FF',
    fontSize: 9,
    fontWeight: '900',
  },
  playerBottomBarWrapper: {
    paddingHorizontal: 10,
    paddingBottom: 4,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  timelineScrubberContainer: {
    width: '100%',
    marginBottom: 4,
    position: 'relative',
  },
  hoverTooltipBox: {
    position: 'absolute',
    top: -24,
    backgroundColor: '#0F121E',
    borderWidth: 1,
    borderColor: '#00D2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 50,
  },
  hoverTooltipText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '800',
  },
  scrubberTrackBox: {
    width: '100%',
    height: 16,
    justifyContent: 'center',
    position: 'relative',
  },
  scrubberBgTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    position: 'absolute',
  },
  scrubberBufferFill: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 2,
    position: 'absolute',
  },
  scrubberPlayedFill: {
    height: 4,
    backgroundColor: '#0356C5',
    borderRadius: 2,
    position: 'absolute',
  },
  scrubberHandleDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00D2FF',
    marginTop: -4,
    marginLeft: -6,
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
  scrubberHandleDotDragging: {
    transform: [{ scale: 1.4 }],
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  bottomControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftControlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rightControlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctrlIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctrlIconBtnActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00D2FF',
  },
  volumeGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  volumeTrackSliderBox: {
    width: 50,
    height: 20,
    justifyContent: 'center',
  },
  volumeTrackBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  timeDisplayLabel: {
    color: '#E0E0F0',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  topRightSettingsBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    elevation: 200,
  },
  settingsMenuCard: {
    position: 'absolute',
    right: 16,
    bottom: 56,
    width: 220,
    backgroundColor: '#0F1322',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#242A42',
    padding: 10,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  settingsMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2538',
  },
  settingsBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingsMenuHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  settingsOptionsList: {
    gap: 4,
  },
  settingsOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  settingsOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsOptionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  settingsOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingsOptionValue: {
    color: '#00D2FF',
    fontSize: 11,
    fontWeight: '700',
  },
  settingsSubItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  settingsSubItemActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
  },
  settingsSubItemText: {
    color: '#A0A0C0',
    fontSize: 12,
    fontWeight: '600',
  },
  settingsSubItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
