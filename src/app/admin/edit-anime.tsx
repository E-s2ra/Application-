import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { MediaCategory } from '@/hooks/useFavorites';
import { useResponsive } from '@/hooks/useResponsive';
import { updateAnime } from '@/lib/admin-operations';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Lock, Sparkles, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
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

export default function EditAnimeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const themeColors = useTheme();
  const { user, profile } = useAuth();
  const { maxContentWidth } = useResponsive();

  const isAdmin = profile?.role === 'admin' || user?.email?.toLowerCase() === 'admin@aniflix.com';

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoAssetKey, setVideoAssetKey] = useState('');
  const [episodes, setEpisodes] = useState('1');
  const [genre, setGenre] = useState('');
  const [category, setCategory] = useState<MediaCategory>('Movies');
  const [isFeatured, setIsFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadItem() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('anime')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          setTitle(data.title || '');
          setDescription(data.description || '');
          setImageUrl(data.image_url || '');
          setVideoAssetKey(data.video_asset_key || data.video_url || '');
          setEpisodes(String(data.episodes || 1));
          setGenre(data.genre || '');
          setCategory((data.category as MediaCategory) || 'Movies');
          setIsFeatured(data.is_featured ?? false);
        }
      } catch (_e) {
      } finally {
        setLoadingInitial(false);
      }
    }
    loadItem();
  }, [id]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      if (Platform.OS === 'web') window.alert('Title is required.');
      else Alert.alert('Error', 'Title is required.');
      return;
    }

    const epsNum = episodes ? parseInt(episodes, 10) : 1;
    if (episodes && isNaN(epsNum)) {
      if (Platform.OS === 'web') window.alert('Episodes must be a number.');
      else Alert.alert('Error', 'Episodes must be a number.');
      return;
    }

    setSaving(true);

    const result = await updateAnime(id as string, {
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      video_asset_key: videoAssetKey.trim() || null,
      episodes: epsNum,
      genre: genre.trim() || null,
      category: category,
      is_featured: isFeatured,
    });

    setSaving(false);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`Changes to "${title}" have been saved and updated for all users! 🎉`);
      router.replace('/admin');
    } else {
      Alert.alert('Updated! 🎉', `"${title}" has been saved and updated for all users.`, [
        { text: 'Back to Panel', onPress: () => router.replace('/admin') },
      ]);
    }
  };

  if (loadingInitial) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={{ maxWidth: 600, width: '100%', justifyContent: 'center', alignItems: 'center', padding: 24, alignSelf: 'center', flex: 1 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#2E1012', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            <Lock color="#FF4D4D" size={38} />
          </View>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
            Access Restricted
          </Text>
          <Text style={{ color: themeColors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            Only the administrator account (<Text style={{ color: '#38BDF8', fontWeight: '700' }}>admin@aniflix.com</Text>) has permission to edit titles on AniFlix.
          </Text>
          <Pressable
            style={{ backgroundColor: themeColors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 10 }}
            onPress={() => router.push('/(auth)/login' as any)}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Log In as Administrator</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { maxWidth: Math.min(maxContentWidth, 750), alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin'))}
            style={[styles.backBtn, { backgroundColor: themeColors.backgroundElement }]}
          >
            <ArrowLeft color={themeColors.text} size={20} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.screenTitle, { color: themeColors.text }]}>Edit Media</Text>
            <Text style={[styles.screenSubtitle, { color: themeColors.textSecondary }]}>
              Changes will immediately update on all users' screens
            </Text>
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>Title *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: themeColors.backgroundElement,
                color: themeColors.text,
                borderColor: themeColors.border,
              },
            ]}
            placeholder="e.g. Solo Leveling Season 2"
            placeholderTextColor={themeColors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Category Picker */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>Category *</Text>
          <View style={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((cat) => {
              const selected = category === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: selected ? themeColors.primary : themeColors.backgroundElement,
                      borderColor: selected ? themeColors.primary : themeColors.border,
                    },
                  ]}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: selected ? '#ffffff' : themeColors.textSecondary },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Episodes & Genre */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.label, { color: themeColors.text }]}>Episodes</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.backgroundElement,
                  color: themeColors.text,
                  borderColor: themeColors.border,
                },
              ]}
              placeholder="e.g. 24"
              placeholderTextColor={themeColors.textSecondary}
              value={episodes}
              onChangeText={setEpisodes}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 2, marginLeft: 8 }]}>
            <Text style={[styles.label, { color: themeColors.text }]}>Genre</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.backgroundElement,
                  color: themeColors.text,
                  borderColor: themeColors.border,
                },
              ]}
              placeholder="e.g. Action, Fantasy"
              placeholderTextColor={themeColors.textSecondary}
              value={genre}
              onChangeText={setGenre}
            />
          </View>
        </View>

        {/* Image URL */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>Cover Image URL</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: themeColors.backgroundElement,
                color: themeColors.text,
                borderColor: themeColors.border,
              },
            ]}
            placeholder="https://..."
            placeholderTextColor={themeColors.textSecondary}
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
          />
        </View>

        {/* Video URL or Key */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>Video Stream URL / Cloudflare R2 Link</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: themeColors.backgroundElement,
                color: themeColors.text,
                borderColor: themeColors.border,
              },
            ]}
            placeholder="https://pub-...r2.dev/videos/episode1.mp4"
            placeholderTextColor={themeColors.textSecondary}
            value={videoAssetKey}
            onChangeText={setVideoAssetKey}
            autoCapitalize="none"
          />
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: themeColors.text }]}>Description</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: themeColors.backgroundElement,
                color: themeColors.text,
                borderColor: themeColors.border,
              },
            ]}
            placeholder="Write a synopsis..."
            placeholderTextColor={themeColors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Hero Featured Switch */}
        <View
          style={[
            styles.switchRow,
            {
              backgroundColor: themeColors.backgroundElement,
              borderColor: themeColors.border,
            },
          ]}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={18} color="#FFB800" />
              <Text style={[styles.switchTitle, { color: themeColors.text }]}>Feature in Hero Carousel</Text>
            </View>
            <Text style={[styles.switchSubtitle, { color: themeColors.textSecondary }]}>
              Highlights this media at the very top of the Home screen for all users
            </Text>
          </View>
          <Switch
            value={isFeatured}
            onValueChange={setIsFeatured}
            trackColor={{ false: '#3A3A3C', true: themeColors.primary }}
            thumbColor={isFeatured ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        {/* Action Button */}
        <Pressable
          style={[
            styles.submitBtn,
            { backgroundColor: themeColors.primary, opacity: saving ? 0.7 : 1 },
          ]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitBtnText}>Save Changes</Text>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 28,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  switchSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
