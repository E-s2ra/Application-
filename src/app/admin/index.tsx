import { useTheme } from '@/hooks/use-theme';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/hooks/useAuth';
import { deleteAnime, updateAnimeFeatured, callAdminOperation } from '@/lib/admin-operations';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Lock,
  Pencil,
  Plus,
  Star,
  Trash2,
  Film,
  Crown,
  Search,
  RefreshCw,
  Layers,
  Shield,
  UserCheck,
  XCircle,
} from 'lucide-react-native';
import { useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Anime = {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  episodes: number;
  genre: string | null;
  category?: string | null;
  is_featured: boolean;
};

const CATEGORIES = ['All', 'Movies', 'Anime Movies', 'K-Drama', 'Drama', 'Anime Series'];

import { useToast } from '@/hooks/useToast';
import { useNotifications } from '@/hooks/useNotifications';
import { Send, Bell } from 'lucide-react-native';

export default function AdminPanelScreen() {
  const router = useRouter();
  const themeColors = useTheme();
  const insets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };
  const { profile } = useAuth();
  const { maxContentWidth, isMobile, width } = useResponsive();
  const { showSuccess, showError, showInfo } = useToast();
  const { addNotification } = useNotifications();

  const handleBroadcastAnnouncement = async () => {
    await addNotification({
      title: 'New 4K Release Announcement',
      message: 'New high quality movies and anime series uploaded to AniFlix catalog!',
      type: 'release',
    });
    showSuccess('Broadcast announcement sent to all users!');
  };

  const isAdmin = profile?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'media' | 'vip'>('media');
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [vipCount, setVipCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  // Instant VIP State
  const [instantEmail, setInstantEmail] = useState('');
  const [instantDays, setInstantDays] = useState(90);
  const [grantingVip, setGrantingVip] = useState(false);

  const isSmallMobile = width < 420;

  const handleInstantGrantVip = async () => {
    if (!instantEmail.trim()) {
      showError('Please enter a valid user email address.');
      return;
    }
    setGrantingVip(true);
    const email = instantEmail.trim().toLowerCase();

    try {
      const res = await callAdminOperation('grant_vip', {
        user: { email, days: instantDays },
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to grant VIP via admin Edge Function.');
      }

      showSuccess(`VIP activated for ${email} (${instantDays} days)`);
      setInstantEmail('');
      fetchAnime();
    } catch (err: any) {
      showError(err.message || 'Failed to grant VIP.');
    } finally {
      setGrantingVip(false);
    }
  };

  const fetchAnime = async () => {
    try {
      const promises: any[] = [
        supabase
          .from('anime')
          .select('id, title, description, image_url, episodes, genre, category, is_featured')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_vip', true),
        import('@/lib/admin-operations').then(m => m.getEditedMediaOverrides()),
        import('@/lib/admin-operations').then(m => m.getDeletedMediaIds())
      ];

      const resArr = await Promise.allSettled(promises);
      
      const animeRes = resArr[0].status === 'fulfilled' ? resArr[0].value : { data: [], error: null };
      const vipsRes = resArr[1].status === 'fulfilled' ? resArr[1].value : { count: 0 };
      const overrides = resArr[2].status === 'fulfilled' ? (resArr[2].value || {}) : {};
      const deletedIdsArr = resArr[3].status === 'fulfilled' ? (resArr[3].value || []) : [];

      const deletedStrings = Array.isArray(deletedIdsArr) ? deletedIdsArr.map(String) : [];
      const safeData = (animeRes && !animeRes.error && Array.isArray(animeRes.data)) ? animeRes.data : [];

      const cloudItems = safeData
        .filter((item: any) => item && item.id && !deletedStrings.includes(String(item.id)))
        .map((item: any) => ({ ...item, ...(overrides[String(item.id)] || {}) }));
        
      const safeOverrides = overrides && typeof overrides === 'object' ? overrides : {};
      const newLocalItems = Object.values(safeOverrides)
        .filter((override: any) => override && override.id && !deletedStrings.includes(String(override.id)) && !safeData.some((d: any) => String(d?.id) === String(override.id))) as Anime[];

      const combined = [...newLocalItems, ...cloudItems];

      setAnimeList(combined);
      if (typeof vipsRes?.count === 'number') setVipCount(vipsRes.count);
    } catch (e) {
      console.warn('[Admin] fetchAnime error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAnime();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnime();
  };

  const handleDelete = async (item: Anime) => {
    if (!item || !item.id) return;
    let confirmed = false;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      confirmed = window.confirm(`Are you sure you want to permanently delete "${item.title}"?`);
    } else {
      confirmed = await new Promise((resolve) => {
        Alert.alert(
          'Delete Media Title',
          `Are you sure you want to permanently delete "${item.title}"?`,
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
      showError(result.error || 'Failed to delete anime');
    } else {
      showInfo(`"${item.title}" deleted.`);
      await fetchAnime();
    }
  };

  const handleClearAll = async () => {
    if (animeList.length === 0) return;
    let confirmed = false;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      confirmed = window.confirm(`Are you sure you want to permanently delete all ${animeList.length} media items?`);
    } else {
      confirmed = await new Promise((resolve) => {
        Alert.alert(
          'Delete All Media',
          `Are you sure you want to permanently delete all ${animeList.length} media items?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Delete All', style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      });
    }

    if (!confirmed) return;

    const { error: rpcErr } = await supabase.rpc('admin_delete_all_anime');
    if (!rpcErr) {
      setAnimeList([]);
      showInfo('All media catalog items deleted.');
      await fetchAnime();
      return;
    }

    for (const item of animeList) {
      if (item?.id) await deleteAnime(item.id);
    }
    setAnimeList([]);
    showInfo('All media catalog items deleted.');
    await fetchAnime();
  };

  const handleToggleFeatured = async (item: Anime) => {
    if (!item || !item.id) return;
    const nextFeatured = !item.is_featured;
    const result = await updateAnimeFeatured(item.id, nextFeatured);
    if (result.success) {
      setAnimeList((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_featured: nextFeatured } : a)),
      );
      showSuccess(nextFeatured ? `Featured "${item.title}" on Home` : `Removed "${item.title}" from Featured`);
    } else {
      showError(result.error || 'Failed to update anime');
    }
  };

  // Filtered List based on Search and Category selection
  const filteredAnimeList = useMemo(() => {
    return animeList.filter((item) => {
      const matchesSearch = !searchQuery.trim() || item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || item.genre?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategoryFilter === 'All' || item.category === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [animeList, searchQuery, selectedCategoryFilter]);

  const renderItem = ({ item }: { item: Anime }) => {
    if (!item) return null;
    const catLabel = item.category ? String(item.category).toUpperCase() : null;
    const itemTitle = String(item.title || 'Untitled');
    const epsCount = Number(item.episodes || 1);

    return (
      <View style={[styles.card, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
        <Image
          source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80' }}
          style={styles.cardThumbnail}
          resizeMode="cover"
        />

        <View style={styles.cardInfo}>
          <View style={styles.cardCategoryRow}>
            {catLabel && (
              <View style={[styles.catBadge, { backgroundColor: themeColors.primary }]}>
                <Text style={styles.catBadgeText}>{catLabel}</Text>
              </View>
            )}
            {item.is_featured && (
              <View style={[styles.featuredBadge, { backgroundColor: 'rgba(255, 184, 0, 0.15)', borderColor: '#FFB800' }]}>
                <Star size={9} color="#FFB800" fill="#FFB800" />
                <Text style={styles.featuredBadgeText}>FEATURED</Text>
              </View>
            )}
          </View>

          <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={1}>
            {itemTitle}
          </Text>

          <Text style={[styles.cardMeta, { color: themeColors.textSecondary }]} numberOfLines={1}>
            {item.genre ?? 'General'} · {epsCount > 1 ? `${epsCount} Eps` : 'Movie'}
          </Text>
        </View>

        <View style={styles.cardActions}>
          <Pressable
            onPress={() => router.push({ pathname: '/admin/edit-anime', params: { id: item.id } })}
            style={[styles.iconBtn, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${itemTitle}`}
          >
            <Pencil color={themeColors.accentCyan || '#38BDF8'} size={14} />
          </Pressable>

          <Pressable
            onPress={() => handleToggleFeatured(item)}
            style={[
              styles.iconBtn,
              { backgroundColor: item.is_featured ? 'rgba(255, 184, 0, 0.15)' : themeColors.backgroundElement, borderColor: item.is_featured ? '#FFB800' : themeColors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Toggle featured ${itemTitle}`}
          >
            <Star color={item.is_featured ? '#FFB800' : themeColors.textSecondary} size={14} fill={item.is_featured ? '#FFB800' : 'none'} />
          </Pressable>

          <Pressable
            onPress={() => handleDelete(item)}
            style={[styles.iconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${itemTitle}`}
          >
            <Trash2 color="#EF4444" size={14} />
          </Pressable>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.contentWrapper, { maxWidth: 600, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
          <View style={styles.lockCircle}>
            <Lock color="#EF4444" size={38} />
          </View>
          <Text style={[styles.lockTitle, { color: themeColors.text }]}>Access Restricted</Text>
          <Text style={[styles.lockSub, { color: themeColors.textSecondary }]}>
            Only platform administrators have permission to access the AniFlix Admin Console.
          </Text>
          <Pressable
            style={[styles.loginAdminBtn, { backgroundColor: themeColors.primary }]}
            onPress={() => router.push('/(auth)/login' as any)}
          >
            <Text style={styles.loginAdminText}>Log In as Administrator</Text>
          </Pressable>
          <Pressable style={{ marginTop: 16 }} onPress={() => router.replace('/(tabs)')}>
            <Text style={{ color: themeColors.textSecondary, fontSize: 13 }}>Return to Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <GlobalNavbar title="Admin Console" showBrandLogo={false} showBack={true} />

      <View style={[styles.contentWrapper, { maxWidth: Math.min(maxContentWidth, 960) }]}>

        {/* 📊 Responsive Analytics Metric Cards */}
        <View style={[styles.metricsRow, isSmallMobile && styles.metricsRowMobile]}>
          <View style={[styles.metricCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
            <View style={[styles.metricIconBox, { backgroundColor: 'rgba(3, 86, 197, 0.15)' }]}>
              <Film size={16} color={themeColors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.metricValue, { color: themeColors.text }]} numberOfLines={1} adjustsFontSizeToFit>{animeList.length}</Text>
              <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]} numberOfLines={1}>Total Titles</Text>
            </View>
          </View>

          <View style={[styles.metricCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
            <View style={[styles.metricIconBox, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
              <Star size={16} color="#FFB800" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.metricValue, { color: themeColors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {animeList.filter((a) => a?.is_featured).length}
              </Text>
              <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]} numberOfLines={1}>Featured</Text>
            </View>
          </View>

          <View style={[styles.metricCard, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
            <View style={[styles.metricIconBox, { backgroundColor: 'rgba(0, 230, 118, 0.15)' }]}>
              <Crown size={16} color="#00E676" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.metricValue, { color: themeColors.text }]} numberOfLines={1} adjustsFontSizeToFit>{vipCount}</Text>
              <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]} numberOfLines={1}>VIP Active</Text>
            </View>
          </View>
        </View>

        {/* 🎛️ Segmented Navigation Hub (Tabs) */}
        <View style={[styles.segmentedRow, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border }]}>
          <Pressable
            style={[
              styles.segmentedTab,
              activeTab === 'media' && [styles.segmentedTabActive, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.primary }]
            ]}
            onPress={() => setActiveTab('media')}
          >
            <Layers size={14} color={activeTab === 'media' ? themeColors.primary : themeColors.textSecondary} />
            <Text style={[styles.segmentedText, { color: activeTab === 'media' ? themeColors.text : themeColors.textSecondary }]} numberOfLines={1}>
              Catalog ({animeList.length})
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.segmentedTab,
              activeTab === 'vip' && [styles.segmentedTabActive, { backgroundColor: themeColors.backgroundCard, borderColor: '#FFB800' }]
            ]}
            onPress={() => setActiveTab('vip')}
          >
            <Crown size={14} color={activeTab === 'vip' ? '#FFB800' : themeColors.textSecondary} />
            <Text style={[styles.segmentedText, { color: activeTab === 'vip' ? themeColors.text : themeColors.textSecondary }]} numberOfLines={1}>
              Instant VIP Grant
            </Text>
          </Pressable>
        </View>

        {/* TAB 1: MEDIA CATALOG MANAGER */}
        {activeTab === 'media' ? (
          <View style={{ flex: 1 }}>
            
            {/* Search Bar & Filter Strip */}
            <View style={styles.searchFilterBlock}>
              <View style={[styles.searchBox, { backgroundColor: themeColors.backgroundCard, borderColor: themeColors.border }]}>
                <Search color={themeColors.textSecondary} size={16} />
                <TextInput
                  style={[styles.searchInput, { color: themeColors.text }]}
                  placeholder="Search catalog by title..."
                  placeholderTextColor={themeColors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')}>
                    <XCircle size={16} color={themeColors.textMuted} />
                  </Pressable>
                )}
              </View>

              {/* Category Filter Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategoryFilter === cat;
                  return (
                    <Pressable
                      key={cat}
                      style={[
                        styles.filterChip,
                        { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border },
                        isSelected && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
                      ]}
                      onPress={() => setSelectedCategoryFilter(cat)}
                    >
                      <Text style={[styles.filterChipText, { color: isSelected ? '#FFFFFF' : themeColors.textSecondary }]}>
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Catalog Subheader & Clear All */}
            <View style={styles.catalogHeaderRow}>
              <Text style={[styles.catalogSubTitle, { color: themeColors.textSecondary }]}>
                SHOWING {filteredAnimeList.length} OF {animeList.length} TITLES
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={handleBroadcastAnnouncement} style={[styles.clearBtn, { backgroundColor: 'rgba(3, 86, 197, 0.15)', paddingHorizontal: 10 }]}>
                  <Send color={themeColors.primary} size={12} />
                  <Text style={{ color: themeColors.primary, fontSize: 10, fontWeight: '800' }}>ANNOUNCE</Text>
                </Pressable>
                {animeList.length > 0 && (
                  <Pressable onPress={handleClearAll} style={styles.clearBtn}>
                    <Trash2 color="#EF4444" size={12} />
                    <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '800' }}>CLEAR ALL</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Media List */}
            <FlatList
              data={filteredAnimeList}
              keyExtractor={(item, index) => String(item?.id || index)}
              renderItem={renderItem}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={themeColors.primary}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <Film size={32} color={themeColors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No Titles Found</Text>
                  <Text style={[styles.emptySub, { color: themeColors.textSecondary }]}>
                    No titles match your filter. Tap + below to publish a new title!
                  </Text>
                </View>
              }
            />

            {/* + Add Media Floating Action Button */}
            <Pressable
              style={[styles.fab, { backgroundColor: themeColors.primary }]}
              onPress={() => router.push('/admin/add-anime' as any)}
              accessibilityRole="button"
              accessibilityLabel="Add new media title"
            >
              <Plus color="#FFFFFF" size={24} />
            </Pressable>
          </View>
        ) : (
          /* TAB 2: INSTANT VIP GRANT TOOL */
          <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
            <View style={[styles.vipToolCard, { backgroundColor: themeColors.backgroundCard, borderColor: '#FFB800' }]}>
              <View style={styles.vipToolHeader}>
                <View style={styles.vipIconCircle}>
                  <Crown size={20} color="#FFB800" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vipToolTitle}>Instant VIP Grant Service</Text>
                  <Text style={[styles.vipToolSub, { color: themeColors.textSecondary }]}>
                    Instantly provision VIP access to any registered user email.
                  </Text>
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: themeColors.text }]}>User Registered Email Address:</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border, color: themeColors.text }]}
                placeholder="e.g. streamer@gmail.com"
                placeholderTextColor={themeColors.textMuted}
                value={instantEmail}
                onChangeText={setInstantEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={[styles.inputLabel, { color: themeColors.text, marginTop: 10 }]}>Select Subscription Plan:</Text>
              <View style={styles.durationChipRow}>
                {[
                  { label: '1 Month (30d)', days: 30 },
                  { label: '3 Months (90d)', days: 90 },
                  { label: '6 Months (180d)', days: 180 },
                  { label: '1 Year (365d)', days: 365 },
                ].map((chip) => (
                  <Pressable
                    key={chip.days}
                    style={[
                      styles.durationChip,
                      { backgroundColor: themeColors.backgroundElement, borderColor: themeColors.border },
                      instantDays === chip.days && { backgroundColor: 'rgba(255, 184, 0, 0.15)', borderColor: '#FFB800' }
                    ]}
                    onPress={() => setInstantDays(chip.days)}
                  >
                    <Text style={[styles.durationChipText, { color: instantDays === chip.days ? '#FFB800' : themeColors.textSecondary }]}>
                      {chip.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={[styles.grantSubmitBtn, grantingVip && { opacity: 0.6 }]}
                onPress={handleInstantGrantVip}
                disabled={grantingVip}
              >
                {grantingVip ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.grantSubmitBtnInner}>
                    <UserCheck size={16} color="#FFFFFF" />
                    <Text style={styles.grantSubmitBtnText}>Activate VIP Membership</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </ScrollView>
        )}

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
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  adminBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  adminBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* RESTRICTED ACCESS */
  lockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  lockSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  loginAdminBtn: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
  },
  loginAdminText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  /* METRICS ROW */
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  metricsRowMobile: {
    gap: 6,
    paddingHorizontal: 10,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
  },

  /* SEGMENTED TABS */
  segmentedRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 10,
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 7,
    gap: 5,
  },
  segmentedTabActive: {
    borderWidth: 1,
  },
  segmentedText: {
    fontSize: 12,
    fontWeight: '800',
  },

  /* SEARCH & FILTER */
  searchFilterBlock: {
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  filterChipRow: {
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* CATALOG HEADER ROW */
  catalogHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginBottom: 8,
  },
  catalogSubTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingBottom: 90,
    gap: 8,
  },

  /* MEDIA ITEM CARD */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  cardThumbnail: {
    width: 42,
    height: 56,
    borderRadius: 6,
  },
  cardInfo: {
    flex: 1,
  },
  cardCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  catBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  catBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
  },
  featuredBadgeText: {
    color: '#FFB800',
    fontSize: 8,
    fontWeight: '900',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  cardMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 7,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },

  /* INSTANT VIP TOOL CARD */
  vipToolCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  vipToolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  vipIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipToolTitle: {
    color: '#FFB800',
    fontSize: 15,
    fontWeight: '900',
  },
  vipToolSub: {
    fontSize: 11,
    marginTop: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  durationChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  durationChip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
  },
  durationChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  grantSubmitBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  grantSubmitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  grantSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
