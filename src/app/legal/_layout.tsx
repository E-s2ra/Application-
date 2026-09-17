import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function LegalLayout() {
  const themeColors = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="privacy-policy" />
      <Stack.Screen name="terms-of-service" />
      <Stack.Screen name="dmca" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
