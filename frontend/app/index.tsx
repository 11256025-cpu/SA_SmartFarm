/*
 * frontend/app/index.tsx - 應用程式的進入點。
 * 負責在應用程式啟動時，自動將使用者重導向至登入頁面。
 */
import { Redirect } from 'expo-router';

export default function HomeScreen() {
  // 自動將根路由 ("/") 導向至驗證群組下的登入頁面 ("/(auth)/login")
  return <Redirect href="/(auth)/login" />;
}