import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import { deleteAnime, updateAnimeFeatured } from '@/lib/admin-operations';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Star, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Anime = {
  id: string;
  title: string;
  episodes: number;
  genre: string | null;
  category?: string | null;
  is_featured: boolean;
};

export default function AdminPanelScreen() {
  const router = useRouter();
  const themeColors = useTheme();
  const { maxContentWidth } = useResponsive();

  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnime = async () => {
    const { data, error } = await supabase
      .from('anime')
      .select('id, title, episodes, genre, category, is_featured')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAnimeList(data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAnime();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnime();
  };

  const handleDelete = (item: Anime) => {
    Alert.alert(
      'Delete Media',
      `Are you sure you want to delete "${item.title}" from AniFlix? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteAnime(item.id);
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to delete anime');
            } else {
              setAnimeList((prev) => prev.filter((a) => a.id !== item.id));
            }
          },
        },
      ],
    );
  };

  const handleToggleFeatured = async (item: Anime) => {
    const result = await updateAnimeFeatured(item.id, !item.is_featured);
    if (result.success) {
      setAnimeList((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_featured: !a.is_featured } : a)),
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to update anime');
    }
  };

  const renderItem = ({ item }: { item: Anime }) => (
    <View style={[styles.card, { backgroundColor: themeColors.backgroundElement }]}>
      <View style={styles.cardInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          {item.category && (
            <View style={{ backgroundColor: themeColors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{item.category.toUpperCase()}</Text>
            </View>
          )}
          <Text style={[styles.cardTitle, { color: themeColors.text, flex: 1 }]} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <Text style={[styles.cardMeta, { color: themeColors.textSecondary }]}>
          {item.genre ?? 'No genre'} · {item.episodes > 1 ? `${item.episodes} eps` : 'Movie'}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <Pressable
          onPress={() => handleToggleFeatured(item)}
          style={[
            styles.iconBtn,
            { backgroundColor: item.is_featured ? themeColors.primary : themeColors.backgroundSelected },
          ]}
        >
          <Star color={item.is_featured ? '#fff' : themeColors.textSecondary} size={16} fill={item.is_featured ? '#fff' : 'none'} />
        </Pressable>
        <Pressable
          onPress={() => handleDelete(item)}
          style={[styles.iconBtn, { backgroundColor: '#3a0000' }]}
        >
          <Trash2 color="#ff4444" size={16} />
        </Pressable>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: Math.min(maxContentWidth, 900) }]}>
        {/* Custom Header Bar */}
        <View style={styles.headerBar}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} style={styles.backBtn}>
            <ArrowLeft color="#fff" size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>AniFlix Admin Center</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundElement }]}>
            <Text style={[styles.statNumber, { color: themeColors.text }]}>{animeList.length}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Total Media</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundElement }]}>
            <Text style={[styles.statNumber, { color: themeColors.primary }]}>
              {animeList.filter((a) => a.is_featured).length}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Hero Featured</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
          TAP ⭐ TO FEATURE ON HERO · TAP 🗑 TO DELETE
        </Text>

        <FlatList
          data={animeList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={themeColors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                No titles in catalog. Tap + to add your first title!
              </Text>
            </View>
          }
        />

        <Pressable
          style={[styles.fab, { backgroundColor: themeColors.primary }]}
          onPress={() => router.push('/admin/add-anime' as any)}
        >
          <Plus color="#fff" size={28} />
        </Pressable>
      </View>
    </View>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242436',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#242436',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
  },
});
