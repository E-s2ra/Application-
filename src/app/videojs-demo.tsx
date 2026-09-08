import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Tv,
  Sparkles,
  Monitor,
  Smartphone,
  Maximize2,
  Settings,
  Layers,
  CheckCircle2,
  Keyboard,
  SlidersHorizontal,
} from 'lucide-react-native';
import {
  VideoJsPlayer,
  VideoJsQuality,
  VideoJsSpeed,
  VideoJsSubtitle,
  SettingsSubMenu,
} from '@/components/VideoJsPlayer';
import { useTheme } from '@/hooks/use-theme';
import { PrimaryGradient } from '@/components/PrimaryGradient';

export type DemoStateId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

interface DemoStateConfig {
  id: DemoStateId;
  title: string;
  badge: string;
  description: string;
  forced: {
    showControls: boolean;
    isPlaying: boolean;
    isMuted: boolean;
    isFullscreen: boolean;
    isTheaterMode: boolean;
    isPip: boolean;
    isSettingsOpen: boolean;
    settingsSubMenu: SettingsSubMenu;
    selectedQuality: VideoJsQuality;
    selectedSpeed: VideoJsSpeed;
    selectedSubtitle: VideoJsSubtitle;
    currentTime: number;
    duration: number;
    bufferedProgress: number;
    volume: number;
    isMobileView: 'none' | 'portrait' | 'landscape';
  };
}

