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
import { Sparkles } from 'lucide-react-native';

export default function AddAnimeScreen() {
  const router = useRouter();
  const themeColors = Colors.dark;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [episodes, setEpisodes] = useState('');
  const [genre, setGenre] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required.');
      return;
    }

    const epsNum = episodes ? parseInt(episodes, 10) : 0;
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
      is_featured: isFeatured,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('Success! 🎉', `"${title}" has been published to the catalog.`, [
      { text: 'Add Another', onPress: () => resetForm() },
      { text: 'Back to Panel', onPress: () => router.back() },
    ]);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImageUrl('');
    setVideoUrl('');
    setEpisodes('');
    setGenre('');
    setIsFeatured(false);
  };

  const inputStyle = [styles.input, { backgroundColor: themeColors.backgroundElement, color: themeColors.text }];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>TITLE *</Text>
          <TextInput
            style={inputStyle}
            placeholder="e.g. Attack on Titan"
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
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>EPISODES</Text>
            <TextInput
              style={inputStyle}
              placeholder="12"
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
              placeholder="Action, Shonen..."
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
              <Text style={[styles.switchLabel, { color: themeColors.text }]}>Featured in 4s Hero</Text>
            </View>
            <Text style={[styles.switchSub, { color: themeColors.textSecondary }]}>
              Show in the top auto-rotating homepage carousel
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
            <Text style={styles.buttonText}>Publish Anime</Text>
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
