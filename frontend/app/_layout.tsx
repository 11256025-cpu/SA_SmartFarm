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

// 在字體等資源尚未載入完成前，防止啟動畫面 (Splash Screen) 自動隱藏。
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // 載入應用程式所需的字體 (例如 FontAwesome 圖標字體)
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  // 如果載入字體發生錯誤，將錯誤拋出以便 ErrorBoundary 捕捉
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // 當所有資源載入完成後，隱藏啟動畫面
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // 如果資源尚未載入完成，回傳 null 以保持啟動畫面顯示
  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  // 取得裝置當前的顏色主題 (深色或淺色模式)
  const colorScheme = useColorScheme();

  return (
    // 根據系統主題套用對應的導覽主題設定
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* 包裹通知上下文 Provider，讓整個 APP 都能使用推播通知功能 */}
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