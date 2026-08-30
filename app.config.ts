import type { ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext) => ({
  ...config,
  extra: {
    ...(config.extra ?? {}),
    supabaseUrl:
      process.env.EXPO_PUBLIC_SUPABASE_URL ?? config.extra?.supabaseUrl,
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      config.extra?.supabaseAnonKey,
  },
});