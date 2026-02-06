import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(auth)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthGate />
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="health-onboarding"
              options={{
                headerShown: false,
                title: 'Health Setup',
              }}
            />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </AuthProvider>
  );
}

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'health-onboarding';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (user && needsOnboarding === null) {
      return;
    }

    if (user && needsOnboarding && !inOnboarding) {
      router.replace('/health-onboarding');
      return;
    }

    if (user && inAuthGroup) {
      router.replace(needsOnboarding ? '/health-onboarding' : '/');
    }
  }, [isLoading, needsOnboarding, router, segments, user]);

  useEffect(() => {
    let isMounted = true;

    const checkOnboarding = async () => {
      if (!user?.id) {
        if (isMounted) setNeedsOnboarding(null);
        return;
      }

      if (isMounted) setNeedsOnboarding(null);

      const { data } = await supabase
        .from('health')
        .select('date_of_birth, blood_group, height_cm, weight_kg')
        .eq('user_id', user.id)
        .maybeSingle();

      const isComplete =
        !!data?.date_of_birth && !!data?.blood_group && !!data?.height_cm && !!data?.weight_kg;

      if (isMounted) {
        setNeedsOnboarding(!isComplete);
      }
    };

    checkOnboarding();

    return () => {
      isMounted = false;
    };
  }, [segments, user?.id]);

  return null;
}
