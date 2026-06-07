/*
 * frontend/components/TopNav.tsx - 共用的上方導覽列組件。
 */
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 定義導覽列的有效 key，用來比對當前在哪個頁面
type NavKey = 'environment' | 'alerts' | 'crops' | 'reports';

// 定義導覽列的選項清單，將名稱與路由抽離出來，方便未來統一管理與擴充
const NAV_ITEMS: { key: NavKey; label: string; route: string }[] = [
  { key: 'environment', label: '環境總覽', route: '/environment' },
  { key: 'alerts',      label: '警示設定', route: '/alerts' },
  { key: 'crops',       label: '作物管理', route: '/crops' },
  { key: 'reports',     label: '報表統計', route: '/reports' },
];

// 定義元件傳入的 Props (屬性)
type Props = {
  active?: string;             // 當前處於活動狀態的頁面 key
  onBellPress?: () => void;    // 點擊鈴鐺圖示時觸發的回呼函式
  hasUnreadAlerts?: boolean;   // 是否有未讀通知 (控制是否顯示紅點)
};

export default function TopNav({ active, onBellPress, hasUnreadAlerts }: Props) {
  return (
    <View style={styles.topNav}>
      {/* 左側：頁籤導覽區塊 */}
      <View style={styles.navLeftGroup}>
        {/* 跑迴圈渲染所有頁籤 */}
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.navItem, active === item.key && styles.navItemActive]}
            onPress={() => router.replace(item.route as any)}
          >
            <Text style={active === item.key ? styles.navTextActive : styles.navText}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* 右側：功能按鈕區塊 */}
      <View style={styles.navRightGroup}>
        {/* 通知鈴鐺按鈕 */}
        <TouchableOpacity style={styles.bellButton} onPress={() => onBellPress ? onBellPress() : alert('目前沒有新的通知')}>
          <FontAwesome name="bell-o" size={22} color="#FFF" />
          {/* 若有未讀通知，顯示右上角的小紅點 */}
          {hasUnreadAlerts && <View style={styles.redDot} />}
        </TouchableOpacity>
        {/* 個人資料按鈕 */}
        <TouchableOpacity onPress={() => router.replace('/profile')}>
          <FontAwesome name="user-o" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
 topNav: {
  height: 60,
  backgroundColor: '#161920',  // 改成深色全寬條
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
  paddingHorizontal: 24,
  width: '100%',  // 確保全寬
},
  navLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    justifyContent: 'center',
  },
  navRightGroup: {
    position: 'absolute',
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  navItem: {
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  navItemActive: {
    borderBottomColor: '#5A8B73',
  },
  navText: {
    color: '#999',
    fontSize: 16,
  },
  navTextActive: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bellButton: {
    position: 'relative',
  },
  redDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4D4F',
  },
});