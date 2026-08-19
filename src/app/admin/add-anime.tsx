import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Sparkles, Film } from 'lucide-react-native';
import { MediaCategory } from '@/hooks/useFavorites';

const CATEGORY_OPTIONS: { id: MediaCategory; label: string; icon: string }[] = [
  { id: 'Movies', label: 'Movies', icon: '🎬' },
  { id: 'Anime Movies', label: 'Anime Movies', icon: '🎌' },
  { id: 'K-Drama', label: 'K-Drama', icon: '🌸' },
  { id: 'Drama', label: 'Drama', icon: '🎭' },
  { id: 'Anime Series', label: 'Anime Series', icon: '⚡' },
];

export default function AddAnimeScreen() {
  const router = useRouter();
  const themeColors = Colors.dark;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [episodes, setEpisodes] = useState('1');
  const [genre, setGenre] = useState('');
  const [category, setCategory] = useState<MediaCategory>('Movies');
  const [isFeatured, setIsFeatured] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required.');
      return;
    }

    const epsNum = episodes ? parseInt(episodes, 10) : 1;
    if (episodes && isNaN(epsNum)) {
      Alert.alert('Error', 'Episodes must be a number.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('anime').insert({
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      video_url: videoUrl.trim() || null,
      episodes: epsNum,
      genre: genre.trim() || null,
      category: category,
      is_featured: isFeatured,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('Success! 🎉', `"${title}" (${category}) has been published to the catalog.`, [
      { text: 'Add Another', onPress: () => resetForm() },
      { text: 'Back to Panel', onPress: () => router.back() },
    ]);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImageUrl('');
    setVideoUrl('');
    setEpisodes('1');
    setGenre('');
    setCategory('Movies');
    setIsFeatured(false);
  };

  const inputStyle = [styles.input, { backgroundColor: themeColors.backgroundElement, color: themeColors.text }];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* 🏷️ Category Selection Group */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>MEDIA CATEGORY *</Text>
          <View style={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: isSelected ? themeColors.primary : themeColors.backgroundElement },
                    isSelected && styles.categoryChipActive,
                  ]}
                  onPress={() => {
                    setCategory(cat.id);
                    if (cat.id === 'Movies' || cat.id === 'Anime Movies') {
                      setEpisodes('1');
                    } else if (episodes === '1') {
                      setEpisodes('16');
                    }
                  }}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: isSelected ? '#fff' : themeColors.textSecondary },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>TITLE *</Text>
          <TextInput
            style={inputStyle}
            placeholder="e.g. Inception, Queen of Tears, Suzume"
            placeholderTextColor={themeColors.textSecondary}
            value={title}
            onChangeText={setTitle}
            editable={!loading}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>DESCRIPTION / SYNOPSIS</Text>
          <TextInput
            style={[inputStyle, styles.textArea]}
            placeholder="Write a brief storyline synopsis..."
            placeholderTextColor={themeColors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!loading}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>POSTER / COVER IMAGE URL</Text>
          <TextInput
            style={inputStyle}
            placeholder="https://example.com/poster.jpg"
            placeholderTextColor={themeColors.textSecondary}
            value={imageUrl}
            onChangeText={setImageUrl}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>SIGNED VIDEO STREAM URL (HLS / DASH)</Text>
          <TextInput
            style={inputStyle}
            placeholder="Short-lived URL issued by your streaming service"
            placeholderTextColor={themeColors.textSecondary}
            value={videoUrl}
            onChangeText={setVideoUrl}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>
              {category.includes('Movie') ? 'EPISODES (1 FOR MOVIES)' : 'EPISODES'}
            </Text>
            <TextInput
              style={inputStyle}
              placeholder="1"
              placeholderTextColor={themeColors.textSecondary}
              value={episodes}
              onChangeText={setEpisodes}
              keyboardType="number-pad"
              editable={!loading}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>GENRES</Text>
            <TextInput
              style={inputStyle}
              placeholder="Sci-Fi, Romance..."
              placeholderTextColor={themeColors.textSecondary}
              value={genre}
              onChangeText={setGenre}
              editable={!loading}
            />
          </View>
        </View>

        <View style={[styles.switchRow, { backgroundColor: themeColors.backgroundElement }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles color="#FFB800" size={16} />
              <Text style={[styles.switchLabel, { color: themeColors.text }]}>Featured Hero Banner</Text>
            </View>
            <Text style={[styles.switchSub, { color: themeColors.textSecondary }]}>
              Show in the top rotating homepage hero carousel
            </Text>
          </View>
          <Switch
            value={isFeatured}
            onValueChange={setIsFeatured}
            trackColor={{ false: themeColors.backgroundSelected, true: themeColors.primary }}
            thumbColor="#fff"
            disabled={loading}
          />
        </View>

        <Pressable
          style={[styles.button, { backgroundColor: themeColors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Publish to {category}</Text>
          )}
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 60,
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#242436',
  },
  categoryChipActive: {
    borderColor: 'transparent',
  },
  categoryIcon: {
    fontSize: 13,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#242436',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#242436',
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  button: {
    height: 54,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    boxShadow: '0px 4px 8px rgba(229, 9, 20, 0.4)',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
