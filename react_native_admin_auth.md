# React Native (Expo) Secure Admin Panel with Google Auth

Here is the complete step-by-step guide, folder structure, and TypeScript code to implement a secure Admin Panel in your React Native app using Supabase Google Auth and "Invisible Security".

## 1. Prerequisites & Setup

Since you are using self-hosted Supabase and React Native, you need a few packages to handle OAuth redirects properly.

```bash
npx expo install @supabase/supabase-js expo-auth-session expo-crypto expo-linking expo-web-browser
```

**Environment Variables (`.env`):**
Create a `.env` file at the root of your project:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_ADMIN_EMAIL=your_admin_email@example.com
```

*(Note: You must also configure the Google Provider in your self-hosted Supabase dashboard by adding your Google Cloud Client ID and Secret).*

## 2. Folder Structure (Expo Router)

```text
src/
├── app/
│   ├── _layout.tsx           # Global layout & Auth Provider wrapper
│   ├── login.tsx             # Login screen with Google Auth
│   ├── +not-found.tsx        # Fallback 404 screen
│   └── admin/
│       ├── _layout.tsx       # Protected Admin Route (Invisible Security)
│       └── index.tsx         # Admin Dashboard
├── hooks/
│   └── useAuth.tsx           # Auth Context & Supabase logic
└── lib/
    └── supabase.ts           # Supabase client initialization
```

## 3. Complete TypeScript Code

### `src/lib/supabase.ts`
```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### `src/hooks/useAuth.tsx`
```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';

// Handle redirect after Google Auth finishes
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null | undefined;
}

const AuthContext = createContext<AuthContextType>({ session: undefined });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### `src/app/+not-found.tsx`
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>404 - Not Found</Text>
        <Text style={styles.subtitle}>{"This screen doesn't exist."}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 10 },
});
```

### `src/app/admin/_layout.tsx` (Invisible Security Rule)
```tsx
import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import NotFoundScreen from '../+not-found';
import { ActivityIndicator, View } from 'react-native';

export default function AdminLayout() {
  const { session } = useAuth();
  const adminEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL;

  // 1. Show nothing while checking auth state
  if (session === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 2. Invisible Security: If not logged in, OR email doesn't match, render 404 directly.
  if (!session || session.user.email !== adminEmail) {
    return <NotFoundScreen />;
  }

  // 3. Authorized Admin
  return <Stack />;
}
```

### `src/app/admin/index.tsx`
```tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function AdminDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure Admin Panel</Text>
      <Text style={styles.subtitle}>Welcome! You have authorized access.</Text>
      
      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { marginTop: 10, color: '#666' },
  button: { marginTop: 30, backgroundColor: '#EF4444', padding: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});
```

### `src/app/login.tsx`
```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

export default function LoginScreen() {
  const handleGoogleLogin = async () => {
    // Generate a secure redirect URI for your Expo app
    const redirectUrl = makeRedirectUri();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error('Google Auth Error:', error.message);
      return;
    }

    if (data?.url) {
      // Open the Google login page in the mobile browser
      await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Access</Text>
      <Pressable style={styles.button} onPress={handleGoogleLogin}>
        <Text style={styles.buttonText}>Sign in with Google</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 40 },
  button: { backgroundColor: '#4285F4', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
```

---

## How to Login to your Admin Account

1. In your `.env` file, ensure `EXPO_PUBLIC_ADMIN_EMAIL` is set to your actual Google email address (e.g., `esra99san@example.com`).
2. Open the app and navigate to the **Login Screen**.
3. Tap the **"Sign in with Google"** button.
4. Your phone's browser will open. Select the Google Account that matches the email you set in step 1.
5. The browser will seamlessly redirect you back to the app. 
6. Navigate to `/admin`. Because your authenticated Google email matches the environment variable, the app will let you right in. (If anyone else tries this, they will just see the "404 - Not Found" screen!).
