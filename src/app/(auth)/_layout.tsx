import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function AuthLayout() {
  const themeColors = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: themeColors.backgroundElement,
        },
        headerTintColor: themeColors.text,
        contentStyle: { backgroundColor: themeColors.background },
      }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ title: 'Create Account', headerBackTitle: 'Back' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset Password', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
