import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function AdminLayout() {
  const themeColors = useTheme();

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
