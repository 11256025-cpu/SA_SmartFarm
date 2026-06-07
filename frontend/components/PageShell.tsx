/*
 * frontend/components/PageShell.tsx - 應用程式主頁框架 (Layout Wrapper)。
 * 負責全域的版面切分 (左中右)、整合 TopNav、以及在背景定期抓取警報與顯示浮動通知面板。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight, FadeOutRight } from 'react-native-reanimated';
import TopNav from '../components/TopNav';
import { NotificationType, useNotifications } from './NotificationProvider';
import { colors, radii, spacing } from './sharedStyles';

// 定義 PageShell 接受的 Props
type Props = {
  left?: React.ReactNode;      // 左側區塊內容
  center?: React.ReactNode;    // 中間區塊內容
  right?: React.ReactNode;     // 右側區塊內容
  children?: React.ReactNode;  // 若不切分左右，可直接傳入 children (會以全寬顯示)
  active?: string;             // 傳遞給 TopNav，標示當前頁面
  showNav?: boolean;           // 是否顯示上方導覽列 (預設 true)
  onBellPress?: () => void;    // 覆寫預設的鈴鐺點擊事件
  hasUnreadAlerts?: boolean;   // 覆寫預設的未讀紅點邏輯
  leftFlex?: number;           // 自訂左側區塊的 Flex 寬度比例 (預設 3.8)
  rightFlex?: number;          // 自訂右側區塊的 Flex 寬度比例 (預設 6.2)
};

// 判斷後端 API 基礎位址
const BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : Platform.OS === 'web' && typeof window !== 'undefined'
    ? `http://${window.location.hostname}:3000`
    : 'http://localhost:3000';

export default function PageShell({ left, center, right, children, active, showNav, onBellPress, hasUnreadAlerts, leftFlex, rightFlex }: Props) {
  // === 狀態管理 ===
  // 儲存從後端背景抓來的模擬器最新狀態
  const [simulatorState, setSimulatorState] = useState<{ temperature: number; humidity: number; co2: number; light: number } | null>(null);
  // 儲存使用者的警示安全範圍設定
  const [warningSettings, setWarningSettings] = useState({
    tempRange: [15, 35],
    humidRange: [30, 80],
    co2Range: [400, 1000],
    lightRange: [500, 50000],
  });

  // 取得全域通知相關的狀態與操作方法
  const {
    notifications,
    unreadCount,
    panelVisible,
    addNotifications,
    replaceNotificationsOfType,
    openPanel,
    closePanel,
    togglePanel,
  } = useNotifications();

  // 核心邏輯：比對目前環境數值與安全範圍，回傳超出標準的項目陣列 (例如 ['temperature', 'humidity'])
  const computeActiveAlerts = (state: { temperature: number; humidity: number; co2: number; light: number } | null, settings: typeof warningSettings) => {
    if (!state) return [];
    const alerts: string[] = [];
    if (state.temperature < settings.tempRange[0] || state.temperature > settings.tempRange[1]) alerts.push('temperature');
    if (state.humidity < settings.humidRange[0] || state.humidity > settings.humidRange[1]) alerts.push('humidity');
    if (state.co2 < settings.co2Range[0] || state.co2 > settings.co2Range[1]) alerts.push('co2');
    if (state.light < settings.lightRange[0] || state.light > settings.lightRange[1]) alerts.push('light');
    return alerts;
  };

  // 小工具：根據通知的類型回傳對應的 Emoji 圖示
  const getNotificationEmoji = (type: NotificationType) => {
    switch (type) {
      case 'alert': return '🚨';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'error': return '❌';
      default: return '🔔';
    }
  };

  // 工廠函式：動態產生對應異常類型的通知內容與點擊按鈕的動作
  const getAlertContent = (type: string) => {
    const state = simulatorState || { temperature: 25, humidity: 25, co2: 800, light: 100000 };
    const thresholds = warningSettings;

    switch (type) {
      case 'temperature':
        return {
          title: '溫度異常',
          message: `偵測到溫度 ${Math.round(state.temperature)}°C，不在安全範圍 (${thresholds.tempRange[0]}~${thresholds.tempRange[1]}°C)。建議查看警示條件並採取處理。`, 
          actionLabel: '前往設定',
          action: () => router.replace('/alerts'),
        };
      case 'humidity':
        return {
          title: '土壤濕度異常',
          message: `偵測到土壤濕度 ${Math.round(state.humidity)}%，不在安全範圍 (${thresholds.humidRange[0]}~${thresholds.humidRange[1]}%)。建議查看警示條件並採取處理。`, 
          actionLabel: '前往設定',
          action: () => router.replace('/alerts'),
        };
      case 'co2':
        return {
          title: 'CO₂ 濃度異常',
          message: `偵測到 CO₂ ${Math.round(state.co2)} ppm，不在安全範圍 (${thresholds.co2Range[0]}~${thresholds.co2Range[1]} ppm)。建議查看警示條件並採取處理。`, 
          actionLabel: '前往設定',
          action: () => router.replace('/alerts'),
        };
      case 'light':
        return {
          title: '光照強度異常',
          message: `偵測到光照 ${Math.round(state.light).toLocaleString()} lux，不在安全範圍 (${thresholds.lightRange[0]}~${thresholds.lightRange[1]} lux)。建議查看警示條件並採取處理。`, 
          actionLabel: '前往設定',
          action: () => router.replace('/alerts'),
        };
      default:
        return { title: '異常', message: '偵測到未知異常', actionLabel: '前往設定', action: () => router.replace('/alerts') };
    }
  };

  // 背景載入警報邏輯：同時向後端拉取最新環境數值與警報範圍設定
  const loadWarningAlerts = async () => {
    try {
      const uid = (await AsyncStorage.getItem('userId')) || '1';
      // 使用 Promise.all 讓兩個請求並行處理，節省等待時間
      const [stateResp, settingsResp] = await Promise.all([
        fetch(`${BASE_URL}/api/simulator/state?userId=${uid}`),
        fetch(`${BASE_URL}/api/alerts/settings?userId=${uid}`),
      ]);

      const stateData = stateResp.ok ? await stateResp.json() : null;
      const settingsData = settingsResp.ok ? await settingsResp.json() : null;

      const state = stateData?.success ? stateData.state : stateData?.state || null;
      const settings = settingsData?.success && settingsData.settings ? settingsData.settings : warningSettings;

      // 將取得的資料存入 Local State
      if (state) setSimulatorState(state);
      setWarningSettings(settings);

      // 計算是否有異常
      const alerts = computeActiveAlerts(state, settings);
      
      // 將異常項目打包成 NotificationItem 格式
      const alertNotifications = alerts.map((type) => {
        const info = getAlertContent(type);
        return {
          id: `alert-${type}`,
          title: info.title,
          message: info.message,
          type: 'alert' as const,
          action: info.action,
        };
      });

      // 使用 replaceNotificationsOfType 取代舊有的警報，避免同類型的警告瘋狂堆疊
      replaceNotificationsOfType('alert', alertNotifications);
      return alerts;
    } catch (_error) {
      // 若無法取得警示資料，不清空現有通知，避免切頁時誤觸消失
      return [];
    }
  };

  // 利用 Ref 記錄上一秒的通知數量與 Timer ID (不會觸發畫面重新渲染)
  const prevNotificationCountRef = React.useRef(notifications.length);
  const autoCloseTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // 自動關閉通知面板的邏輯
  useEffect(() => {
    // 當通知數量增加時，自動打開面板
    if (notifications.length > prevNotificationCountRef.current && !panelVisible) {
      openPanel();
      
      // 若原本就有設定自動關閉的計時器，先清除掉，重新計算 3 秒
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
      
      // 設定 3 秒後自動收起面板
      autoCloseTimerRef.current = setTimeout(() => {
        closePanel();
      }, 3000);
    }
    
    // 更新 Ref 以備下次比對
    prevNotificationCountRef.current = notifications.length;
  }, [notifications.length, panelVisible, openPanel, closePanel]);

  // 當使用者導航回此頁面時，主動檢查一次有沒有新警報
  useFocusEffect(
    useCallback(() => {
      loadWarningAlerts();
    }, [])
  );

  // 決定小紅點顯示狀態 (如果上層有傳 Props 就用上層的，否則用 Context 裡的 unreadCount)
  const resolvedHasUnreadAlerts = hasUnreadAlerts !== undefined ? hasUnreadAlerts : unreadCount > 0;
  
  // 決定鈴鐺被點擊時的動作 (預設為重新抓取警報並切換面板開關)
  const resolvedOnBellPress = onBellPress ? onBellPress : async () => {
    await loadWarningAlerts();
    togglePanel();
  };

  // === 畫面渲染區 ===
  return (
    <SafeAreaView style={styles.container}>
      {showNav !== false ? <TopNav active={active || ''} onBellPress={resolvedOnBellPress} hasUnreadAlerts={resolvedHasUnreadAlerts} /> : null}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainLayout}>
          {/* 依據傳入的 Props 動態切分版面，並套用自訂的 Flex 比例 */}
          {left ? <View style={[styles.leftPanel, leftFlex !== undefined && { flex: leftFlex }]}>{left}</View> : null}
          {center ? <View style={styles.centerPanel}>{center}</View> : null}
          {right ? <View style={[styles.rightPanel, rightFlex !== undefined && { flex: rightFlex }]}>{right}</View> : null}
          {/* 若沒有任何分區，直接將 children 全螢幕呈現 */}
          {!left && !right && <View style={styles.full}>{children}</View>}
        </View>
      </ScrollView>
      
      {/* --- 右側浮動通知面板 (使用 Reanimated 提供進出場動畫) --- */}
      {panelVisible && (
        <Animated.View 
          entering={FadeInRight.duration(400)} 
          exiting={FadeOutRight.duration(300)}
          style={styles.floatingNotificationPanel}
        >
          <Text style={styles.notificationHeader}>通知中心</Text>
          <ScrollView style={styles.notificationList} contentContainerStyle={styles.notificationListContent} nestedScrollEnabled>
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <View
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    // 根據通知類型套用不同的左方邊框顏色
                    notification.type === 'alert' && styles.notificationAlert,
                    notification.type === 'success' && styles.notificationSuccess,
                    notification.type === 'warning' && styles.notificationWarning,
                    notification.type === 'info' && styles.notificationInfo,
                    notification.type === 'error' && styles.notificationError,
                  ]}
                >
                  <Text style={styles.notificationTitle}>
                    {getNotificationEmoji(notification.type)} {notification.title}
                  </Text>
                  <Text style={styles.notificationText} numberOfLines={3}>{notification.message}</Text>
                  
                  {/* 若該通知帶有按鈕行為 (如：前往查看)，則渲染按鈕 */}
                  {notification.action ? (
                    <View style={styles.notificationButtonsRow}>
                      <TouchableOpacity style={[styles.notificationButton, styles.notificationPrimary]} onPress={notification.action}>
                        <Text style={styles.notificationButtonText}>前往查看</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.notificationText}>目前沒有新的通知。</Text>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  mainLayout: { flex: 1, flexDirection: 'row', padding: spacing.xl, gap: 25, width: '100%', maxWidth: 1400 },
  leftPanel: { flex: 3.8, backgroundColor: colors.leftPanel, borderRadius: radii.lg, padding: spacing.xl },
  centerPanel: { width: 260, alignItems: 'center' },
  rightPanel: { flex: 6.2 },
  full: { width: '100%' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  notificationBox: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.leftPanel,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationHeader: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  notificationList: {
    maxHeight: 420,
    marginBottom: 0,
  },
  notificationListContent: {
    paddingBottom: spacing.sm,
  },
  notificationItem: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  notificationAlert: {
    borderColor: '#FF4D4F',
  },
  notificationSuccess: {
    borderColor: '#4BB543',
  },
  notificationWarning: {
    borderColor: '#FFA500',
  },
  notificationInfo: {
    borderColor: '#2F80ED',
  },
  notificationError: {
    borderColor: '#D32F2F',
  },
  notificationTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  notificationText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  notificationButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
  },
  notificationButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  notificationPrimary: {
    backgroundColor: colors.primary,
  },
  notificationSecondary: {
    backgroundColor: colors.muted,
  },
  notificationButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  floatingNotificationPanel: {
    position: 'absolute',
    top: 70,
    right: 20,
    width: 360,
    maxHeight: 520,
    backgroundColor: colors.leftPanel,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
    zIndex: 999,
  },
});
