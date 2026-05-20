// app/(auth)/login.tsx
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('test'); // 測試模式預設密碼

  const handleLogin = async () => {
    if (!account) {
      alert("請輸入帳號！");
      return;
    }

    try {
      // 這裡直接使用 localhost
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: account, // 將前端的 account 轉成後端要的 username
          password: password
        })
      });

      const data = await response.json();

      if (data.success) {
        alert("✅ 登入成功！");
        router.replace('/environment');
      } else {
        alert("❌ 登入失敗：" + data.message);
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
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          {/* 標題區塊 */}
          <View style={styles.header}>
            <Text style={styles.title}>歡迎回來</Text>
            <Text style={styles.subtitle}>請登入以管理您的智慧農場</Text>
          </View>

          {/* 表單區塊 */}
          <View style={styles.form}>
            {/* 帳號輸入框 */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>帳號</Text>
              <TextInput
                style={styles.input}
                placeholder="請輸入您的帳號"
                placeholderTextColor="#666"
                value={account}
                onChangeText={setAccount}
                keyboardType="default"
                autoCapitalize="none"
                
                // 💡 加上這兩行：按 Enter 自動跳到密碼欄位
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>

            {/* 密碼輸入框 (測試模式已註解，預設使用密碼 test) */}
            {false && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>密碼</Text>
                <TextInput
                  style={styles.input}
                  placeholder="請輸入您的密碼"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* 登入按鈕 */}
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>登入</Text>
            </TouchableOpacity>

            {/* 切換到註冊頁面 */}
            <TouchableOpacity 
              onPress={() => router.push('/(auth)/register')}
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>還沒有帳號？立即註冊</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151718', // 與首頁相同的深色底色
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999999',
  },
  form: {
    width: '100%',
    maxWidth: 420,        // 💡 限制表單最大寬度，網頁版就不會肥肥的
    alignSelf: 'center',   // 💡 讓表單在畫面上靠中對齊
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#DDDDDD',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#22252A',
    color: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#33373E',
    ...Platform.select({ web: { cursor: 'text' } as any }), // 💡 讓網頁游標變輸入型
  },
  button: {
    backgroundColor: '#5A8B73', // 搭配智慧農場的綠色系
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#5A8B73',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    ...Platform.select({ web: { cursor: 'pointer' } as any }), // 💡 讓網頁按鈕有滑鼠小手
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } as any }), // 💡 讓超連結也有滑鼠小手
  },
  switchText: {
    color: '#5A8B73',
    fontSize: 14,
    fontWeight: '600',
  },
});