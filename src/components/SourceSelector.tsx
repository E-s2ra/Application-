import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { VideoSource } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { Server, Check, Sparkles } from 'lucide-react-native';

interface SourceSelectorProps {
  sources?: VideoSource[];
  activeSourceId?: string;
  onSelectSource: (source: VideoSource) => void;
}

export function SourceSelector({
  sources = [],
  activeSourceId,
  onSelectSource,
}: SourceSelectorProps) {
  const themeColors = useTheme();

  // If 0 or 1 source, hide the source selector completely
  if (!sources || sources.length <= 1) return null;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <Server size={15} color={themeColors.primary} />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>STREAM SERVER / VIDEO SOURCE</Text>
        </View>
        <Text style={[styles.badgeText, { color: themeColors.textSecondary }]}>
          {sources.length} Servers Available
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {sources.map((srcItem, index) => {
          const isSelected = activeSourceId
            ? activeSourceId === srcItem.id
            : srcItem.is_default || index === 0;

          return (
            <Pressable
              key={srcItem.id || `src_${index}`}
              onPress={() => onSelectSource(srcItem)}
              style={[
                styles.chipItem,
                {
                  backgroundColor: isSelected ? 'rgba(3, 86, 197, 0.18)' : themeColors.backgroundElement,
                  borderColor: isSelected ? themeColors.primary : themeColors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Select ${srcItem.label || `Server ${index + 1}`}`}
            >
              <View style={styles.chipContent}>
                {isSelected ? (
                  <Check size={13} color={themeColors.primary} />
                ) : (
                  <Server size={13} color={themeColors.textSecondary} />
                )}
                <Text
                  style={[
                    styles.chipLabel,
                    {
                      color: isSelected ? themeColors.primary : themeColors.text,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {srcItem.label || `Server ${index + 1}`}
                </Text>
                {srcItem.is_default && (
                  <View style={styles.defaultBadge}>
                    <Sparkles size={9} color="#FFB800" />
                    <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                  </View>
                )}
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
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    marginVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipLabel: {
    fontSize: 12,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,184,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.4)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  defaultBadgeText: {
    color: '#FFB800',
    fontSize: 8.5,
    fontWeight: '900',
  },
});
