import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function AuthLayout() {
  const themeColors = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.background },
      }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
