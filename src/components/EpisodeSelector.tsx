import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Image } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Play, Sparkles, Tv, CheckCircle2 } from 'lucide-react-native';
import { PrimaryGradient } from '@/components/PrimaryGradient';

export interface EpisodeItem {
  episode: number;
  title: string;
  duration?: string;
  thumbnail?: string;
  url?: string;
}

interface EpisodeSelectorProps {
  totalEpisodes: number;
  selectedEpisode: number;
  onSelectEpisode: (epNumber: number) => void;
  category?: string;
}

export function EpisodeSelector({
  totalEpisodes,
  selectedEpisode,
  onSelectEpisode,
  category,
}: EpisodeSelectorProps) {
  const themeColors = useTheme();
  const [selectedSeason, setSelectedSeason] = useState(1);

  // Generate episodes array if totalEpisodes > 1
  const count = Math.max(totalEpisodes || 12, 1);
  const episodesList: EpisodeItem[] = Array.from({ length: count }, (_, i) => ({
    episode: i + 1,
    title: `Episode ${i + 1}`,
    duration: '24m',
  }));

  const isSeries = totalEpisodes > 1 || category?.includes('Series') || category?.includes('Drama');

  if (!isSeries) return null;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
      {/* 🎬 Header & Season Tabs */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Tv size={18} color={themeColors.primary} />
          <Text style={[styles.heading, { color: themeColors.text }]}>Episodes & Seasons</Text>
          <View style={[styles.countBadge, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.countBadgeText}>{count} EPS</Text>
          </View>
        </View>

        {/* Season Selector Pills */}
        <View style={styles.seasonRow}>
          <Pressable
            onPress={() => setSelectedSeason(1)}
            style={[
              styles.seasonPill,
              {
                backgroundColor: selectedSeason === 1 ? themeColors.primary : themeColors.backgroundElement,
                borderColor: selectedSeason === 1 ? themeColors.primary : themeColors.border,
              },
            ]}
          >
            {selectedSeason === 1 && <PrimaryGradient borderRadius={12} />}
            <Text style={[styles.seasonText, { color: selectedSeason === 1 ? '#FFFFFF' : themeColors.textSecondary }]}>
              Season 1
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 🍿 Episode Carousel Grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.episodeScroll}
      >
        {episodesList.map((ep) => {
          const isPlaying = selectedEpisode === ep.episode;

          return (
            <Pressable
              key={`ep-${ep.episode}`}
              onPress={() => onSelectEpisode(ep.episode)}
              style={[
                styles.episodeCard,
                {
                  backgroundColor: isPlaying ? 'rgba(3, 86, 197, 0.12)' : themeColors.backgroundElement,
                  borderColor: isPlaying ? themeColors.primary : themeColors.border,
                },
              ]}
            >
              {/* Play / Active Icon Box */}
              <View style={[styles.epBadgeBox, { backgroundColor: isPlaying ? themeColors.primary : themeColors.backgroundCard }]}>
                {isPlaying ? (
                  <CheckCircle2 size={16} color="#FFFFFF" />
                ) : (
                  <Play size={14} color={themeColors.textSecondary} fill={themeColors.textSecondary} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.epTitle, { color: isPlaying ? themeColors.primary : themeColors.text, fontWeight: isPlaying ? '800' : '600' }]}>
                  EP {ep.episode}
                </Text>
                <Text style={[styles.epSub, { color: themeColors.textSecondary }]}>
                  {ep.duration} · {isPlaying ? 'Playing' : 'Stream'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 14,
    gap: 12,
  },
  header: {
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heading: {
    fontSize: 16,
    fontWeight: '900',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  seasonPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  seasonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  episodeScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    width: 140,
  },
  epBadgeBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  epTitle: {
    fontSize: 13,
  },
  epSub: {
    fontSize: 10,
    marginTop: 2,
  },
});
