import { AuthInput } from '@/components/AuthInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PageShell from '../../components/PageShell';
import { colors, radii, spacing, typography } from '../../components/sharedStyles';

export default function RegisterScreen() {
  const [nickname, setNickname] = useState('');
  const [account, setAccount] = useState('');
  const [password] = useState('test');
  const [confirmPassword] = useState('test');

  const handleRegister = async () => {
    if (!nickname || !account) {
      alert('請填寫暱稱與帳號欄位！');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname,
          username: account,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('🎉 註冊成功！請登入');
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
    <PageShell showNav={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>註冊帳號</Text>

            <View style={styles.row}>
              <View style={styles.column}>
                <AuthInput label="暱稱" required value={nickname} onChangeText={setNickname} placeholder="請輸入暱稱" />
                <AuthInput label="帳號" required value={account} onChangeText={setAccount} placeholder="請輸入帳號" />
              </View>
              <View style={styles.column}>
                {false && (
                  <>
                    <AuthInput label="密碼" required value={password} onChangeText={() => {}} placeholder="請輸入密碼" secureTextEntry />
                    <AuthInput label="再次輸入密碼" required value={confirmPassword} onChangeText={() => {}} placeholder="確認密碼" secureTextEntry />
                  </>
                )}
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

          <Text style={styles.systemTitle}>智慧農場管理系統</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: '100%',
  },
  card: {
    backgroundColor: colors.leftPanel,
    borderRadius: radii.lg,
    padding: spacing.xl,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.h1 + 2,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    width: '48%',
  },
  buttonContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  confirmButton: {
    width: '60%',
  },
  footerLinkContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  footerLinkText: {
    color: colors.primary,
    fontSize: typography.body,
  },
  systemTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: 'bold',
    marginTop: spacing.xl,
    textAlign: 'center',
  },
});