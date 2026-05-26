import { FontAwesome } from '@expo/vector-icons';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import PageShell from '../components/PageShell';
import { colors, radii, spacing } from '../components/sharedStyles';

// 自動判斷執行環境，避免 localhost 在實機上連不到
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export default function AlertsScreen() {
  // 1. 警示閾值狀態：[下限, 上限]
  const [tempRange, setTempRange] = useState([15, 35]);
  const [humidRange, setHumidRange] = useState([30, 80]);
  const [co2Range, setCo2Range] = useState([400, 1000]);
  const [lightRange, setLightRange] = useState([500, 50000]);
  const [loading, setLoading] = useState(true);

  // 2. 啟動時讀取後端儲存的使用者設定，並套用到畫面滑塊
  useEffect(() => {
    const loadSettings = async () => {
      try {
        let uid = await AsyncStorage.getItem('userId') || '1';
        
        console.log(`📡 正在向後端請求使用者 ${uid} 的警示設定...`);
        const resp = await fetch(`${BASE_URL}/api/alerts/settings?userId=${uid}`);
        const data = await resp.json();
        
        if (data.success && data.settings) {
          const s = data.settings;
          
          if (Array.isArray(s.tempRange) && s.tempRange.length === 2) {
            setTempRange([Number(s.tempRange[0]), Number(s.tempRange[1])]);
          }
          if (Array.isArray(s.humidRange) && s.humidRange.length === 2) {
            setHumidRange([Number(s.humidRange[0]), Number(s.humidRange[1])]);
          }
          if (Array.isArray(s.co2Range) && s.co2Range.length === 2) {
            setCo2Range([Number(s.co2Range[0]), Number(s.co2Range[1])]);
          }
          if (Array.isArray(s.lightRange) && s.lightRange.length === 2) {
            setLightRange([Number(s.lightRange[0]), Number(s.lightRange[1])]);
          }
          console.log("✅ 成功從資料庫載入設定並套用到設定頁面！");
        } else {
          console.log("ℹ️ 該使用者在資料庫尚無設定紀錄，使用前端預設值。");
        }
      } catch (e) {
        console.warn('❌ 載入使用者警示設定失敗：', e);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 3. 模擬警示紀錄數據 
  const [alertLogs, setAlertLogs] = useState([
    { id: 1, type: '濕度', msg: '土壤濕度過低 (25%)', time: '10:30', date: '2024/05/19' },
    { id: 2, type: '溫度', msg: '環境溫度過高 (38°C)', time: '09:15', date: '2024/05/19' },
    { id: 3, type: 'CO2', msg: 'CO2 濃度異常 (1250ppm)', time: '昨天', date: '2024/05/18' },
    { id: 4, type: '光照', msg: '光照強度過低 (300lux)', time: '前天', date: '2024/05/17' },
  ]);

  // 4. 渲染「左右包夾」的範圍設定滑軌元件
  const renderRangeSetting = (label, values, setter, min, max, unit, step = 1) => (
    <View style={styles.settingCard}>
      <View style={styles.settingHeaderRow}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.rangeValueText}>允許範圍：{values[0]} ~ {values[1]} {unit}</Text>
      </View>
      
      <View style={styles.sliderRow}>
        <Text style={styles.limitText}>{min}</Text>
        <MultiSlider
          values={[values[0], values[1]]}
          sliderLength={280} 
          onValuesChange={(vals) => setter(vals)}
          min={min}
          max={max}
          step={step}
          selectedStyle={{ backgroundColor: colors.primary }}
          unselectedStyle={{ backgroundColor: colors.alert }}
          trackStyle={{ height: 6, borderRadius: 3 }}
          markerStyle={{ 
            backgroundColor: '#FFF', 
            width: 20, 
            height: 20, 
            borderRadius: 10,
            borderWidth: 2,
            borderColor: colors.primary,
            marginTop: 4 
          }}
        />
        <Text style={styles.limitText}>{max > 9999 ? (max/1000)+'k' : max}</Text> 
      </View>
      
      <Text style={styles.helperText}>
        * 當數值低於 {values[0]}{unit} 或高於 {values[1]}{unit} 時將自動推播警報
      </Text>
    </View>
  );

  // 5. 處理儲存設定到資料庫的邏輯
  const handleSaveSettings = async () => {
    try {
      console.log("🔘 點擊了儲存按鈕，準備發送 API...");
      
      const apiUrl = `${BASE_URL}/api/alerts/settings`;
      const uid = await AsyncStorage.getItem('userId');
      
      const payload = {
        userId: uid ? Number(uid) : 1, 
        tempRange,
        humidRange,
        co2Range,
        lightRange 
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ 警示條件已成功儲存到資料庫！');
      } else {
        alert('❌ 儲存失敗：' + (data.message || '請稍後再試。'));
      }
    } catch (error) {
      console.error('儲存設定時發生錯誤:', error);
      alert('⚠️ 無法連線到伺服器，請確認後端已啟動！且 IP 設定正確。');
    }
  };

  if (loading) {
    return (
      <PageShell active="alerts" left={<Text style={{color: '#fff', margin: 20}}>載入設定中...</Text>} right={<></>} />
    );
  }

  return (
    <PageShell
      active="alerts"
      left={(
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>最近警示紀錄</Text>
            <TouchableOpacity onPress={() => setAlertLogs([])}>
              <FontAwesome name="trash-o" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {alertLogs.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logIcon}>
                <FontAwesome name="exclamation-triangle" size={14} color={colors.alert} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.logMsg}>{log.msg}</Text>
                <Text style={styles.logTime}>{log.date} {log.time}</Text>
              </View>
            </View>
          ))}
          {alertLogs.length === 0 && <Text style={styles.emptyText}>太棒了！目前環境一切正常，暫無警示紀錄。</Text>}
        </>
      )}
      right={(
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>允許接受範圍設定</Text>
          </View>
          
          {renderRangeSetting('環境溫度', tempRange, setTempRange, -20, 50, '°C')}
          {renderRangeSetting('土壤濕度', humidRange, setHumidRange, 0, 100, '%')}
          {renderRangeSetting('二氧化碳', co2Range, setCo2Range, 0, 2000, 'ppm')}
          {/* 光照強度特別設定 step 為 100 方便滑動 */}
          {renderRangeSetting('光照強度', lightRange, setLightRange, 0, 100000, 'lux', 100)}
          
          <View style={styles.saveContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
              <Text style={styles.saveButtonText}>儲存警示條件</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  mainLayout: { flex: 1, flexDirection: 'row', padding: spacing.xl, gap: 25 },
  contentRow: { flexDirection: 'row', gap: 30, width: '100%' },
  logSection: { width: '38%', backgroundColor: colors.leftPanel, borderRadius: radii.lg, padding: spacing.xl },
  settingSection: { width: '62%', backgroundColor: colors.leftPanel, borderRadius: radii.lg, padding: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  logItem: { 
    flexDirection: 'row', 
    backgroundColor: colors.card, 
    padding: 15, 
    borderRadius: radii.md, 
    marginBottom: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.alert
  },
  logIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(240, 110, 110, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  logMsg: { color: colors.text, fontSize: 15, fontWeight: '600' },
  logTime: { color: colors.subMuted, fontSize: 12, marginTop: 4 },
  emptyText: { color: colors.subMuted, textAlign: 'center', marginTop: 80, lineHeight: 22 },
  settingCard: { 
    backgroundColor: colors.leftPanel, 
    borderRadius: radii.md, 
    padding: spacing.lg, 
    marginBottom: spacing.lg 
  },
  settingHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  settingLabel: { color: colors.text, fontWeight: 'bold', fontSize: 16 },
  rangeValueText: { color: colors.primary, fontWeight: 'bold', fontSize: 15 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15 },
  limitText: { color: colors.subMuted, fontSize: 13, width: 35, textAlign: 'center' },
  helperText: { color: colors.muted, fontSize: 12, marginTop: 10, textAlign: 'center' },
  saveContainer: { alignItems: 'flex-end', marginTop: 10 },
  saveButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: radii.md },
  saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});