import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { MediaCategory } from '@/hooks/useFavorites';
import { useResponsive } from '@/hooks/useResponsive';
import { addAnime } from '@/lib/admin-operations';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Lock, Sparkles, Plus, Film, Link as LinkIcon, Image as ImageIcon } from 'lucide-react-native';
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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORY_OPTIONS: { id: MediaCategory; label: string }[] = [
  { id: 'Movies', label: 'Movies' },
  { id: 'Anime Movies', label: 'Anime Movies' },
  { id: 'K-Drama', label: 'K-Drama' },
  { id: 'Drama', label: 'Drama' },
  { id: 'Anime Series', label: 'Anime Series' },
];

import { useToast } from '@/hooks/useToast';

export default function AddAnimeScreen() {
  const router = useRouter();
  const themeColors = useTheme();
  const insets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };
  const { profile } = useAuth();
  const { maxContentWidth } = useResponsive();
  const { showSuccess, showError } = useToast();

  const isAdmin = profile?.role === 'admin';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [episodes, setEpisodes] = useState('1');
  const [episodeLinks, setEpisodeLinks] = useState<{episode: number, url: string}[]>([{episode: 1, url: ''}]);
  const [genre, setGenre] = useState('');
  const [category, setCategory] = useState<MediaCategory>('Movies');
  const [isFeatured, setIsFeatured] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newEpNum, setNewEpNum] = useState('');
  const [newEpUrl, setNewEpUrl] = useState('');
  const [linkError, setLinkError] = useState('');

  const handleAddLink = () => {
    setLinkError('');
    const cleanNumStr = newEpNum.replace(/\D/g, '');
    const num = parseInt(cleanNumStr, 10);
    
    if (!cleanNumStr || isNaN(num) || num <= 0) {
      setLinkError('Please enter a valid episode number (e.g. 1).');
      return;
    }
    if (!newEpUrl.trim()) {
      setLinkError('Please enter a valid video URL.');
      return;
    }
    
    setEpisodeLinks(prev => {
      const next = [...prev];
      const existingIdx = next.findIndex(l => l.episode === num);
      if (existingIdx >= 0) {
        next[existingIdx].url = newEpUrl.trim();
      } else {
        next.push({ episode: num, url: newEpUrl.trim() });
      }
      return next.sort((a, b) => a.episode - b.episode);
    });
    setNewEpNum('');
    setNewEpUrl('');
  };

  const handleRemoveLink = (epToRemove: number) => {
    setEpisodeLinks(prev => prev.filter(l => l.episode !== epToRemove));
  };

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

    setLoading(true);

    const validLinks = episodeLinks.filter(e => e.url.trim().length > 0);
    const result = await addAnime({
      title: title.trim(),
      description: description.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
      video_asset_key: validLinks.length > 0 ? validLinks[0].url : undefined,
      episodes: epsNum,
      episode_links: validLinks,
      genre: genre.trim() || undefined,
      category: category,
      is_featured: isFeatured,
    });

    setLoading(false);

    if (!result.success) {
      showError(result.error || 'Failed to publish media.');
      return;
    }

    showSuccess(`"${title}" published successfully`);
    router.replace('/admin');
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImageUrl('');
    setEpisodeLinks([{episode: 1, url: ''}]);
    setEpisodes('1');
    setGenre('');
    setCategory('Movies');
    setIsFeatured(false);
  };

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={{ maxWidth: 600, width: '100%', justifyContent: 'center', alignItems: 'center', padding: 24, alignSelf: 'center', flex: 1 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(239, 68, 68, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            <Lock color="#EF4444" size={36} />
          </View>
          <Text style={{ color: themeColors.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>
            Access Restricted
          </Text>
          <Text style={{ color: themeColors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 20 }}>
            Only platform administrators have permission to publish new media to AniFlix.
          </Text>
          <Pressable
            style={{ backgroundColor: themeColors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
            onPress={() => router.push('/(auth)/login' as any)}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Log In as Administrator</Text>
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
      <GlobalNavbar title="Add New Media" showBrandLogo={false} showBack={true} />

      <View style={[styles.contentWrapper, { maxWidth: Math.min(maxContentWidth, 800) }]}>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cover Poster Preview Box */}
          <View style={[styles.posterPreviewCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
            <Image
              source={{ uri: imageUrl.trim() || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80' }}
              style={styles.posterImage}
              resizeMode="cover"
            />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ImageIcon size={14} color={themeColors.primary} />
                <Text style={[styles.fieldLabel, { color: themeColors.text }]}>COVER POSTER IMAGE URL</Text>
              </View>
              <TextInput
                style={[styles.inputField, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border, color: themeColors.text }]}
                placeholder="https://... (Poster URL)"
                placeholderTextColor={themeColors.textMuted}
                value={imageUrl}
                onChangeText={setImageUrl}
                autoCapitalize="none"
              />
              <Text style={{ fontSize: 10, color: themeColors.textSecondary }}>Live preview updates above as you type URL.</Text>
            </View>
          </View>

          {/* Title Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: themeColors.text }]}>MEDIA TITLE *</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border, color: themeColors.text }]}
              placeholder="e.g. Inception, Queen of Tears, Suzume"
              placeholderTextColor={themeColors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Category Picker */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: themeColors.text }]}>CATEGORY *</Text>
            <View style={styles.categoryChipRow}>
              {CATEGORY_OPTIONS.map((cat) => {
                const selected = category === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      setCategory(cat.id);
                      if (cat.id === 'Movies' || cat.id === 'Anime Movies') {
                        setEpisodes('1');
                      } else if (episodes === '1') {
                        setEpisodes('16');
                      }
                    }}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: selected ? themeColors.primary : themeColors.backgroundElement,
                        borderColor: selected ? themeColors.primary : themeColors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: selected ? '#FFFFFF' : themeColors.textSecondary },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Episodes & Genre Row */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: themeColors.text }]}>EPISODES COUNT</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border, color: themeColors.text }]}
                placeholder="e.g. 24"
                placeholderTextColor={themeColors.textMuted}
                value={episodes}
                onChangeText={setEpisodes}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 2 }]}>
              <Text style={[styles.fieldLabel, { color: themeColors.text }]}>GENRE / TAGS</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border, color: themeColors.text }]}
                placeholder="e.g. Action, Fantasy"
                placeholderTextColor={themeColors.textMuted}
                value={genre}
                onChangeText={setGenre}
              />
            </View>
          </View>

          {/* Episode Link Manager */}
          <View style={[styles.episodeManagerCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <LinkIcon size={16} color={themeColors.primary} />
              <Text style={[styles.fieldLabel, { color: themeColors.text, marginBottom: 0 }]}>EPISODE VIDEO LINKS MANAGER</Text>
            </View>

            <View style={styles.epInputRow}>
              <TextInput
                style={[styles.inputField, { width: 70, backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border, color: themeColors.text }]}
                placeholder="Ep #"
                placeholderTextColor={themeColors.textMuted}
                value={newEpNum}
                onChangeText={setNewEpNum}
                keyboardType="number-pad"
                editable={!loading}
              />
              <TextInput
                style={[styles.inputField, { flex: 1, backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border, color: themeColors.text }]}
                placeholder="https://...mp4 or .m3u8"
                placeholderTextColor={themeColors.textMuted}
                value={newEpUrl}
                onChangeText={setNewEpUrl}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {linkError ? <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>{linkError}</Text> : null}

            <Pressable
              style={[styles.saveEpLinkBtn, { backgroundColor: themeColors.primary }]}
              onPress={handleAddLink}
              disabled={loading}
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={styles.saveEpLinkText}>Add Episode Video Link</Text>
            </Pressable>

            {episodeLinks.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: themeColors.textSecondary, fontSize: 10, fontWeight: '800', marginBottom: 6 }}>
                  ADDED EPISODE LINKS ({episodeLinks.length}):
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {episodeLinks.map((link) => (
                    <View key={link.episode} style={[styles.epChip, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}>
                      <Text style={[styles.epChipText, { color: themeColors.text }]}>Ep {link.episode}</Text>
                      <Pressable onPress={() => handleRemoveLink(link.episode)}>
                        <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '900', marginLeft: 4 }}>×</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: themeColors.text }]}>SYNOPSIS / DESCRIPTION</Text>
            <TextInput
              style={[styles.inputField, styles.textArea, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border, color: themeColors.text }]}
              placeholder="Write a brief storyline synopsis..."
              placeholderTextColor={themeColors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Hero Featured Switch */}
          <View style={[styles.switchCard, { backgroundColor: themeColors.backgroundCard, borderColor: isFeatured ? '#FFB800' : themeColors.border }]}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} color="#FFB800" />
                <Text style={[styles.switchTitle, { color: themeColors.text }]}>Feature in Home Hero Carousel</Text>
              </View>
              <Text style={[styles.switchSub, { color: themeColors.textSecondary }]}>
                Pin this title at the very top hero slider on Home screen.
              </Text>
            </View>
            <Switch
              value={isFeatured}
              onValueChange={setIsFeatured}
              trackColor={{ false: '#3A3A3C', true: themeColors.primary }}
              thumbColor={isFeatured ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          {/* Primary CTA Submit Button */}
          <Pressable
            style={[styles.submitBtn, { backgroundColor: themeColors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.submitBtnInner}>
                <Check size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Publish New Media Title</Text>
              </View>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* HEADER */
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },

  scrollContent: {
    padding: 12,
    paddingBottom: 60,
    gap: 12,
  },

  /* POSTER PREVIEW */
  posterPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  posterImage: {
    width: 56,
    height: 74,
    borderRadius: 8,
  },

  fieldGroup: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 10,
  },

  /* CATEGORIES */
  categoryChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* EPISODE MANAGER */
  episodeManagerCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  epInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  saveEpLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  saveEpLinkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  epChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  epChipText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* SWITCH CARD */
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 1,
  },

  /* SUBMIT BUTTON */
  submitBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
