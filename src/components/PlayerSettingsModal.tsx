import React from 'react';
import { StyleSheet, View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Settings, X } from 'lucide-react-native';
import { PrimaryGradient } from '@/components/PrimaryGradient';

interface PlayerSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  playbackSpeed: number;
  onSelectSpeed: (speed: number) => void;
  availableQualities?: string[];
  availableAudioTracks?: string[];
}


const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0];

export function PlayerSettingsModal({
  visible,
  onClose,
  playbackSpeed,
  onSelectSpeed,
  availableQualities = [],
  availableAudioTracks = [],
}: PlayerSettingsModalProps) {
  const themeColors = useTheme();

  const audioLabel = availableAudioTracks.length > 0
    ? availableAudioTracks.join(' · ')
    : 'Original secure stream';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close player settings"
        />
        
        <View style={[styles.modalCard, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Settings size={20} color={themeColors.primary} />
              <Text style={[styles.title, { color: themeColors.text }]}>Player & Stream Settings</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Close player settings"
              hitSlop={8}
            >
              <X size={18} color={themeColors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>STREAM QUALITY</Text>
            <View style={styles.optionsWrap}>
              <View
                style={[
                  styles.optionItem,
                  { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border },
                ]}
                accessible
                accessibilityLabel={`Stream quality: ${availableQualities.length > 0 ? availableQualities.join(', ') : 'original source'}`}
              >
                <Text style={[styles.optionText, { color: themeColors.text, fontWeight: '700' }]}>
                  {availableQualities.length > 0 ? availableQualities.join(' · ') : 'Original source'}
                </Text>
                <Text style={[styles.streamManagedText, { color: themeColors.textSecondary }]}>Server managed</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

            {/* 🎙️ Audio Track & Subtitle Selector */}
            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
              AUDIO & SUBTITLES
            </Text>
            <View style={styles.optionsWrap}>
              <View
                accessible
                accessibilityLabel={'Audio: ' + audioLabel + '. Server managed.'}
                style={[
                  styles.optionItem,
                  { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border },
                ]}
              >
                <Text style={[styles.optionText, { color: themeColors.text, fontWeight: '700' }]}>
                  {audioLabel}
                </Text>
                <Text style={[styles.streamManagedText, { color: themeColors.textSecondary }]}>Server managed</Text>
              </View>
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
                    accessibilityRole="radio"
                    accessibilityLabel={`Playback speed ${speed === 1 ? 'normal' : `${speed} times`}`}
                    accessibilityState={{ selected: isSelected }}
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
  streamManagedText: {
    fontSize: 11,
    fontWeight: '700',
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
  vipLockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,184,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.5)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  vipLockText: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '900',
  },
  vipQualityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,184,0,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 4,
  },
  vipQualityNoteText: {
    color: '#FFB800',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
});
