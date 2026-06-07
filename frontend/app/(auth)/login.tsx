// app/(auth)/login.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useNotifications } from '../../components/NotificationProvider';
// 💡 引入 FontAwesome 來做眼球圖標
import { FontAwesome } from '@expo/vector-icons';

// 定義後端 API 的基礎 URL，依據不同平台（Android 模擬器或 iOS/Web 模擬器）設定不同的位址
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export default function LoginScreen() {
  // 宣告狀態變數來儲存使用者輸入的帳號與密碼
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  
  // 錯誤狀態提示：用來顯示帳號或密碼輸入錯誤時的訊息
  const [accountError, setAccountError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // 新增控制密碼是否可見的狀態（預設 false 代表隱藏、呈現星號）
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // 控制「登入成功彈窗」的顯示狀態與內文訊息
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // 取得全域通知功能的方法
  const { addNotification } = useNotifications();

  // 建立密碼輸入框的錨點，用來在輸入完帳號後自動將游標跳至密碼框
  const passwordInputRef = useRef<TextInput>(null);

  // 關閉彈窗並跳轉至環境監控頁面的函式
  const handleCloseModalAndNavigate = () => {
    setSuccessModalVisible(false);  // 隱藏成功彈窗
    router.replace('/environment'); // 跳轉至環境監控頁面
  };

  // 處理登入邏輯的非同步函式
  const handleLogin = async () => {
    // 每次嘗試登入前，先清空之前的錯誤訊息
    setAccountError('');
    setPasswordError('');

    // 去除輸入字串前後的空白字元
    const trimmedAccount = account.trim();
    const trimmedPassword = password.trim();
    
    // 檢查是否有未填寫的欄位
    if (!trimmedAccount || !trimmedPassword) {
      alert("請輸入帳號與密碼！");
      return;
    }

    try {
      // 呼叫後端登入 API
      const response = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: trimmedAccount, // 傳送帳號
          password: trimmedPassword // 傳送密碼
        })
      });

      // 解析後端回傳的 JSON 資料
      const data = await response.json();
      console.log('login response', response.status, data);

      if (data.success) {
        // 若登入成功，取得使用者 ID
        const userId = data.user?.user_id ?? data.user?.id ?? null;

        if (userId) {
          try {
            // 將使用者相關資訊儲存至本地的 AsyncStorage，以便後續跨頁面或重開 App 時使用
            await AsyncStorage.setItem('userId', String(userId));
            if (data.user?.nickname) await AsyncStorage.setItem('userName', data.user.nickname);
            if (data.user?.account) await AsyncStorage.setItem('loginAccount', data.user.account);
            if (data.user?.avatar) await AsyncStorage.setItem('avatarUri', data.user.avatar);
          } catch (e) {
            console.warn('無法儲存 userId 到 AsyncStorage', e);
          }
        }

        // 發送登入成功的系統通知
        addNotification({
          title: '登入成功',
          message: '歡迎回來！您已成功登入系統。',
          type: 'success',
        });

        // 顯示成功彈窗並設定訊息
        setSuccessMessage('🎉 登入成功！');
        setSuccessModalVisible(true);
        
        // 延遲 2.5 秒後自動關閉彈窗並導向主頁
        setTimeout(() => {
          handleCloseModalAndNavigate();
        }, 2500);
      } else {
        // 若登入失敗，依據後端回傳的訊息判斷是帳號錯誤還是密碼錯誤
        const msg = data.message || '';
        if (
          msg.includes('查無') ||
          msg.includes('不存在') ||
          msg.includes('找不到') ||
          msg.toLowerCase().includes('not found') ||
          msg.toLowerCase().includes('exist')
        ) {
          setAccountError('此帳號不存在');
        } else {
          setPasswordError('密碼輸入錯誤');
        }
      }
    } catch (error) {
      // 捕捉網路連線等例外錯誤
      console.error("連線錯誤:", error);
      setPasswordError("無法連線到伺服器，請確認後端已啟動！");
      addNotification({
        title: '登入失敗',
        message: '⚠️ 無法連線到伺服器，請確認後端已啟動。',
        type: 'error',
      });
    }
  };

  // 處理帳號輸入框文字改變的事件
  const handleAccountChange = (text: string) => {
    setAccount(text); // 更新帳號狀態
    if (accountError) setAccountError(''); // 清除帳號錯誤訊息
  };

  // 處理密碼輸入框文字改變的事件
  const handlePasswordChange = (text: string) => {
    setPassword(text); // 更新密碼狀態
    if (passwordError) setPasswordError(''); // 清除密碼錯誤訊息
  };

  // 渲染登入畫面
  return (
    <SafeAreaView style={styles.container}>
      {/* 避免鍵盤遮擋輸入框的視圖元件 */}
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
                autoCapitalize="none" // 關閉自動大寫
                returnKeyType="next" // 將鍵盤的確認鍵改為 "Next" (下一個)
                onSubmitEditing={() => passwordInputRef.current?.focus()} // 按下 Next 後跳至密碼框
              />
              {/* 若有帳號錯誤，顯示錯誤訊息 */}
              {accountError ? (
                <Text style={styles.errorText}>{accountError}</Text>
              ) : null}
            </View>

            {/* 密碼輸入框 */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>密碼</Text>
              
              {/* 這裡將密碼輸入框與眼球按鈕包在一起，使其方便做相對定位 */}
              <View style={styles.passwordWrapper}>
                <TextInput
                  ref={passwordInputRef} // 綁定 ref，以便可以程式化 focus
                  style={[styles.input, styles.passwordInputSpecial]} // 額外擴充右邊留白防止文字跟眼球重疊
                  placeholder="請輸入您的密碼"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={handlePasswordChange} 
                  secureTextEntry={!isPasswordVisible} // 動態切換顯示或隱藏 (true 為隱藏)
                  autoCapitalize="none" // 關閉自動大寫
                  returnKeyType="done" // 將鍵盤的確認鍵改為 "Done" (完成)
                  onSubmitEditing={handleLogin} // 按下 Done 後執行登入
                />
                
                {/* 顯示/隱藏密碼的眼球圖標按鈕 */}
                <TouchableOpacity 
                  style={styles.eyeIconContainer} 
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)} // 點擊時切換可見狀態
                  activeOpacity={0.6}
                >
                  <FontAwesome 
                    name={isPasswordVisible ? "eye" : "eye-slash"} 
                    size={20} 
                    color="#999999" 
                  />
                </TouchableOpacity>
              </View>
              
              {/* 若有密碼錯誤，顯示錯誤訊息 */}
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

      {/* 自訂暗色系登入成功彈窗 */}
      <Modal
        animationType="fade" // 設定淡入淡出動畫
        transparent={true} // 設定背景透明
        visible={successModalVisible} // 控制是否顯示
        onRequestClose={handleCloseModalAndNavigate} // Android 實體返回鍵行為
      >
        {/* 彈窗背景遮罩 */}
        <View style={styles.modalOverlay}>
          {/* 使用 Reanimated 提供彈出動畫效果 */}
          <Animated.View 
            entering={ZoomIn.duration(400).springify()} 
            style={styles.modalCard}
          >
            {/* 成功打勾圖示 */}
            <View style={styles.iconCircle}>
              <FontAwesome name="check" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.modalTitle}>系統提示</Text>
            <Text style={styles.modalMessage}>{successMessage}</Text>
            
            {/* 確定按鈕 */}
            <TouchableOpacity style={styles.modalButton} onPress={handleCloseModalAndNavigate}>
              <Text style={styles.modalButtonText}>確 定</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

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
  passwordInputSpecial: {
    paddingRight: 40,
  },
  eyeIconContainer: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  errorText: {
    color: '#FF4D4F',
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: '#5A8B73',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#1E2124',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#33373E',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5A8B73',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#5A8B73',
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
