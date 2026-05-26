import { FontAwesome } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 💡 新增：用來拿取 userId
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native'; // 💡 新增：確保每次切換回此頁面都會重新抓資料
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import PageShell from '../components/PageShell';
import { colors, radii, spacing, typography } from '../components/sharedStyles';

// 💡 自動判斷執行環境
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export default function EnvironmentScreen() {
  // 1. 環境狀態變數 (控制面板的當前數值)
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

  const slideAnim = useRef(new Animated.Value(400)).current; 

  // 💡 3. 新增：警示閾值狀態 (預設先給寬鬆一點，等 API 回傳後覆蓋)
  const [thresholds, setThresholds] = useState({
    tempRange: [15, 35],
    humidRange: [30, 80],
    co2Range: [400, 1000],
    lightRange: [500, 50000]
  });

  // 💡 4. 新增：向後端請求使用者最新的設定
  const fetchSettings = async () => {
    try {
      let uid = await AsyncStorage.getItem('userId') || '1';
      const resp = await fetch(`${BASE_URL}/api/alerts/settings?userId=${uid}`);
      const data = await resp.json();
      
      if (data.success && data.settings) {
        setThresholds({
          tempRange: data.settings.tempRange || [15, 35],
          humidRange: data.settings.humidRange || [30, 80],
          co2Range: data.settings.co2Range || [400, 1000],
          lightRange: data.settings.lightRange || [500, 50000]
        });
      }
    } catch (error) {
      console.warn('載入警示設定失敗，使用預設值。', error);
    }
  };

  // 💡 5. 使用 useFocusEffect 確保每次點進這個頁面時，都會同步最新的設定
  useFocusEffect(
    useCallback(() => {
      fetchSettings();
    }, [])
  );

  // 💡 6. 共用的異常判斷小工具
  const isWarning = (currentValue: number, range: number[]) => {
    if (!range || range.length !== 2) return false;
    return currentValue < range[0] || currentValue > range[1];
  };

  // 💡 7. 異常判斷邏輯 (依賴 thresholds 的動態範圍)
  useEffect(() => {
    const alerts: string[] = [];
    if (isWarning(temperature, thresholds.tempRange)) alerts.push('temperature');
    if (isWarning(humidity, thresholds.humidRange)) alerts.push('humidity');
    if (isWarning(co2, thresholds.co2Range)) alerts.push('co2');
    if (isWarning(light, thresholds.lightRange)) alerts.push('light');
    
    setActiveAlerts(alerts);
    setShowWarning(alerts.length > 0);
    // 當警示內容變更時，開啟通知顯示
    setHideNotification(false);
  }, [temperature, humidity, co2, light, thresholds]); // 記得將 thresholds 加入依賴

  // 滑入動畫邏輯
  const isVisible = activeAlerts.length > 0 && !hideNotification;
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isVisible ? 0 : 400,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
  }, [isVisible, slideAnim]);

  // 儲存排程連動資料庫
  const handleSaveSchedule = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency, duration }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert('儲存成功！排程已同步至資料庫。');
      } else {
        alert(`儲存失敗: ${data.message || '未知錯誤'}`);
      }
    } catch (error) {
      console.error('儲存排程時發生錯誤:', error);
      alert('無法連接到後端伺服器，請檢查網路連線或確認後端服務已啟動。');
    }
  };

  // 💡 8. 動態生成警示文案
  const getAlertContent = (type: string) => {
    switch (type) {
      case 'temperature':
        return {
          title: '溫度異常',
          message: `偵測到溫度 ${Math.round(temperature)}°C，不在安全範圍 (${thresholds.tempRange[0]}~${thresholds.tempRange[1]}°C)。建議查看警示條件並採取處理。`,
          actionLabel: '前往設定',
          action: () => router.replace('/alerts'),
        };
      case 'humidity':
        return {
          title: '土壤濕度異常',
          message: `偵測到土壤濕度 ${Math.round(humidity)}%，不在安全範圍 (${thresholds.humidRange[0]}~${thresholds.humidRange[1]}%)。建議查看警示條件並採取處理。`,
          actionLabel: '前往設定',
          action: () => router.replace('/alerts'),
        };
      case 'co2':
        return {
          title: 'CO₂ 濃度異常',
          message: `偵測到 CO₂ ${Math.round(co2)} ppm，不在安全範圍 (${thresholds.co2Range[0]}~${thresholds.co2Range[1]} ppm)。建議查看警示條件並採取處理。`,
          actionLabel: '前往設定',
          action: () => router.replace('/alerts'),
        };
      case 'light':
        return {
          title: '光照強度異常',
          message: `偵測到光照 ${Math.round(light).toLocaleString()} lux，不在安全範圍 (${thresholds.lightRange[0]}~${thresholds.lightRange[1]} lux)。建議查看警示條件並採取處理。`,
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
        <Text style={styles.controlValueText}>{Math.round(value).toLocaleString()} {unit}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        value={value}
        onValueChange={setter}
        step={1}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />
    </View>
  );

  const pickerSelectStyles = /* ... 維持不變 ... */ StyleSheet.create({
    inputIOS: { color: '#000000', paddingLeft: 12, paddingRight: 30, fontSize: typography.body, height: 36, backgroundColor: 'transparent' },
    inputAndroid: { color: '#000000', paddingLeft: 12, paddingRight: 30, fontSize: typography.body, height: 36, backgroundColor: 'transparent' },
    inputWeb: { color: '#000000', paddingLeft: 12, paddingRight: 30, fontSize: typography.body, height: 36, backgroundColor: 'transparent', borderWidth: 0, outlineStyle: 'none', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', cursor: 'pointer' },
    placeholder: { color: '#999999' },
    iconContainer: { top: 12, right: 10 },
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
        leftFlex={6}
        rightFlex={4}
        left={(
          <>
          <View style={styles.leftColumn}>
            <View style={styles.gridContainer}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>溫度</Text>
                <View style={styles.cardValueContainer}>
                  {/* 💡 套用新邏輯：超標就套用紅色 textAlert 樣式 */}
                  <Text style={[styles.cardValue, isWarning(temperature, thresholds.tempRange) && styles.textAlert]}>{Math.round(temperature)} <Text style={styles.cardUnit}>°C</Text></Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>光照強度</Text>
                <View style={styles.cardValueContainer}>
                  <Text style={[styles.cardValue, isWarning(light, thresholds.lightRange) && styles.textAlert]}>{Math.round(light).toLocaleString()} <Text style={styles.cardUnit}>lux</Text></Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>土壤濕度</Text>
                <View style={styles.cardValueContainer}>
                  <Text style={[styles.cardValue, isWarning(humidity, thresholds.humidRange) && styles.textAlert]}>{Math.round(humidity)} <Text style={styles.cardUnit}>%</Text></Text>
                </View>
                <TouchableOpacity style={styles.actionButton} onPress={() => setHumidity(50)}>
                  <Text style={styles.actionButtonText}>手動灌溉</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>二氧化碳濃度</Text>
                <View style={styles.cardValueContainer}>
                  <Text style={[styles.cardValue, isWarning(co2, thresholds.co2Range) && styles.textAlert]}>{Math.round(co2)} <Text style={styles.cardUnit}>ppm</Text></Text>
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
                  <RNPickerSelect value={frequency} onValueChange={setFrequency} items={[{ label: '1', value: 1 },{ label: '2', value: 2 },{ label: '4', value: 4 },{ label: '8', value: 8 },{ label: '12', value: 12 },{ label: '24', value: 24 }]} style={pickerSelectStyles} useNativeAndroidPickerStyle={false} Icon={() => <FontAwesome name="chevron-down" size={12} color="#64748B" />} />
                </View>
                <Text style={styles.scheduleText}>分鐘灌溉一次</Text>
              </View>

              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>單次時長</Text>
                <Text style={styles.scheduleText}>一次灌溉</Text>
                <View style={styles.pickerWrapper}>
                  <RNPickerSelect value={duration} onValueChange={setDuration} items={[{ label: '1', value: 1 },{ label: '5', value: 5 },{ label: '10', value: 10 },{ label: '20', value: 20 },{ label: '30', value: 30 },{ label: '60', value: 60 }]} style={pickerSelectStyles} useNativeAndroidPickerStyle={false} Icon={() => <FontAwesome name="chevron-down" size={12} color="#64748B" />} />
                </View>
                <Text style={styles.scheduleText}>分鐘</Text>
              </View>

              <View style={styles.scheduleFooter}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveSchedule}>
                  <Text style={styles.saveButtonText}>儲存設定</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
        )}
        right={(
        <View style={styles.rightColumn}>
            <Text style={styles.godPanelHeader}><FontAwesome name="sliders" size={18} color="#FFF" /> 控制面板</Text>
            <Text style={styles.godPanelSub}>模擬硬體回傳數值</Text>
            <View style={styles.godPanelControls}>
              {renderSliderControl('溫度', temperature, setTemperature, -30, 60, '°C')}
              {renderSliderControl('光照強度', light, setLight, 0, 150000, 'lux')}
              {renderSliderControl('土壤濕度', humidity, setHumidity, 0, 100, '%')}
              {renderSliderControl('CO2 濃度', co2, setCo2, 300, 2000, 'ppm')}
            </View>
        </View>
        )}
      />
      
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
                    <TouchableOpacity style={[styles.notificationButton, styles.notificationPrimary, { flex: 1, marginRight: 6 }]} onPress={info.action}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold', textAlign: 'center' }}>{info.actionLabel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.notificationButton, styles.notificationSecondary, { width: 56 }]} onPress={info.action}>
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

// styles 陣列無需變更，沿用你原本的即可
const styles = StyleSheet.create({
  /* ...（這裡放入你原本的完整 StyleSheet 即可）... */
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  mainLayout: { flexDirection: 'row', width: '100%', maxWidth: 1200, padding: spacing.xxl },
  leftColumn: { flex: 1 },
  rightColumn: { flex: 1, backgroundColor: colors.control, borderRadius: radii.lg, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, maxHeight: 600 },
  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: spacing.xl, paddingHorizontal: spacing.md, width: '100%' },
  navLeftGroup: { flexDirection: 'row', gap: 25, alignItems: 'center', justifyContent: 'center' },
  navRightGroup: { position: 'absolute', right: 10 },
  navItem: { paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  navItemActive: { borderBottomColor: colors.primary },
  navText: { color: colors.muted, fontSize: 16 },
  navTextActive: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  warningWrapper: { alignItems: 'flex-end', marginBottom: spacing.lg },
  warningToast: { backgroundColor: colors.alert, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20 },
  warningText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg, minHeight: 160, justifyContent: 'space-between' },
  cardTitle: { color: colors.text, fontSize: typography.h2, fontWeight: 'bold' },
  cardValueContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardValue: { color: colors.text, fontSize: typography.large, fontWeight: 'bold' },
  cardUnit: { fontSize: 16, fontWeight: 'normal', color: colors.subtle },
  textAlert: { color: colors.alert },
  actionButton: { backgroundColor: colors.secondary, paddingVertical: 8, borderRadius: radii.md, alignItems: 'center', width: '100%' },
  actionButtonText: { color: colors.text, fontWeight: 'bold', fontSize: 13 },
  horizontalDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md, width: '100%' },
  scheduleCard: { backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.xl },
  scheduleTitle: { color: colors.text, fontSize: typography.h2, fontWeight: 'bold', marginBottom: spacing.lg },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, width: '100%' },
  scheduleLabel: { color: colors.subtle, fontSize: 16, width: 80 },
  scheduleText: { color: colors.text, fontSize: typography.body, marginHorizontal: 8 },
  pickerWrapper: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#64748B', minWidth: 80, height: 36, justifyContent: 'center', overflow: 'hidden' },
  scheduleFooter: { marginTop: 10, alignItems: 'flex-end', width: '100%' },
  saveButton: { backgroundColor: colors.secondary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: radii.md },
  saveButtonText: { color: colors.text, fontWeight: 'bold', fontSize: 14 },
  godPanelHeader: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  godPanelSub: { color: colors.subMuted, fontSize: typography.small, marginBottom: 30 },
  godPanelControls: { flexDirection: 'column' },
  controlRow: { marginBottom: 25 },
  controlLabelGroup: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  controlLabel: { color: colors.text, fontSize: 14 },
  controlValueText: { color: colors.text, fontWeight: 'bold', fontSize: 14 },
  slider: { width: '100%', height: 40 },
  notificationContainer: { width: '100%', alignItems: 'center', marginBottom: 18 },
  notificationBox: { width: '100%', backgroundColor: colors.notificationBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  notificationTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  notificationAlertTitle: { color: colors.alert, fontWeight: '700', fontSize: 14 },
  notificationMessage: { color: '#DDD', fontSize: 13, marginTop: 6 },
  notificationButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  notificationButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radii.md },
  notificationPrimary: { backgroundColor: colors.primary },
  notificationSecondary: { backgroundColor: colors.secondary },
  centerColumn: { width: 260, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  notificationVerticalBox: { width: '100%', alignItems: 'center', paddingVertical: 6 },
  notificationItem: { marginBottom: 12, alignItems: 'center' },
  notificationButtonsVertical: { flexDirection: 'column', gap: 8, marginTop: 8 },
  floatingNotificationPanel: { position: 'absolute', top: 84, right: spacing.xl, width: 340, backgroundColor: colors.control, borderRadius: radii.lg, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8, zIndex: 1000, maxHeight: '80%' },
  notificationPanelHeader: { color: colors.text, fontSize: typography.h2, fontWeight: 'bold', marginBottom: spacing.md },
  notificationCard: { width: '100%', backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md, alignItems: 'flex-start', minHeight: 80, justifyContent: 'space-between' },
  notificationButtonsRow: { flexDirection: 'row', marginTop: 10, width: '100%', alignItems: 'center' },
});