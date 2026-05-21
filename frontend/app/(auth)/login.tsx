import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PageShell from '../../components/PageShell';
import { colors, radii, spacing, typography } from '../../components/sharedStyles';

export default function LoginScreen() {
  const [account, setAccount] = useState('');
  const [password] = useState('test');

  const handleLogin = async () => {
    if (!account) {
      alert('請輸入帳號！');
      return;
    }

    alert('✅ 測試模式登入成功！');
    router.replace('/environment');
  };

  return (
    <PageShell showNav={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>歡迎回來</Text>
            <Text style={styles.subtitle}>請登入以管理您的智慧農場</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>帳號</Text>
              <TextInput
                style={styles.input}
                placeholder="請輸入您的帳號"
                placeholderTextColor={colors.muted}
                value={account}
                onChangeText={setAccount}
                keyboardType="default"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            {false && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>密碼</Text>
                <TextInput
                  style={styles.input}
                  placeholder="請輸入您的密碼"
                  placeholderTextColor={colors.muted}
                  value={password}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            )}

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>登入</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>還沒有帳號？立即註冊</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.h1 + 8,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.leftPanel,
    color: colors.text,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    fontSize: typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({ web: { cursor: 'text' } as any }),
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  buttonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  switchText: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: '600',
  },
});