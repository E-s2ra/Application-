import { Colors } from '@/constants/theme';
import { MediaCategory } from '@/hooks/useFavorites';
import { useResponsive } from '@/hooks/useResponsive';
import { addAnime } from '@/lib/admin-operations';
import { useRouter } from 'expo-router';
import { ArrowLeft, Film, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

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
  const { maxContentWidth } = useResponsive();

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

    const result = await addAnime({
      title: title.trim(),
      description: description.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
      video_url: videoUrl.trim() || undefined,
      episodes: epsNum,
      genre: genre.trim() || undefined,
      category: category,
      is_featured: isFeatured,
    });

    if (!result.success) {
      setLoading(false);
      Alert.alert('Error', result.error || 'Failed to publish media.');
      return;
    }
    setLoading(false);

    Alert.alert('Success! 🎉', `"${title}" (${category}) has been published to AniFlix.`, [
      { text: 'Add Another', onPress: () => resetForm() },
      { text: 'Back to Panel', onPress: () => (router.canGoBack() ? router.back() : router.replace('/admin')) },
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
      <View style={[styles.contentWrapper, { maxWidth: Math.min(maxContentWidth, 800) }]}>
        {/* Custom Header */}
        <View style={styles.headerBar}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin'))} style={styles.backBtn}>
            <ArrowLeft color="#fff" size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>Add New Media</Text>
          <View style={{ width: 40 }} />
        </View>

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
              placeholder="https://images.unsplash.com/..."
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
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>VIDEO URL (HLS / DASH / LOCAL)</Text>
            {/* 🎬 Quick-fill with the bundled local demo video */}
            <Pressable
              style={[styles.localVideoBtn, { backgroundColor: videoUrl === 'local:sample' ? '#1a3a1a' : themeColors.backgroundElement }]}
              onPress={() => setVideoUrl(videoUrl === 'local:sample' ? '' : 'local:sample')}
            >
              <Film color={videoUrl === 'local:sample' ? '#4BB543' : themeColors.textSecondary} size={16} />
              <Text style={[styles.localVideoBtnText, { color: videoUrl === 'local:sample' ? '#4BB543' : themeColors.textSecondary }]}>
                {videoUrl === 'local:sample' ? '✅ Local Demo Video Selected (sample.mp4)' : '📁 Use Local Demo Video (assets/videos/sample.mp4)'}
              </Text>
            </Pressable>
            <TextInput
              style={inputStyle}
              placeholder="https://... or leave blank to use local demo"
              placeholderTextColor={themeColors.textSecondary}
              value={videoUrl === 'local:sample' ? '' : videoUrl}
              onChangeText={(v) => setVideoUrl(v)}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && videoUrl !== 'local:sample'}
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
                placeholder="Sci-Fi, Action, Romance..."
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
              <Text style={styles.buttonText}>Publish to AniFlix {category}</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#242436',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
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
  localVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242436',
  },
  localVideoBtnText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
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
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
