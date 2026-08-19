import { StyleSheet, View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { LogOut, User as UserIcon, Shield, Heart, Sparkles, Tv, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';

export default function ProfileScreen() {
  const router = useRouter();
  const themeColors = Colors.dark;
  const { user, profile, signOut, isLoading } = useAuth();
  const { favorites } = useFavorites();

  const handleLogout = async () => {
    await signOut();
  };

  const handleAdminPanel = () => {
    router.push('/admin' as any);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* 👤 Profile Hero Card */}
      <View style={styles.header}>
        <View style={[styles.avatarGlow, { borderColor: isAdmin ? themeColors.primary : '#242436' }]}>
          <View style={[styles.avatar, { backgroundColor: themeColors.backgroundCard }]}>
            <UserIcon color={isAdmin ? themeColors.primary : '#fff'} size={44} />
          </View>
        </View>

        <Text style={[styles.name, { color: themeColors.text }]}>
          {profile?.full_name ?? user?.email?.split('@')[0] ?? 'Anime Streamer'}
        </Text>
        <Text style={[styles.email, { color: themeColors.textSecondary }]}>
          {user?.email}
        </Text>

        <View
          style={[
            styles.roleBadge,
            { backgroundColor: isAdmin ? themeColors.primary : themeColors.backgroundCard },
          ]}
        >
          {isAdmin ? (
            <Sparkles color="#fff" size={14} />
          ) : (
            <Tv color={themeColors.accentCyan} size={14} />
          )}
          <Text style={styles.roleText}>
            {isAdmin ? 'PLATFORM ADMIN' : 'PREMIUM MEMBER'}
          </Text>
        </View>
      </View>

      {/* 📊 User Stats Row */}
      <View style={styles.statsRow}>
        <Pressable
          style={[styles.statBox, { backgroundColor: themeColors.backgroundCard }]}
          onPress={() => router.push('/(tabs)/favorites' as any)}
        >
          <Text style={[styles.statNumber, { color: themeColors.primary }]}>{favorites.length}</Text>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>My Favorites</Text>
        </Pressable>
        <View style={[styles.statBox, { backgroundColor: themeColors.backgroundCard }]}>
          <Text style={[styles.statNumber, { color: '#00D2FF' }]}>4K</Text>
          <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Ultra HD Tier</Text>
        </View>
      </View>

      {/* ⚙️ Actions List */}
      <View style={styles.actionsSection}>
        {/* Admin Panel Button (Admin only) */}
        {isAdmin && (
          <Pressable
            style={[styles.adminBanner, { backgroundColor: themeColors.primary }]}
            onPress={handleAdminPanel}
          >
            <View style={styles.adminBannerLeft}>
              <Shield color="#fff" size={24} />
              <View>
                <Text style={styles.adminBannerTitle}>Admin Control Center</Text>
                <Text style={styles.adminBannerSub}>Publish, manage & feature anime</Text>
              </View>
            </View>
            <ChevronRight color="#fff" size={20} />
          </Pressable>
        )}

        {/* My Favorites Link */}
        <Pressable
          style={[styles.actionRow, { backgroundColor: themeColors.backgroundCard }]}
          onPress={() => router.push('/(tabs)/favorites' as any)}
        >
          <View style={styles.actionRowLeft}>
            <View style={[styles.iconCircle, { backgroundColor: '#33080A' }]}>
              <Heart color={themeColors.primary} size={18} fill={themeColors.primary} />
            </View>
            <Text style={[styles.actionRowText, { color: themeColors.text }]}>My Favorites List</Text>
          </View>
          <ChevronRight color={themeColors.textSecondary} size={18} />
        </Pressable>

        {/* Sign Out Button */}
        <Pressable
          style={[styles.actionRow, { backgroundColor: themeColors.backgroundCard }]}
          onPress={handleLogout}
        >
          <View style={styles.actionRowLeft}>
            <View style={[styles.iconCircle, { backgroundColor: '#20202E' }]}>
              <LogOut color="#ff4444" size={18} />
            </View>
            <Text style={[styles.actionRowText, { color: '#ff6666' }]}>Sign Out</Text>
          </View>
          <ChevronRight color={themeColors.textSecondary} size={18} />
        </Pressable>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  avatarGlow: {
    padding: 4,
    borderRadius: 56,
    borderWidth: 2,
    marginBottom: 14,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
  },
  email: {
    fontSize: 13,
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  roleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242436',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  actionsSection: {
    paddingHorizontal: 16,
    gap: 12,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    marginBottom: 4,
    boxShadow: '0px 4px 10px rgba(229, 9, 20, 0.4)',
  },
  adminBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminBannerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  adminBannerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242436',
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRowText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
