import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'AniFlix',
  slug: config.slug ?? 'aniflix',
  plugins: [...(config.plugins ?? []), 'expo-web-browser', 'expo-image'],
  extra: {
    ...(config.extra ?? {}),
    // ── Supabase ──────────────────────────────────────────────────────────────
    // Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your
    // .env file (local) or EAS Secrets (CI/production). Never hard-code these.
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabasePublishableKey:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      '',

    // ── Google AdMob ──────────────────────────────────────────────────────────
    // Set all four ADMOB env vars in your .env / EAS Secrets.
    admob: {
      android: {
        appId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ?? '',
        bannerId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID ?? '',
        rewardedId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID ?? '',
      },
      ios: {
        appId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ?? '',
        bannerId: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID ?? '',
        rewardedId: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID ?? '',
      },
    },
  },
});
