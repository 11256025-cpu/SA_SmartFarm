// app/index.tsx
import { StyleSheet, View, Text, Image, SafeAreaView } from 'react-native';
// 將 @/ 替換成 ../ 以確保打包工具絕對抓得到
import { PrimaryButton } from '../components/PrimaryButton';
import { router } from 'expo-router';
import Colors from '../constants/Colors';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* 中央圖標 */}
        <View style={styles.logoContainer}>
          {/* ⚠️ 注意：我先把 Image 註解掉了！
              如果你的 assets/images 裡面還沒有 farm_logo.png，
              保留 require 會導致整個畫面崩潰 (Unmatched Route)。
              等你把圖片放進去後，再把這段解開註解，並使用 ../ 路徑 */}
          
          {/* <Image 
            source={require('../assets/images/farm_logo.png')} 
            style={styles.logo} 
            resizeMode="contain"
          /> 
          */}
          
          <Text style={{ color: 'white' }}>農場 Logo 預定地</Text>
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
    backgroundColor: '#151718',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    tintColor: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  systemTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});