import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'AniFlix',
  slug: config.slug ?? 'aniflix',
  extra: {
    ...(config.extra ?? {}),
    // ── Supabase ──────────────────────────────────────────────────────────────
    // Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your
    // .env file (local) or EAS Secrets (CI/production). Never hard-code these.
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',

    // ── Admin ─────────────────────────────────────────────────────────────────
    // Set EXPO_PUBLIC_ADMIN_EMAIL in your .env / EAS Secrets.
    adminEmail: process.env.EXPO_PUBLIC_ADMIN_EMAIL ?? '',

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