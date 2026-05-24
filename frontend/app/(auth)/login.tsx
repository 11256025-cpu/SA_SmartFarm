// app/(auth)/login.tsx
import { router } from 'expo-router';
import React, { useRef, useState } from 'react'; // 💡 這裡幫你引入了 useRef
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');

  // 💡 建立一個密碼輸入框的錨點 (Ref)
  const passwordInputRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!account || !password) {
      alert("請輸入帳號與密碼！");
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
        // 取得使用者 id（在資料庫 schema 中為 user_id）
        const userId = data.user?.user_id ?? data.user?.id ?? null;

        // 將 userId 存到本地，以便其他頁面 (如 Alerts) 讀取
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

        // 嘗試向後端查詢該使用者上次儲存的警示設定
        if (userId) {
          try {
            const resp = await fetch(`http://localhost:3000/api/alerts/settings?userId=${userId}`);
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

        // 導向主畫面
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
                onChangeText={setAccount}
                keyboardType="default"
                autoCapitalize="none"
                
                // 💡 加上這兩行：按 Enter 自動跳到密碼欄位
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>

            {/* 密碼輸入框 */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>密碼</Text>
              <TextInput
                ref={passwordInputRef} // 💡 綁定錨點
                style={styles.input}
                placeholder="請輸入您的密碼"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                
                // 💡 加上這兩行：按 Enter 直接觸發登入
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
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
    backgroundColor: '#151718', // 與首頁相同的深色底色
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