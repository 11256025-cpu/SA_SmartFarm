/*
 * frontend/app/(auth)/_layout.tsx - 驗證相關頁面的路由佈局。
 * 定義了登入和註冊頁面的堆疊導覽 (Stack Navigation) 設定。
 */
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, router } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';

export default function AuthLayout() {
  return (
    // 使用 Stack 佈局來管理驗證頁面的跳轉
    <Stack screenOptions={{
      // 設定標題列的背景顏色和文字顏色
      headerStyle: { backgroundColor: Colors.dark.background },
      headerTintColor: Colors.dark.tint,
      headerShadowVisible: false,
      // 自訂返回按鈕，點擊時會返回上一頁
      headerLeft: () => (
        <Pressable onPress={() => router.back()}>
          <FontAwesome name="chevron-left" size={20} color={Colors.dark.text} />
        </Pressable>
      ),
    }}>
      {/* 註冊這兩個畫面但不顯示原生的標題列 (headerShown: false)，因為頁面內已經有自訂的標題 */}
      <Stack.Screen name="login" options={{ title: '登入', headerShown: false }} />
      <Stack.Screen name="register" options={{ title: '註冊', headerShown: false }} />
    </Stack>
  );
}