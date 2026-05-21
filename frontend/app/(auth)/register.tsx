// app/(auth)/register.tsx
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RegisterScreen() {
  const [nickname, setNickname] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    if (!nickname || !account || !password || !confirmPassword) {
      alert('請填寫完整資訊！');
      return;
    }
    if (password !== confirmPassword) {
      alert('兩次密碼輸入不一致！');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: nickname,
          username: account, // 後端 API 需要的參數名稱為 username
          password: password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ 註冊成功！請重新登入。');
        router.replace('/(auth)/login');
      } else {
        alert('❌ 註冊失敗：' + data.message);
      }
    } catch (error) {
      console.error('連線錯誤:', error);
      alert('無法連線到伺服器，請確認後端已啟動！');
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
            {/* 標題區塊 */}
            <View style={styles.header}>
              <Text style={styles.title}>建立帳號</Text>
              <Text style={styles.subtitle}>請填寫以下資訊以註冊您的智慧農場</Text>
            </View>
            
            {/* 表單區塊 */}
            <View style={styles.form}>
              {/* 兩列佈局 */}
              <View style={styles.row}>
                <View style={styles.column}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>暱稱</Text>
                    <TextInput style={styles.input} placeholder="請輸入暱稱" placeholderTextColor="#666" value={nickname} onChangeText={setNickname} />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>帳號</Text>
                    <TextInput style={styles.input} placeholder="請輸入帳號" placeholderTextColor="#666" value={account} onChangeText={setAccount} autoCapitalize="none" />
                  </View>
                </View>
                <View style={styles.column}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>密碼</Text>
                    <TextInput style={styles.input} placeholder="請輸入密碼" placeholderTextColor="#666" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>再次輸入密碼</Text>
                    <TextInput style={styles.input} placeholder="確認密碼" placeholderTextColor="#666" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" />
                  </View>
                </View>
              </View>

              {/* 註冊按鈕 */}
              <TouchableOpacity style={styles.button} onPress={handleRegister}>
                <Text style={styles.buttonText}>註冊</Text>
              </TouchableOpacity>

              {/* 切換到登入頁面 */}
              <TouchableOpacity 
                onPress={() => router.replace('/(auth)/login')}
                style={styles.switchButton}
              >
                <Text style={styles.switchText}>已經有帳號？立即登入</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151718', // 與登入頁相同的深色底色
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 550, // 註冊畫面有兩欄並排，比登入的 450 稍寬一點
    alignSelf: 'center',
    backgroundColor: '#1E2124', // 稍微亮一點的深灰色，營造卡片立體感
    padding: 32,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    width: '48%', // 兩列，中間預留間距
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
  },
  button: {
    backgroundColor: '#5A8B73', // 搭配智慧農場的綠色系
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#5A8B73',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#5A8B73',
    fontSize: 14,
    fontWeight: '600',
  },
});