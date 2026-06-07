/*
 * frontend/app/_layout.tsx - Expo Router 根佈局，定義全域頁面外框與共用樣式。
 */

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { NotificationProvider } from '../components/NotificationProvider';

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NotificationProvider>
        <Stack>
          {/* 首頁 */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          {/* 驗證分組 */}
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          {/* 頁籤分組 */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* 環境頁面 */}
          <Stack.Screen name="environment" options={{ headerShown: false }} />
          {/* 警示頁面 */}
          <Stack.Screen name="alerts" options={{ headerShown: false }} />
          {/* 作物頁面 */}
          <Stack.Screen name="crops" options={{ headerShown: false }} />
          {/* 報表頁面 */}
          <Stack.Screen name="reports" options={{ headerShown: false }} />
          {/* 個人資料頁面 */}
          <Stack.Screen name="profile" options={{ headerShown: false }} />
        </Stack>
      </NotificationProvider>
    </ThemeProvider>
  );
}