// app/(auth)/_layout.tsx
import Colors from '@/constants/Colors';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, router } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: Colors.dark.background },
      headerTintColor: Colors.dark.tint,
      headerShadowVisible: false,
      headerLeft: () => (
        <Pressable onPress={() => router.back()}>
          <FontAwesome name="chevron-left" size={20} color={Colors.dark.text} />
        </Pressable>
      ),
    }}>
      <Stack.Screen name="login" options={{ title: '登入', headerShown: false }} />
      <Stack.Screen name="register" options={{ title: '註冊', headerShown: false }} />
    </Stack>
  );
}