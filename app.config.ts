import appJson from './app.json';

const baseConfig = appJson.expo;

// Use hosted Supabase by default. A local self-hosted Supabase environment can
// override these two public values through .env.docker without source changes.
export default () => ({
  ...baseConfig,
  extra: {
    ...baseConfig.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || baseConfig.extra.supabaseUrl,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || baseConfig.extra.supabaseAnonKey,
  },
});