const DEMO_STATES: DemoStateConfig[] = [
  {
    id: 1,
    title: '1. Normal Video Player',
    badge: 'Standard Idle',
    description: '16:9 rounded container with clean poster artwork and idle video canvas.',
    forced: {
      showControls: false,
      isPlaying: false,
      isMuted: false,
      isFullscreen: false,
      isTheaterMode: false,
      isPip: false,
      isSettingsOpen: false,
      settingsSubMenu: 'main',
      selectedQuality: '1080p',
      selectedSpeed: 1.0,
      selectedSubtitle: 'English',
      currentTime: 120,
      duration: 734,
      bufferedProgress: 0.55,
      volume: 0.8,
      isMobileView: 'none',
    },
  },
  {
    id: 2,
    title: '2. Normal Player + Controls Visible',
    badge: 'Hover Active',
    description: 'Center Play/Pause glass button, timeline scrubber, and action bar controls.',
    forced: {
      showControls: true,
      isPlaying: true,
      isMuted: false,
      isFullscreen: false,
      isTheaterMode: false,
      isPip: false,
      isSettingsOpen: false,
      settingsSubMenu: 'main',
      selectedQuality: '1080p',
      selectedSpeed: 1.0,
      selectedSubtitle: 'English',
      currentTime: 245,
      duration: 734,
      bufferedProgress: 0.7,
      volume: 0.85,
      isMobileView: 'none',
    },
  },
  {
    id: 3,
    title: '3. Settings Menu Open',
    badge: 'Main Settings',
    description: 'Floating glass settings dropdown showing Quality, Speed, and Subtitle options.',
    forced: {
      showControls: true,
      isPlaying: true,
      isMuted: false,
      isFullscreen: false,
      isTheaterMode: false,
      isPip: false,
      isSettingsOpen: true,
      settingsSubMenu: 'main',
      selectedQuality: '1080p',
      selectedSpeed: 1.0,
      selectedSubtitle: 'English',
      currentTime: 310,
      duration: 734,
      bufferedProgress: 0.8,
      volume: 0.8,
      isMobileView: 'none',
    },
  },
  {
    id: 4,
    title: '4. Quality Selection Submenu',
    badge: 'Quality Picker',
    description: 'Submenu showing Auto, 1080p Full HD, 720p HD, 480p, and 360p with checkmark.',
    forced: {
      showControls: true,
      isPlaying: true,
      isMuted: false,
      isFullscreen: false,
      isTheaterMode: false,
      isPip: false,
      isSettingsOpen: true,
      settingsSubMenu: 'quality',
      selectedQuality: '1080p',
      selectedSpeed: 1.0,
      selectedSubtitle: 'English',
      currentTime: 310,
      duration: 734,
      bufferedProgress: 0.8,
      volume: 0.8,
      isMobileView: 'none',
    },
  },
  {
    id: 5,
    title: '5. Playback Speed Submenu',
    badge: 'Speed Picker',
    description: 'Submenu for 0.5x, 0.75x, Normal (1.0x), 1.25x, 1.5x, and 2.0x speeds.',
    forced: {
      showControls: true,
      isPlaying: true,
      isMuted: false,
      isFullscreen: false,
      isTheaterMode: false,
      isPip: false,
      isSettingsOpen: true,
      settingsSubMenu: 'speed',
      selectedQuality: '1080p',
      selectedSpeed: 1.25,
      selectedSubtitle: 'English',
      currentTime: 310,
      duration: 734,
      bufferedProgress: 0.8,
      volume: 0.8,
      isMobileView: 'none',
    },
  },
  {
    id: 6,
    title: '6. Subtitle Selection Submenu',
    badge: 'Subtitles Picker',
    description: 'Submenu for Off, English, and Bangla (বাংলা) captions.',
    forced: {
      showControls: true,
      isPlaying: true,
      isMuted: false,
      isFullscreen: false,
      isTheaterMode: false,
      isPip: false,
      isSettingsOpen: true,
      settingsSubMenu: 'subtitles',
      selectedQuality: '1080p',
      selectedSpeed: 1.0,
      selectedSubtitle: 'Bangla',
      currentTime: 310,
      duration: 734,
      bufferedProgress: 0.8,
      volume: 0.8,
      isMobileView: 'none',
    },
  },
  {
    id: 7,
    title: '7. Fullscreen Player',
    badge: 'Edge-to-Edge FS',
    description: 'Full viewport expansion with identical control set and zero feature drop.',
    forced: {
      showControls: true,
      isPlaying: true,
      isMuted: false,
      isFullscreen: true,
      isTheaterMode: false,
      isPip: false,
      isSettingsOpen: false,
      settingsSubMenu: 'main',
      selectedQuality: '1080p',
      selectedSpeed: 1.0,
      selectedSubtitle: 'English',
      currentTime: 420,
      duration: 734,
      bufferedProgress: 0.9,
      volume: 0.9,
      isMobileView: 'none',
    },
  },
  {
    id: 8,
    title: '8. Fullscreen + Settings Open',
    badge: 'FS + Settings',
    description: 'Fullscreen mode with floating settings menu active on top.',
    forced: {
      showControls: true,
      isPlaying: true,
      isMuted: false,
      isFullscreen: true,
      isTheaterMode: false,
      isPip: false,
      isSettingsOpen: true,
      settingsSubMenu: 'main',
      selectedQuality: '1080p',
      selectedSpeed: 1.0,
      selectedSubtitle: 'English',
      currentTime: 420,
      duration: 734,
      bufferedProgress: 0.9,
      volume: 0.9,
      isMobileView: 'none',
    },
  },
  {
    id: 9,
    title: '9. Mobile Landscape Player',
    badge: 'Mobile Landscape',
    description: 'Touch-optimized landscape orientation with wide tap targets and timeline.',
    forced: {
      showControls: true,
      isPlaying: true,
      isMuted: false,
      isFullscreen: false,
      isTheaterMode: false,
      isPip: false,
      isSettingsOpen: false,
      settingsSubMenu: 'main',
      selectedQuality: '720p',
      selectedSpeed: 1.0,
      selectedSubtitle: 'English',
      currentTime: 180,
      duration: 734,
      bufferedProgress: 0.6,
      volume: 0.8,
      isMobileView: 'landscape',
    },
  },
  {
    id: 10,
    title: '10. Mobile Portrait Player',
    badge: 'Mobile Portrait',
    description: 'Compact portrait card view optimized for mobile phone screens.',
    forced: {
      showControls: true,
      isPlaying: true,
      isMuted: false,
      isFullscreen: false,
      isTheaterMode: false,
      isPip: false,
      isSettingsOpen: false,
      settingsSubMenu: 'main',
      selectedQuality: '720p',
      selectedSpeed: 1.0,
      selectedSubtitle: 'English',
      currentTime: 180,
      duration: 734,
      bufferedProgress: 0.6,
      volume: 0.8,
      isMobileView: 'portrait',
    },
  },
];

