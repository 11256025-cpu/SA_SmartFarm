import { FontAwesome } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import PageShell from '../components/PageShell';
import { colors, radii, spacing, typography } from '../components/sharedStyles';

export default function EnvironmentScreen() {
  // 1. 環境狀態變數
  const [temperature, setTemperature] = useState(25);
  const [light, setLight] = useState(100000);
  const [humidity, setHumidity] = useState(25);
  const [co2, setCo2] = useState(800);

  // 2. 灌溉排程變數
  const [frequency, setFrequency] = useState(2);
  const [duration, setDuration] = useState(10);
  
  const [showWarning, setShowWarning] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<string[]>([]);
  const [hideNotification, setHideNotification] = useState(false);

  const slideAnim = useRef(new Animated.Value(400)).current; // 初始位置在右邊畫面外

  // 3. 異常判斷邏輯
  useEffect(() => {
    const alerts: string[] = [];
    if (temperature > 35) alerts.push('temperature');
    if (humidity < 30) alerts.push('humidity');
    if (co2 > 1000) alerts.push('co2');
    if (light < 20000) alerts.push('light');
    setActiveAlerts(alerts);
    setShowWarning(alerts.length > 0);
    // 當警示內容變更時，開啟通知顯示
    setHideNotification(false);
  }, [temperature, humidity, co2, light]);

  // 4. 滑入動畫邏輯
  const isVisible = activeAlerts.length > 0 && !hideNotification;
  useEffect(() => {
    // isVisible 為 true 則滑入 (toValue: 0)，false 則滑出 (toValue: 400)
    Animated.spring(slideAnim, {
      toValue: isVisible ? 0 : 400,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
  }, [isVisible, slideAnim]);

  const getAlertContent = (type: string) => {
    switch (type) {
      case 'temperature':
        return {
          title: '溫度過高',
          message: `偵測到溫度 ${temperature}°C，高於安全上限 35°C。建議查看警示條件並採取處理。`,
          actionLabel: '前往設定',
          action: () => router.replace('/alerts'),
        };
      case 'humidity':
        return {
          title: '土壤濕度過低',
          message: `偵測到土壤濕度 ${humidity}%，低於安全下限 30%。建議查看警示條件並採取處理。`,
          actionLabel: '前往設定',
          action: () => router.replace('/alerts'),
        };
      case 'co2':
        return {
          title: 'CO₂ 濃度過高',
          message: `偵測到 CO₂ ${co2} ppm，高於 1000 ppm。建議查看警示條件並採取處理。`,
          actionLabel: '前往設定',
          action: () => router.replace('/alerts'),
        };
      case 'light':
        return {
          title: '光照不足',
          message: `偵測到光照 ${light.toLocaleString()} lux，低於 20000 lux。建議查看警示條件並採取處理。`,
          actionLabel: '前往設定',
          action: () => router.replace('/alerts'),
        };
      default:
        return { title: '異常', message: '偵測到未知異常', actionLabel: '處理', action: () => {} };
    }
  };

  // 控制面板滑軌元件
  const renderSliderControl = (label: string, value: number, setter: any, min: number, max: number, unit: string) => (
    <View style={styles.controlRow}>
      <View style={styles.controlLabelGroup}>
        <Text style={styles.controlLabel}>{label}</Text>
        <Text style={styles.controlValueText}>{value.toLocaleString()} {unit}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        value={value}
        onValueChange={setter}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />
    </View>
  );

  const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
      color: 'black',
      paddingHorizontal: 8,
      fontSize: typography.body,
      height: 32,
    },
    inputAndroid: {
      color: 'black',
      paddingHorizontal: 8,
      fontSize: typography.body,
      height: 32,
    },
    placeholder: {
      color: colors.subMuted,
    },
  });

  return (
    <>
      <PageShell
        active="environment"
        onBellPress={() => {
          if (activeAlerts.length > 0) {
            setHideNotification((prev) => !prev);
          } else {
            alert('目前沒有新的異常通知');
          }
        }}
        hasUnreadAlerts={activeAlerts.length > 0}
        left={(
          <>
          {/* 維持原有左側內容 */}
          <View style={styles.leftColumn}>
            <View style={styles.gridContainer}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>溫度</Text>
                <View style={styles.cardValueContainer}>
                  <Text style={[styles.cardValue, temperature > 35 && styles.textAlert]}>{temperature} <Text style={styles.cardUnit}>°C</Text></Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>光照強度</Text>
                <View style={styles.cardValueContainer}>
                  <Text style={[styles.cardValue, light < 20000 && styles.textAlert]}>{light.toLocaleString()} <Text style={styles.cardUnit}>lux</Text></Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>土壤濕度</Text>
                <View style={styles.cardValueContainer}>
                  <Text style={[styles.cardValue, humidity < 30 && styles.textAlert]}>{humidity} <Text style={styles.cardUnit}>%</Text></Text>
                </View>
                <TouchableOpacity style={styles.actionButton} onPress={() => setHumidity(50)}>
                  <Text style={styles.actionButtonText}>手動灌溉</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>二氧化碳濃度</Text>
                <View style={styles.cardValueContainer}>
                  <Text style={[styles.cardValue, co2 > 1000 && styles.textAlert]}>{co2} <Text style={styles.cardUnit}>ppm</Text></Text>
                </View>
              </View>
            </View>

            <View style={styles.horizontalDivider} />

            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleTitle}>自動灌溉排程</Text>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>灌溉頻率</Text>
                <Text style={styles.scheduleText}>每隔</Text>
                <View style={styles.pickerWrapper}>
                  <RNPickerSelect
                    value={frequency}
                    onValueChange={(value) => setFrequency(value)}
                    items={[{ label: '1', value: 1 },{ label: '2', value: 2 },{ label: '4', value: 4 },{ label: '8', value: 8 },{ label: '12', value: 12 },{ label: '24', value: 24 }]}
                    style={pickerSelectStyles}
                  />
                </View>
                <Text style={styles.scheduleText}>分鐘灌溉一次</Text>
              </View>

              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>單次時長</Text>
                <Text style={styles.scheduleText}>一次灌溉</Text>
                <View style={styles.pickerWrapper}>
                  <RNPickerSelect
                    value={duration}
                    onValueChange={(value) => setDuration(value)}
                    items={[{ label: '1', value: 1 },{ label: '5', value: 5 },{ label: '10', value: 10 },{ label: '20', value: 20 },{ label: '30', value: 30 },{ label: '60', value: 60 }]}
                    style={pickerSelectStyles}
                  />
                </View>
                <Text style={styles.scheduleText}>分鐘</Text>
                <View style={styles.saveButtonContainer}>
                  <TouchableOpacity style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>儲存設定</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </>
      )}
      right={(
        <>
          <Text style={styles.godPanelHeader}><FontAwesome name="sliders" size={18} color="#FFF" /> 控制面板</Text>
          <Text style={styles.godPanelSub}>模擬硬體回傳數值</Text>
          <View style={styles.godPanelControls}>
            {renderSliderControl('溫度', temperature, setTemperature, 0, 50, '°C')}
            {renderSliderControl('光照強度', light, setLight, 0, 200000, 'lux')}
            {renderSliderControl('土壤濕度', humidity, setHumidity, 0, 100, '%')}
            {renderSliderControl('CO2 濃度', co2, setCo2, 0, 2000, 'ppm')}
          </View>
        </>
      )}
    />
    
      {/* 獨立在右上方浮動的通知面板 (從右側滑入) */}
      {activeAlerts.length > 0 && (
        <Animated.View style={[styles.floatingNotificationPanel, { transform: [{ translateX: slideAnim }] }]}>
          <Text style={styles.notificationPanelHeader}><FontAwesome name="bell" size={14} color="#FFF" />  異常警示</Text>
          <View style={[styles.notificationBox, styles.notificationVerticalBox]}>
            {activeAlerts.map((type) => {
              const info = getAlertContent(type);
              return (
                <View key={type} style={styles.notificationCard}>
                  <Text style={styles.notificationAlertTitle}>{info.title}</Text>
                  <Text style={styles.notificationMessage} numberOfLines={3}>{info.message}</Text>
                  <View style={styles.notificationButtonsRow}>
                    <TouchableOpacity style={[styles.notificationButton, styles.notificationPrimary, { flex: 1, marginRight: 6 }]} onPress={() => router.replace('/alerts')}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold', textAlign: 'center' }}>{info.actionLabel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.notificationButton, styles.notificationSecondary, { width: 56 }]} onPress={() => router.replace('/alerts')}>
                      <Text style={{ color: '#FFF', textAlign: 'center' }}>詳情</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ alignItems: 'center', marginTop: 6 }}>
            <TouchableOpacity onPress={() => setHideNotification(true)}>
              <Text style={{ color: colors.muted }}>暫時收起</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  mainLayout: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 1200,
    padding: spacing.xxl,
  },
  leftColumn: {
    flex: 3,
    paddingRight: spacing.xl,
  },
  rightColumn: {
    flex: 1,
    backgroundColor: colors.control,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 600,
  },
  // --- 頂部導覽列樣式 ---
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  navLeftGroup: {
    flexDirection: 'row',
    gap: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRightGroup: {
    position: 'absolute',
    right: 10,
  },
  navItem: {
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  navItemActive: {
    borderBottomColor: colors.primary,
  },
  navText: {
    color: colors.muted,
    fontSize: 16,
  },
  navTextActive: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // --- 警示框樣式 ---
  warningWrapper: {
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
  },
  warningToast: {
    backgroundColor: colors.alert,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  warningText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // --- 四宮格與數值樣式 ---
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: 'bold',
  },
  cardValueContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardValue: {
    color: colors.text,
    fontSize: typography.large,
    fontWeight: 'bold',
  },
  cardUnit: {
    fontSize: 16,
    fontWeight: 'normal',
    color: colors.subtle,
  },
  textAlert: {
    color: colors.alert,
  },
  actionButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 8,
    borderRadius: radii.md,
    alignItems: 'center',
    width: '100%',
  },
  actionButtonText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 13,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
    width: '100%',
  },
  // --- 自動灌溉排程樣式 ---
  scheduleCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  scheduleTitle: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scheduleLabel: {
    color: colors.subtle,
    fontSize: 16,
    width: 80,
  },
  scheduleText: {
    color: colors.text,
    fontSize: typography.body,
    marginHorizontal: 8,
  },
  pickerWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    minWidth: 10,
    height: 32,
    justifyContent: 'center',
  },
  saveButtonContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  saveButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radii.md,
  },
  saveButtonText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  // --- 上帝面板樣式 ---
  godPanelHeader: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  godPanelSub: {
    color: colors.subMuted,
    fontSize: typography.small,
    marginBottom: 30,
  },
  godPanelControls: {
    flexDirection: 'column',
  },
  controlRow: {
    marginBottom: 25,
  },
  controlLabelGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  controlLabel: {
    color: colors.text,
    fontSize: 14,
  },
  controlValueText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  notificationContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 18,
  },
  notificationBox: {
    width: '100%',
    backgroundColor: colors.notificationBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  notificationAlertTitle: {
    color: colors.alert,
    fontWeight: '700',
    fontSize: 14,
  },
  notificationMessage: {
    color: '#DDD',
    fontSize: 13,
    marginTop: 6,
  },
  notificationButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  notificationButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
  },
  notificationPrimary: {
    backgroundColor: colors.primary,
  },
  notificationSecondary: {
    backgroundColor: colors.secondary,
  },
  centerColumn: {
    width: 260,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  notificationVerticalBox: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  notificationItem: {
    marginBottom: 12,
    alignItems: 'center',
  },
  notificationButtonsVertical: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
  },
  floatingNotificationPanel: {
    position: 'absolute',
    top: 84, // TopNav 高度 (60) + PageShell 內距 (24)
    right: spacing.xl,
    width: 340,
    backgroundColor: colors.control,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    maxHeight: '80%',
  },
  notificationPanelHeader: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  notificationCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
    minHeight: 80,
    justifyContent: 'space-between',
  },
  notificationButtonsRow: {
    flexDirection: 'row',
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
});