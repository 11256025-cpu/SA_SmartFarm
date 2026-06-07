/*
 * frontend/components/PageShell.tsx - 應用程式主頁框架，包含導覽列與通知邏輯。
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

type Props = {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode; // fallback
  active?: string;
  showNav?: boolean;
  onBellPress?: () => void;
  hasUnreadAlerts?: boolean;
  leftFlex?: number;
  rightFlex?: number;
};

const BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : Platform.OS === 'web' && typeof window !== 'undefined'
    ? `http://${window.location.hostname}:3000`
    : 'http://localhost:3000';

export default function PageShell({ left, center, right, children, active, showNav, onBellPress, hasUnreadAlerts, leftFlex, rightFlex }: Props) {
  const [simulatorState, setSimulatorState] = useState<{ temperature: number; humidity: number; co2: number; light: number } | null>(null);
  const [warningSettings, setWarningSettings] = useState({
    tempRange: [15, 35],
    humidRange: [30, 80],
    co2Range: [400, 1000],
    lightRange: [500, 50000],
  });

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

  const computeActiveAlerts = (state: { temperature: number; humidity: number; co2: number; light: number } | null, settings: typeof warningSettings) => {
    if (!state) return [];
    const alerts: string[] = [];
    if (state.temperature < settings.tempRange[0] || state.temperature > settings.tempRange[1]) alerts.push('temperature');
    if (state.humidity < settings.humidRange[0] || state.humidity > settings.humidRange[1]) alerts.push('humidity');
    if (state.co2 < settings.co2Range[0] || state.co2 > settings.co2Range[1]) alerts.push('co2');
    if (state.light < settings.lightRange[0] || state.light > settings.lightRange[1]) alerts.push('light');
    return alerts;
  };

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

  const loadWarningAlerts = async () => {
    try {
      const uid = (await AsyncStorage.getItem('userId')) || '1';
      const [stateResp, settingsResp] = await Promise.all([
        fetch(`${BASE_URL}/api/simulator/state?userId=${uid}`),
        fetch(`${BASE_URL}/api/alerts/settings?userId=${uid}`),
      ]);

      const stateData = stateResp.ok ? await stateResp.json() : null;
      const settingsData = settingsResp.ok ? await settingsResp.json() : null;

      const state = stateData?.success ? stateData.state : stateData?.state || null;
      const settings = settingsData?.success && settingsData.settings ? settingsData.settings : warningSettings;

      if (state) setSimulatorState(state);
      setWarningSettings(settings);

      const alerts = computeActiveAlerts(state, settings);
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

      replaceNotificationsOfType('alert', alertNotifications);
      return alerts;
    } catch (_error) {
      // 若無法取得警示資料，不清空現有通知，避免切頁時誤觸消失
      return [];
    }
  };

  const prevNotificationCountRef = React.useRef(notifications.length);
  const autoCloseTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 當通知數量增加時，自動打開面板
    if (notifications.length > prevNotificationCountRef.current && !panelVisible) {
      openPanel();
      
      // 清除之前的計時器
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
      
      // 3秒後自動收起
      autoCloseTimerRef.current = setTimeout(() => {
        closePanel();
      }, 3000);
    }
    
    prevNotificationCountRef.current = notifications.length;
  }, [notifications.length, panelVisible, openPanel, closePanel]);

  useFocusEffect(
    useCallback(() => {
      loadWarningAlerts();
    }, [])
  );

  const resolvedHasUnreadAlerts = hasUnreadAlerts !== undefined ? hasUnreadAlerts : unreadCount > 0;
  const resolvedOnBellPress = onBellPress ? onBellPress : async () => {
    await loadWarningAlerts();
    togglePanel();
  };

  return (
    <SafeAreaView style={styles.container}>
      {showNav !== false ? <TopNav active={active || ''} onBellPress={resolvedOnBellPress} hasUnreadAlerts={resolvedHasUnreadAlerts} /> : null}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainLayout}>
          {left ? <View style={[styles.leftPanel, leftFlex !== undefined && { flex: leftFlex }]}>{left}</View> : null}
          {center ? <View style={styles.centerPanel}>{center}</View> : null}
          {right ? <View style={[styles.rightPanel, rightFlex !== undefined && { flex: rightFlex }]}>{right}</View> : null}
          {!left && !right && <View style={styles.full}>{children}</View>}
        </View>
      </ScrollView>
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