export default function VideoJsDemoScreen() {
  const router = useRouter();
  const themeColors = useTheme();
  const [activeStateId, setActiveStateId] = useState<DemoStateId>(2);

  const activeConfig = DEMO_STATES.find((s) => s.id === activeStateId) || DEMO_STATES[1];

  return (
    <View style={[styles.pageContainer, { backgroundColor: themeColors.background }]}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { backgroundColor: themeColors.backgroundElement, borderBottomColor: themeColors.border }]}>
        <Pressable
          style={[styles.headerBackBtn, { backgroundColor: themeColors.backgroundCard }]}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        >
          <ArrowLeft size={18} color={themeColors.text} />
        </Pressable>

        <View style={styles.headerTitleBox}>
          <View style={styles.headerTitleRow}>
            <Tv size={18} color="#00D2FF" />
            <Text style={[styles.headerTitleText, { color: themeColors.text }]}>
              Video.js Premium Player Suite
            </Text>
          </View>
          <Text style={[styles.headerSubText, { color: themeColors.textSecondary }]}>
            10-State Interactive Design Deliverables
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* State Selector Segment Buttons */}
        <View style={styles.stateSegmentCard}>
          <View style={styles.stateSegmentHeader}>
            <Layers size={16} color="#FFB800" />
            <Text style={styles.stateSegmentTitle}>Select Design Deliverable State</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentListRow}>
            {DEMO_STATES.map((st) => {
              const isActive = activeStateId === st.id;
              return (
                <Pressable
                  key={st.id}
                  style={[
                    styles.segmentBtn,
                    isActive && styles.segmentBtnActive,
                  ]}
                  onPress={() => setActiveStateId(st.id)}
                >
                  <Text style={[styles.segmentBtnText, isActive && styles.segmentBtnTextActive]}>
                    #{st.id} {st.badge}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Currently Active State Details Card */}
        <View style={[styles.activeStateBanner, { borderColor: themeColors.border }]}>
          <View style={styles.activeStateLeft}>
            <View style={styles.activeStateBadge}>
              <Text style={styles.activeStateBadgeText}>{activeConfig.badge}</Text>
            </View>
            <Text style={styles.activeStateTitle}>{activeConfig.title}</Text>
            <Text style={styles.activeStateDesc}>{activeConfig.description}</Text>
          </View>
        </View>

        {/* 🎬 Video.js Player Component Render Target */}
        <View style={styles.playerStageContainer}>
          <VideoJsPlayer
            src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
            poster="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80"
            title="Tears of Steel — AniFlix 4K OLED (Video.js)"
            forcedState={activeConfig.forced}
          />
        </View>

        {/* Feature Specs & Keyboard Interaction Card */}
        <View style={styles.specsCardGrid}>
          {/* Keyboard Interaction Shortcuts Box */}
          <View style={styles.specBox}>
            <View style={styles.specHeaderRow}>
              <Keyboard size={16} color="#00D2FF" />
              <Text style={styles.specHeaderTitle}>Keyboard Shortcuts</Text>
            </View>

            <View style={styles.keysList}>
              <View style={styles.keyItemRow}>
                <View style={styles.keyTag}><Text style={styles.keyTagText}>Space / K</Text></View>
                <Text style={styles.keyDescText}>Play / Pause toggle</Text>
              </View>

              <View style={styles.keyItemRow}>
                <View style={styles.keyTag}><Text style={styles.keyTagText}>← / → (J/L)</Text></View>
                <Text style={styles.keyDescText}>Seek -10s / +10s</Text>
              </View>

              <View style={styles.keyItemRow}>
                <View style={styles.keyTag}><Text style={styles.keyTagText}>M</Text></View>
                <Text style={styles.keyDescText}>Mute / Unmute audio</Text>
              </View>

              <View style={styles.keyItemRow}>
                <View style={styles.keyTag}><Text style={styles.keyTagText}>F</Text></View>
                <Text style={styles.keyDescText}>Fullscreen toggle</Text>
              </View>

              <View style={styles.keyItemRow}>
                <View style={styles.keyTag}><Text style={styles.keyTagText}>P</Text></View>
                <Text style={styles.keyDescText}>Picture-in-Picture</Text>
              </View>

              <View style={styles.keyItemRow}>
                <View style={styles.keyTag}><Text style={styles.keyTagText}>↑ / ↓</Text></View>
                <Text style={styles.keyDescText}>Volume Up / Down</Text>
              </View>
            </View>
          </View>

          {/* Core Architectural Highlights */}
          <View style={styles.specBox}>
            <View style={styles.specHeaderRow}>
              <SlidersHorizontal size={16} color="#FFB800" />
              <Text style={styles.specHeaderTitle}>Design System Highlights</Text>
            </View>

            <View style={styles.highlightsList}>
              <View style={styles.hlRow}>
                <CheckCircle2 size={14} color="#00E676" />
                <Text style={styles.hlText}>Video.js DOM event bridge for native web/mobile playback</Text>
              </View>

              <View style={styles.hlRow}>
                <CheckCircle2 size={14} color="#00E676" />
                <Text style={styles.hlText}>Unified feature set across normal and fullscreen modes</Text>
              </View>

              <View style={styles.hlRow}>
                <CheckCircle2 size={14} color="#00E676" />
                <Text style={styles.hlText}>Floating glass submenus for Quality, Speed & Subtitles</Text>
              </View>

              <View style={styles.hlRow}>
                <CheckCircle2 size={14} color="#00E676" />
                <Text style={styles.hlText}>Interactive scrubber bar with timestamp preview tooltip</Text>
              </View>

              <View style={styles.hlRow}>
                <CheckCircle2 size={14} color="#00E676" />
                <Text style={styles.hlText}>Auto-hiding controls overlay with 3s inactivity timer</Text>
              </View>

              <View style={styles.hlRow}>
                <CheckCircle2 size={14} color="#00E676" />
                <Text style={styles.hlText}>Full touch & keyboard interaction support</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '900',
  },
  headerSubText: {
    fontSize: 11,
    marginTop: 1,
  },
  scrollBody: {
    padding: 16,
    gap: 16,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  stateSegmentCard: {
    backgroundColor: '#0F121E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#22263C',
    padding: 12,
    gap: 10,
  },
  stateSegmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stateSegmentTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  segmentListRow: {
    gap: 8,
  },
  segmentBtn: {
    backgroundColor: '#16192B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262B44',
  },
  segmentBtnActive: {
    backgroundColor: '#0356C5',
    borderColor: '#00D2FF',
  },
  segmentBtnText: {
    color: '#8E8EA6',
    fontSize: 11,
    fontWeight: '700',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  activeStateBanner: {
    backgroundColor: '#121626',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  activeStateLeft: {
    gap: 4,
  },
  activeStateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00D2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeStateBadgeText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '900',
  },
  activeStateTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  activeStateDesc: {
    color: '#8E8EA6',
    fontSize: 12,
  },
  playerStageContainer: {
    width: '100%',
    marginVertical: 4,
  },
  specsCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  specBox: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#0F121E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#22263C',
    padding: 14,
    gap: 12,
  },
  specHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1F243A',
  },
  specHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  keysList: {
    gap: 8,
  },
  keyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  keyTag: {
    backgroundColor: '#1A1E30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2E344D',
    minWidth: 80,
    alignItems: 'center',
  },
  keyTagText: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '800',
  },
  keyDescText: {
    color: '#8E8EA6',
    fontSize: 12,
  },
  highlightsList: {
    gap: 8,
  },
  hlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hlText: {
    color: '#D0D0E2',
    fontSize: 12,
    flex: 1,
  },
});
