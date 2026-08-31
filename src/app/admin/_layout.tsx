import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout() {
  const themeColors = useTheme();
  const { profile, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && profile?.role !== 'admin') {
      router.replace('/(tabs)');
    }
  }, [profile, isLoading, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add-anime" />
      <Stack.Screen name="edit-anime" />
    </Stack>
  );
}
