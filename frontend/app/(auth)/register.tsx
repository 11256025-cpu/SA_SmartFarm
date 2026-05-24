// app/(auth)/register.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState, useRef } from 'react'; // 💡 引入 useRef
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RegisterScreen() {
  const [nickname, setNickname] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 💡 為輸入框建立 Ref 控制焦點
  const accountRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

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
      // 💡 注意：如果你是用實體手機測試，要把 localhost 改成你電腦的局域網 IP (例如 192.168.x.x)
      const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: nickname,
          username: account,
          password: password,
          confirmPassword: confirmPassword, // 💡 傳送給優化後的後端做二次驗證
        }),
      });

      const data = await response.json();

      if (data.success) {
        const userId = data.user?.id;
        
        if (userId) {
          await AsyncStorage.setItem('userId', String(userId));
          await AsyncStorage.setItem('userName', nickname);
          await AsyncStorage.setItem('loginAccount', account);
        }

        alert('✅ 註冊成功！已為您自動登入。');
        router.replace('/environment');
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
                {/* 左側欄位 */}
                <View style={styles.column}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>暱稱</Text>
                    <TextInput 
                      style={styles.input} 
                      placeholder="請輸入暱稱" 
                      placeholderTextColor="#666" 
                      value={nickname} 
                      onChangeText={setNickname}
                      returnKeyType="next"
                      onSubmitEditing={() => accountRef.current?.focus()} // 跳到 帳號
                      blurOnSubmit={false}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>帳號</Text>
                    <TextInput 
                      ref={accountRef} // 💡 綁定 ref
                      style={styles.input} 
                      placeholder="請輸入帳號" 
                      placeholderTextColor="#666" 
                      value={account} 
                      onChangeText={setAccount} 
                      autoCapitalize="none"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()} // 跳到 密碼
                      blurOnSubmit={false}
                    />
                  </View>
                </View>

                {/* 右側欄位 */}
                <View style={styles.column}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>密碼</Text>
                    <TextInput 
                      ref={passwordRef} // 💡 綁定 ref
                      style={styles.input} 
                      placeholder="請輸入密碼" 
                      placeholderTextColor="#666" 
                      value={password} 
                      onChangeText={setPassword} 
                      secureTextEntry 
                      autoCapitalize="none"
                      returnKeyType="next"
                      onSubmitEditing={() => confirmPasswordRef.current?.focus()} // 跳到 確認密碼
                      blurOnSubmit={false}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>再次輸入密碼</Text>
                    <TextInput 
                      ref={confirmPasswordRef} // 💡 綁定 ref
                      style={styles.input} 
                      placeholder="確認密碼" 
                      placeholderTextColor="#666" 
                      value={confirmPassword} 
                      onChangeText={setConfirmPassword} 
                      secureTextEntry 
                      autoCapitalize="none"
                      returnKeyType="done" // 最後一個顯示「完成」
                      onSubmitEditing={handleRegister} // 按下直接送出註冊
                    />
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
    backgroundColor: '#151718',
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
    maxWidth: 550,
    alignSelf: 'center',
    backgroundColor: '#1E2124',
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
    width: '48%',
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
    backgroundColor: '#5A8B73',
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