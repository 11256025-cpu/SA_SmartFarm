// app/(auth)/register.tsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { AuthInput } from '@/components/AuthInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';

export default function RegisterScreen() {
  const [nickname, setNickname] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    if (!nickname || !account || !password) {
      alert("請填寫所有欄位！");
      return;
    }
    if (password !== confirmPassword) {
      alert("兩次輸入的密碼不一致！");
      return;
    }

    try {
      // 這裡直接使用 localhost
      const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: nickname,
          username: account, // 將前端的 account 轉成後端要的 username
          password: password
        })
      });

      const data = await response.json();

      if (data.success) {
        alert("🎉 註冊成功！請登入");
        router.replace('/(auth)/login'); 
      } else {
        alert("❌ 註冊失敗：" + data.message);
      }
    } catch (error) {
      console.error("連線錯誤:", error);
      alert("無法連線到伺服器，請確認後端已啟動！");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>註冊帳號</Text>
            
            {/* 兩列佈局實作 */}
            <View style={styles.row}>
              <View style={styles.column}>
                <AuthInput label="暱稱" required value={nickname} onChangeText={setNickname} placeholder="請輸入暱稱" />
                <AuthInput label="帳號" required value={account} onChangeText={setAccount} placeholder="請輸入帳號" />
              </View>
              <View style={styles.column}>
                <AuthInput label="密碼" required value={password} onChangeText={setPassword} placeholder="請輸入密碼" secureTextEntry />
                <AuthInput label="再次輸入密碼" required value={confirmPassword} onChangeText={setConfirmPassword} placeholder="確認密碼" secureTextEntry />
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <PrimaryButton 
                title="確認" 
                onPress={handleRegister}
                containerStyle={styles.confirmButton}
              />
            </View>

            <View style={styles.footerLinkContainer}>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.footerLinkText}>返回登入帳號</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* 左下角系統標題 */}
          <Text style={styles.systemTitle}>智慧農場管理系統</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 30,
    paddingBottom: 100, // 預留給底部的標題空間
  },
  card: {
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: 20,
    padding: 30,
    width: '100%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 25,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    width: '48%', // 兩列，中間預留間距
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  confirmButton: {
    width: '60%',
  },
  footerLinkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerLinkText: {
    color: '#3498DB',
    fontSize: 14,
  },
  systemTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 30,
    left: 30,
  },
});