// app/(auth)/login.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// 💡 引入 FontAwesome 來做眼球圖標
import { FontAwesome } from '@expo/vector-icons';

const BASE_URL = 'http://localhost:3000';

export default function LoginScreen() {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  
  // 錯誤狀態提示
  const [accountError, setAccountError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // 💡 新增控制密碼是否可見的狀態（預設 false 代表隱藏、呈現星號）
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // 建立密碼輸入框的錨點
  const passwordInputRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    setAccountError('');
    setPasswordError('');

    const trimmedAccount = account.trim();
    const trimmedPassword = password.trim();
    if (!trimmedAccount || !trimmedPassword) {
      alert("請輸入帳號與密碼！");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: trimmedAccount,
          password: trimmedPassword
        })
      });

      const data = await response.json();
      console.log('login response', response.status, data);

      if (data.success) {
        const userId = data.user?.user_id ?? data.user?.id ?? null;

        if (userId) {
          try {
            await AsyncStorage.setItem('userId', String(userId));
            if (data.user?.nickname) await AsyncStorage.setItem('userName', data.user.nickname);
            if (data.user?.account) await AsyncStorage.setItem('loginAccount', data.user.account);
            if (data.user?.avatar) await AsyncStorage.setItem('avatarUri', data.user.avatar);
          } catch (e) {
            console.warn('無法儲存 userId 到 AsyncStorage', e);
          }
        }

        if (userId) {
          try {
            const resp = await fetch(`${BASE_URL}/api/alerts/settings?userId=${userId}`);
            const settingsData = await resp.json();
            if (settingsData.success && settingsData.settings) {
              const s = settingsData.settings;
              const temp = s.tempRange ? s.tempRange.join(', ') : '無';
              const humid = s.humidRange ? s.humidRange.join(', ') : '無';
              const co2 = s.co2Range ? s.co2Range.join(', ') : '無';
              alert(`✅ 登入成功！\n上次儲存的設定：\n溫度: [${temp}]\n濕度: [${humid}]\nCO2: [${co2}]`);
            } else {
              alert('✅ 登入成功！\n使用者尚未有先前的設定。');
            }
          } catch (err) {
            console.warn('取得上次設定失敗：', err);
            alert('✅ 登入成功！\n但無法取得上次設定（請稍後再試）');
          }
        } else {
          alert('✅ 登入成功！');
        }

        router.replace('/environment');
      } else {
        const msg = data.message || '';
        if (
          msg.includes('查無') || 
          msg.includes('不存在') || 
          msg.includes('找不到') || 
          msg.toLowerCase().includes('not found') ||
          msg.toLowerCase().includes('exist')
        ) {
          setAccountError("此帳號不存在"); 
        } else {
          setPasswordError("密碼輸入錯誤"); 
        }
      }
    } catch (error) {
      console.error("連線錯誤:", error);
      setPasswordError("無法連線到伺服器，請確認後端已啟動！");
    }
  };

  const handleAccountChange = (text: string) => {
    setAccount(text);
    if (accountError) setAccountError('');
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) setPasswordError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
          
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
                onChangeText={handleAccountChange} 
                keyboardType="default"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
              {accountError ? (
                <Text style={styles.errorText}>{accountError}</Text>
              ) : null}
            </View>

            {/* 密碼輸入框 */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>密碼</Text>
              
              {/* 💡 這裡將密碼輸入框與眼球按鈕包在一起，使其方便做相對定位 */}
              <View style={styles.passwordWrapper}>
                <TextInput
                  ref={passwordInputRef} 
                  style={[styles.input, styles.passwordInputSpecial]} // 額外擴充右邊留白防止文字跟眼球重疊
                  placeholder="請輸入您的密碼"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={handlePasswordChange} 
                  secureTextEntry={!isPasswordVisible} // 💡 動態切換顯示或隱藏
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                
                {/* 💡 核心新增：顯示/隱藏密碼的眼球圖標按鈕 */}
                <TouchableOpacity 
                  style={styles.eyeIconContainer} 
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  activeOpacity={0.6}
                >
                  <FontAwesome 
                    name={isPasswordVisible ? "eye" : "eye-slash"} 
                    size={20} 
                    color="#999999" 
                  />
                </TouchableOpacity>
              </View>
              
              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}
            </View>

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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 450,
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
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#DDDDDD',
    marginBottom: 8,
    fontWeight: '600',
  },
  // 💡 新增：包裹密碼輸入框與眼球的容器
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
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
    width: '100%',
  },
  // 💡 新增：密碼輸入框右側多預留一點寬度，避免輸入很長時字體穿透到眼球底下
  passwordInputSpecial: {
    paddingRight: 50, 
  },
  // 💡 新增：眼球按鈕的定位控制（靠右居中）
  eyeIconContainer: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4, 
  },
  errorText: {
    color: '#FF6B6B', 
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    paddingLeft: 4,
  },
  button: {
    backgroundColor: '#5A8B73', 
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
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