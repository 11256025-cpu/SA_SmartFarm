// app/(auth)/register.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// 💡 引入 FontAwesome 來做眼球圖標
import { FontAwesome } from '@expo/vector-icons';

// 定義後端 API 的基礎 URL (若在實機上測試，建議動態判斷平台或改為區域網路 IP)
const BASE_URL = 'http://localhost:3000';

export default function RegisterScreen() {
  // 宣告狀態變數，用來儲存使用者輸入的註冊資料
  const [nickname, setNickname] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 控制「密碼」與「確認密碼」是否可見的獨立狀態（預設 false 為隱藏，顯示為星號）
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  // 為輸入框建立 Ref，用來在使用者按下鍵盤「下一步」時，自動切換焦點到下一個輸入框
  const accountRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // 處理註冊邏輯的非同步函式
  const handleRegister = async () => {
    // 1. 加入 .trim() 濾除前後多餘的空白，避免使用者不小心輸入空白字元被誤判為有值
    const trimmedNickname = nickname.trim();
    const trimmedAccount = account.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    // 檢查所有欄位是否都有填寫
    if (!trimmedNickname || !trimmedAccount || !trimmedPassword || !trimmedConfirm) {
      alert('【前端檢查】請確認所有欄位都有輸入字元！');
      return;
    }
    // 檢查兩次密碼輸入是否一致
    if (trimmedPassword !== trimmedConfirm) {
      alert('兩次密碼輸入不一致！');
      return;
    }

    try {
      // 發送 POST 請求至後端的註冊 API
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

      // 先以純文字讀取回應，避免後端回傳非 JSON 格式 (例如 HTML 或 404 Cannot POST 錯誤) 導致 JSON.parse 拋出例外
      const textResponse = await response.text();
      try {
        // 嘗試將純文字轉換為 JSON 格式
        const data = JSON.parse(textResponse);
        if (data.success) {
          try {
            // 註冊成功後，將回傳的使用者資訊儲存到本地的 AsyncStorage 中
            // 這樣可以讓 app 在後續的請求中直接使用這些登入憑證 (即註冊完自動登入)
            if (data.user?.id) await AsyncStorage.setItem('userId', String(data.user.id));
            if (data.user?.nickname) await AsyncStorage.setItem('userName', data.user.nickname);
            if (data.user?.account) await AsyncStorage.setItem('loginAccount', data.user.account);
            if (data.user?.avatar) await AsyncStorage.setItem('avatarUri', data.user.avatar);
          } catch (e) {
            console.warn('無法將 userId 儲存到 AsyncStorage', e);
          }
          // 提示使用者註冊成功，並跳轉到環境監控頁面
          alert('🎉 註冊成功，已自動登入！');
          router.replace('/environment');
        } else {
          // 若後端驗證失敗 (例如帳號已存在)，顯示後端回傳的錯誤訊息
          alert(`【後端拒絕】${data.message || '註冊失敗'}`);
        }
      } catch (parseError) {
        // 捕捉解析 JSON 失敗的例外 (通常代表 API 路徑錯誤或後端掛掉)
        console.error("後端回傳的非 JSON 內容:", textResponse);
        alert(`【伺服器錯誤 ${response.status}】\n請檢查後端是否有 /api/register 這個路由！`);
      }
    } catch (error) {
      // 捕捉網路連線等最外層的例外錯誤
      console.error(error);
      alert('【連線失敗】無法連線。\n若使用實體手機測試，請將 BASE_URL 替換為電腦的區域網路 IP (如 192.168.X.X)。');
    }
  };

  // 渲染註冊畫面
  return (
    <SafeAreaView style={styles.container}>
      {/* 確保開啟小鍵盤時，輸入框不會被鍵盤遮擋 */}
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
                      returnKeyType="next" // 將鍵盤確認鍵設為「下一個」
                      onSubmitEditing={() => accountRef.current?.focus()} // 按下後跳至帳號框
                    />
                  </View>
                </View>

                <View style={styles.column}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>帳號</Text>
                    <TextInput
                      ref={accountRef} // 綁定 reference 接收焦點
                      style={styles.input}
                      placeholder="設定登入帳號"
                      placeholderTextColor="#666"
                      value={account}
                      onChangeText={setAccount}
                      autoCapitalize="none" // 關閉自動首字母大寫
                      returnKeyType="next" // 將鍵盤確認鍵設為「下一個」
                      onSubmitEditing={() => passwordRef.current?.focus()} // 按下後跳至密碼框
                    />
                  </View>
                </View>
              </View>

              {/* 第二排：密碼 與 確認密碼 (皆帶有眼球切換功能) */}
              <View style={styles.row}>
                <View style={styles.column}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>密碼</Text>
                    {/* 密碼欄位外層包裹：讓眼球圖標能絕對定位於此框內 */}
                    <View style={styles.passwordWrapper}>
                      <TextInput
                        ref={passwordRef} // 綁定 reference
                        style={[styles.input, styles.passwordInputSpecial]} // 加上密碼框專用樣式 (右側留白)
                        placeholder="請輸入密碼"
                        placeholderTextColor="#666"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!isPasswordVisible} // 切換星號或明文
                        autoCapitalize="none" // 關閉自動首字母大寫
                        returnKeyType="next"
                        onSubmitEditing={() => confirmPasswordRef.current?.focus()} // 按下後跳至確認密碼框
                      />
                      {/* 顯示/隱藏密碼的眼球圖標按鈕 */}
                      <TouchableOpacity
                        style={styles.eyeIconContainer}
                        onPress={() => setIsPasswordVisible(!isPasswordVisible)} // 點擊時切換密碼可見狀態
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
                    {/* 確認密碼欄位外層包裹 */}
                    <View style={styles.passwordWrapper}>
                      <TextInput
                        ref={confirmPasswordRef} // 綁定 reference
                        style={[styles.input, styles.passwordInputSpecial]} // 加上密碼框專用樣式 (右側留白)
                        placeholder="再次輸入密碼"
                        placeholderTextColor="#666"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!isConfirmPasswordVisible} // 切換星號或明文
                        autoCapitalize="none" // 關閉自動首字母大寫
                        returnKeyType="done" // 確認鍵變為「完成」
                        onSubmitEditing={handleRegister} // 填完後直接送出註冊
                      />
                      {/* 顯示/隱藏確認密碼的眼球圖標按鈕 */}
                      <TouchableOpacity
                        style={styles.eyeIconContainer}
                        onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)} // 點擊時切換確認密碼可見狀態
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