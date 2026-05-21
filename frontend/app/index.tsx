// app/index.tsx
import { Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';
// 將 @/ 替換成 ../ 以確保打包工具絕對抓得到
import { router } from 'expo-router';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, spacing, typography } from '../components/sharedStyles';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* 中央圖標 */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/images/farm_logo.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
        </View>

        {/* 底部內容佈局 */}
        <View style={styles.footer}>
          <Text style={styles.systemTitle}>智慧農場管理系統</Text>
          <PrimaryButton 
            title="登入 / 註冊" 
            onPress={() => router.push('/(auth)/login')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.xl,
    paddingTop: 50,
    minHeight: 500, // ensure content takes space in scrollview
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    tintColor: colors.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  systemTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: 'bold',
  },
});