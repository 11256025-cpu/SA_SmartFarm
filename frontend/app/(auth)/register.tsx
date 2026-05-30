// app/(auth)/register.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// 💡 引入 FontAwesome 來做眼球圖標
import { FontAwesome } from '@expo/vector-icons';

const BASE_URL = 'http://localhost:3000';

export default function RegisterScreen() {
  const [nickname, setNickname] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 💡 新增：控制「密碼」與「確認密碼」是否可見的獨立狀態（預設 false 為隱藏）
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  // 為輸入框建立 Ref 控制焦點
  const accountRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const handleRegister = async () => {
    // 💡 1. 加入 .trim() 濾除前後多餘的空白，避免使用者不小心輸入空白被誤判為有值
    const trimmedNickname = nickname.trim();
    const trimmedAccount = account.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNickname || !trimmedAccount || !trimmedPassword || !trimmedConfirm) {
      alert('【前端檢查】請確認所有欄位都有輸入字元！');
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      alert('兩次密碼輸入不一致！');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account: trimmedAccount, // 💡 2. 確保兼容後端可能預期的 account 欄位
          username: trimmedAccount,
          password: trimmedPassword,
          confirmPassword: trimmedConfirm, // 💡 新增：很多後端會在 API 裡也要求檢查確認密碼
          nickname: trimmedNickname,
          name: trimmedNickname,   // 💡 新增：有些後端資料庫欄位可能叫 name
          email: `${trimmedAccount}@example.com`, // 💡 新增：有些後端框架預設需要 email
          phone: '0900000000', // 💡 新增：預防後端要求電話欄位
          avatar: 'default.png' // 💡 修正：空字串 '' 在 NodeJS 裡會被 !avatar 誤判為「沒填」，改給預設字串
        }),
      });

      // 💡 先以純文字讀取，避免後端回傳 HTML (例如 404 Cannot POST) 導致 JSON.parse 壞掉
      const textResponse = await response.text();
      try {
        const data = JSON.parse(textResponse);
        if (data.success) {
          try {
            // 儲存使用者識別到 AsyncStorage，讓 app 之後的請求都帶上 userId
            if (data.user?.id) await AsyncStorage.setItem('userId', String(data.user.id));
            if (data.user?.nickname) await AsyncStorage.setItem('userName', data.user.nickname);
            if (data.user?.account) await AsyncStorage.setItem('loginAccount', data.user.account);
            if (data.user?.avatar) await AsyncStorage.setItem('avatarUri', data.user.avatar);
          } catch (e) {
            console.warn('無法將 userId 儲存到 AsyncStorage', e);
          }
          alert('🎉 註冊成功，已自動登入！');
          router.replace('/environment');
        } else {
          // 💡 標示為後端回傳，方便釐清是哪邊擋下的
          alert(`【後端拒絕】${data.message || '註冊失敗'}`);
        }
      } catch (parseError) {
        console.error("後端回傳的非 JSON 內容:", textResponse);
        alert(`【伺服器錯誤 ${response.status}】\n請檢查後端是否有 /api/register 這個路由！`);
      }
    } catch (error) {
      console.error(error);
      alert('【連線失敗】無法連線。\n若使用實體手機測試，請將 BASE_URL 替換為電腦的區域網路 IP (如 192.168.X.X)。');
    }
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
              <Text style={styles.title}>建立新帳號</Text>
              <Text style={styles.subtitle}>加入智慧農場管理系統</Text>
            </View>

            {/* 表單區塊 */}
            <View style={styles.form}>
              
              {/* 第一排：暱稱 與 帳號 */}
              <View style={styles.row}>
                <View style={styles.column}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>暱稱</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="如何稱呼您"
                      placeholderTextColor="#666"
                      value={nickname}
                      onChangeText={setNickname}
                      returnKeyType="next"
                      onSubmitEditing={() => accountRef.current?.focus()}
                    />
                  </View>
                </View>

                <View style={styles.column}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>帳號</Text>
                    <TextInput
                      ref={accountRef}
                      style={styles.input}
                      placeholder="設定登入帳號"
                      placeholderTextColor="#666"
                      value={account}
                      onChangeText={setAccount}
                      autoCapitalize="none"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                  </View>
                </View>
              </View>

              {/* 第二排：密碼 與 確認密碼 (皆帶有眼球切換功能) */}
              <View style={styles.row}>
                <View style={styles.column}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>密碼</Text>
                    {/* 💡 密碼欄位外層包裹 */}
                    <View style={styles.passwordWrapper}>
                      <TextInput
                        ref={passwordRef}
                        style={[styles.input, styles.passwordInputSpecial]} // 右側內縮
                        placeholder="請輸入密碼"
                        placeholderTextColor="#666"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!isPasswordVisible} // 💡 切換星號或明文
                        autoCapitalize="none"
                        returnKeyType="next"
                        onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                      />
                      {/* 💡 密碼眼球按鈕 */}
                      <TouchableOpacity
                        style={styles.eyeIconContainer}
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                        activeOpacity={0.6}
                      >
                        <FontAwesome
                          name={isPasswordVisible ? 'eye' : 'eye-slash'}
                          size={18}
                          color="#999999"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.column}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>確認密碼</Text>
                    {/* 💡 確認密碼欄位外層包裹 */}
                    <View style={styles.passwordWrapper}>
                      <TextInput
                        ref={confirmPasswordRef}
                        style={[styles.input, styles.passwordInputSpecial]} // 右側內縮
                        placeholder="再次輸入密碼"
                        placeholderTextColor="#666"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!isConfirmPasswordVisible} // 💡 切換星號或明文
                        autoCapitalize="none"
                        returnKeyType="done"
                        onSubmitEditing={handleRegister}
                      />
                      {/* 💡 確認密碼眼球按鈕 */}
                      <TouchableOpacity
                        style={styles.eyeIconContainer}
                        onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                        activeOpacity={0.6}
                      >
                        <FontAwesome
                          name={isConfirmPasswordVisible ? 'eye' : 'eye-slash'}
                          size={18}
                          color="#999999"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* 註冊按鈕 */}
              <TouchableOpacity style={styles.button} onPress={handleRegister}>
                <Text style={styles.buttonText}>建立帳號</Text>
              </TouchableOpacity>

              {/* 返回登入 */}
              <TouchableOpacity 
                onPress={() => router.replace('/(auth)/login')}
                style={styles.switchButton}
              >
                <Text style={styles.switchText}>已有帳號？返回登入</Text>
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
  // 💡 新增：相對定位包裹容器，用來精準黏合右邊的眼球
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
  // 💡 新增：因為左右並排空間較小，內縮 40 即可避免字體重疊到眼球
  passwordInputSpecial: {
    paddingRight: 40, 
  },
  // 💡 新增：眼球絕對定位居中
  eyeIconContainer: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
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