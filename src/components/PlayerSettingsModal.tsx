import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Settings, Check, X, Shield, Gauge, Volume2, Globe, Sparkles } from 'lucide-react-native';
import { PrimaryGradient } from '@/components/PrimaryGradient';

interface PlayerSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  playbackSpeed: number;
  onSelectSpeed: (speed: number) => void;
  availableQualities?: string[];
  activeQuality?: string;
  onSelectQuality?: (q: string) => void;
  availableAudioTracks?: string[];
  activeAudio?: string;
  onSelectAudio?: (a: string) => void;
}

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0];

export function PlayerSettingsModal({
  visible,
  onClose,
  playbackSpeed,
  onSelectSpeed,
  availableQualities = [],
  activeQuality = 'Auto',
  onSelectQuality,
  availableAudioTracks = [],
  activeAudio = 'Default Audio',
  onSelectAudio,
}: PlayerSettingsModalProps) {
  const themeColors = useTheme();
  const [quality, setQuality] = useState<string>(activeQuality);
  const [audio, setAudio] = useState<string>(activeAudio);

  // Build real quality list (NO FAKE HARDCODED DATA)
  const qualityList = availableQualities && availableQualities.length > 0
    ? ['Auto', ...availableQualities]
    : ['Auto (Original Stream)'];

  // Build real audio list (NO FAKE HARDCODED DATA)
  const audioList = availableAudioTracks && availableAudioTracks.length > 0
    ? availableAudioTracks
    : ['Default Audio'];

  const handleQualityChange = (q: string) => {
    setQuality(q);
    if (onSelectQuality) onSelectQuality(q);
  };

  const handleAudioChange = (a: string) => {
    setAudio(a);
    if (onSelectAudio) onSelectAudio(a);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={[styles.modalCard, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Settings size={20} color={themeColors.primary} />
              <Text style={[styles.title, { color: themeColors.text }]}>Player & Stream Settings</Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
              <X size={18} color={themeColors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* 📺 Stream Quality Selector */}
            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
              VIDEO STREAM QUALITY ({availableQualities.length > 0 ? `${availableQualities.length} Streams` : 'Original'})
            </Text>
            <View style={styles.optionsWrap}>
              {qualityList.map((q) => {
                const isSelected = quality === q || (q.startsWith('Auto') && quality === 'Auto');
                return (
                  <Pressable
                    key={q}
                    onPress={() => handleQualityChange(q)}
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor: isSelected ? 'rgba(3, 86, 197, 0.15)' : themeColors.backgroundCard,
                        borderColor: isSelected ? themeColors.primary : themeColors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: isSelected ? themeColors.primary : themeColors.text, fontWeight: isSelected ? '800' : '600' }]}>
                      {q}
                    </Text>
                    {isSelected && <Check size={16} color={themeColors.primary} />}
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

            {/* 🎙️ Audio Track & Subtitle Selector */}
            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
              AUDIO & SUBTITLES ({availableAudioTracks.length > 0 ? `${availableAudioTracks.length} Tracks` : 'Default Track'})
            </Text>
            <View style={styles.optionsWrap}>
              {audioList.map((a) => {
                const isSelected = audio === a || (a === 'Default Audio' && audio === 'Default Audio');
                return (
                  <Pressable
                    key={a}
                    onPress={() => handleAudioChange(a)}
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor: isSelected ? 'rgba(3, 86, 197, 0.15)' : themeColors.backgroundCard,
                        borderColor: isSelected ? themeColors.primary : themeColors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.optionText, { color: isSelected ? themeColors.primary : themeColors.text, fontWeight: isSelected ? '800' : '600' }]}>
                      {a}
                    </Text>
                    {isSelected && <Check size={16} color={themeColors.primary} />}
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

            {/* ⚡ Playback Speed Selector */}
            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>PLAYBACK SPEED</Text>
            <View style={styles.speedRow}>
              {SPEED_OPTIONS.map((speed) => {
                const isSelected = playbackSpeed === speed;
                return (
                  <Pressable
                    key={speed}
                    onPress={() => onSelectSpeed(speed)}
                    style={[
                      styles.speedChip,
                      {
                        backgroundColor: isSelected ? themeColors.primary : themeColors.backgroundCard,
                        borderColor: isSelected ? themeColors.primary : themeColors.border,
                      },
                    ]}
                  >
                    {isSelected && <PrimaryGradient borderRadius={10} />}
                    <Text style={[styles.speedText, { color: isSelected ? '#FFFFFF' : themeColors.text, fontWeight: isSelected ? '800' : '600' }]}>
                      {speed === 1.0 ? 'Normal' : `${speed}x`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '82%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    gap: 12,
    paddingVertical: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },
  optionsWrap: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 4,
    opacity: 0.5,
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speedChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  speedText: {
    fontSize: 12,
  },
});
