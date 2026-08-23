import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/hooks/useAuth';
import { deleteAnime, getDeletedMediaIds, updateAnimeFeatured } from '@/lib/admin-operations';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { ArrowLeft, Lock, Pencil, Plus, Star, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
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
  const { user, profile } = useAuth();
  const { maxContentWidth } = useResponsive();

  const isAdmin = profile?.role === 'admin' || user?.email?.toLowerCase() === 'esra99san@gmail.com';

  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [vipCount, setVipCount] = useState(0);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnime = async () => {
    try {
      const deletedIds = await getDeletedMediaIds();
      const [{ data, error }, { count: vips }, { count: payments }] = await Promise.all([
        supabase
          .from('anime')
          .select('id, title, episodes, genre, category, is_featured')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_vip', true),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      ]);

      if (!error && data) {
        const filtered = data.filter((a) => !deletedIds.includes(a.id));
        setAnimeList(filtered);
      }
      if (typeof vips === 'number') setVipCount(vips);
      if (typeof payments === 'number') setPaymentsCount(payments);
    } catch (_e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnime();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnime();
  };

  const handleDelete = async (item: Anime) => {
    let confirmed = false;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      confirmed = window.confirm(`Are you sure you want to permanently delete "${item.title}" from AniFlix? This cannot be undone.`);
    } else {
      confirmed = await new Promise((resolve) => {
        Alert.alert(
          'Delete Media',
          `Are you sure you want to permanently delete "${item.title}" from AniFlix? This cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      });
    }

    if (!confirmed) return;

    const result = await deleteAnime(item.id);
    if (!result.success) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(result.error || 'Failed to delete anime');
      } else {
        Alert.alert('Error', result.error || 'Failed to delete anime');
      }
    } else {
      setAnimeList((prev) => prev.filter((a) => a.id !== item.id));
    }
  };

  const handleClearAll = async () => {
    if (animeList.length === 0) return;
    let confirmed = false;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      confirmed = window.confirm(`Are you sure you want to permanently delete all ${animeList.length} media items? This cannot be undone.`);
    } else {
      confirmed = await new Promise((resolve) => {
        Alert.alert(
          'Delete All Media',
          `Are you sure you want to permanently delete all ${animeList.length} media items? This cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete All', style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      });
    }

    if (!confirmed) return;

    for (const item of animeList) {
      await deleteAnime(item.id);
    }
    setAnimeList([]);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert('All test media items have been deleted! 🎉');
    } else {
      Alert.alert('Deleted', 'All test media items have been deleted.');
    }
  };

  const handleToggleFeatured = async (item: Anime) => {
    const result = await updateAnimeFeatured(item.id, !item.is_featured);
    if (result.success) {
      setAnimeList((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_featured: !a.is_featured } : a)),
      );
    } else {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(result.error || 'Failed to update anime');
      } else {
        Alert.alert('Error', result.error || 'Failed to update anime');
      }
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
          onPress={() => router.push({ pathname: '/admin/edit-anime', params: { id: item.id } })}
          style={[styles.iconBtn, { backgroundColor: '#1E293B' }]}
        >
          <Pencil color="#38BDF8" size={16} />
        </Pressable>
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

  // Strict Admin Gate: Only esra99san@gmail.com or role=admin
  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.contentWrapper, { maxWidth: 600, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#2E1012', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            <Lock color="#FF4D4D" size={38} />
          </View>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>
            Access Restricted
          </Text>
          <Text style={{ color: themeColors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            Only the administrator account (<Text style={{ color: '#38BDF8', fontWeight: '700' }}>esra99san@gmail.com</Text>) has permission to manage, edit, and delete titles on AniFlix.
          </Text>
          <Pressable
            style={{ backgroundColor: themeColors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 10 }}
            onPress={() => router.push('/(auth)/login' as any)}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Log In as Administrator</Text>
          </Pressable>
          <Pressable
            style={{ marginTop: 16 }}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={{ color: themeColors.textSecondary, fontSize: 13 }}>Return to Home</Text>
          </Pressable>
        </View>
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
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Featured</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundElement }]}>
            <Text style={[styles.statNumber, { color: '#FFB800' }]}>{vipCount}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>VIP Active</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: themeColors.backgroundElement }]}>
            <Text style={[styles.statNumber, { color: '#00E676' }]}>{paymentsCount}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Payments</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 8 }}>
          <Text style={[styles.sectionTitle, { color: themeColors.textSecondary, marginHorizontal: 0, marginBottom: 0 }]}>
            TAP ✏️ TO EDIT · TAP ⭐ TO FEATURE · TAP 🗑 TO DELETE
          </Text>
          {animeList.length > 0 && (
            <Pressable onPress={handleClearAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Trash2 color="#ff4444" size={13} />
              <Text style={{ color: '#ff4444', fontSize: 11, fontWeight: '700' }}>CLEAR ALL</Text>
            </Pressable>
          )}
        </View>

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
