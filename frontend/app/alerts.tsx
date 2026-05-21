import { FontAwesome } from '@expo/vector-icons';
import MultiSlider from '@ptomasroos/react-native-multi-slider'; // 引入雙滑塊套件
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PageShell from '../components/PageShell';
import { colors, radii, spacing } from '../components/sharedStyles';

export default function AlertsScreen() {
  // 1. 警示閾值狀態改為陣列：[下限, 上限] (即允許的安全範圍)
  const [tempRange, setTempRange] = useState([15, 35]);
  const [humidRange, setHumidRange] = useState([30, 80]);
  const [co2Range, setCo2Range] = useState([400, 1000]);

  // 模擬警示紀錄數據
  const [alertLogs, setAlertLogs] = useState([
    { id: 1, type: '濕度', msg: '土壤濕度過低 (25%)', time: '10:30', date: '2024/05/19' },
    { id: 2, type: '溫度', msg: '環境溫度過高 (38°C)', time: '09:15', date: '2024/05/19' },
    { id: 3, type: 'CO2', msg: 'CO2 濃度異常 (1250ppm)', time: '昨天', date: '2024/05/18' },
  ]);

  // 渲染「左右包夾」的範圍設定滑軌
  const renderRangeSetting = (label: string, values: number[], setter: any, min: number, max: number, unit: string) => (
    <View style={styles.settingCard}>
      <View style={styles.settingHeaderRow}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.rangeValueText}>允許範圍：{values[0]} ~ {values[1]} {unit}</Text>
      </View>
      
      <View style={styles.sliderRow}>
        <Text style={styles.limitText}>{min}</Text>
        <MultiSlider
          values={[values[0], values[1]]}
          sliderLength={280} // 滑軌長度
          onValuesChange={(vals) => setter(vals)}
          min={min}
          max={max}
          step={1}
          selectedStyle={{ backgroundColor: colors.primary }} // 中間安全範圍 (綠)
          unselectedStyle={{ backgroundColor: colors.alert }} // 兩側危險範圍 (紅)
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
        <Text style={styles.limitText}>{max}</Text>
      </View>
      
      <Text style={styles.helperText}>
        * 當數值低於 {values[0]}{unit} 或高於 {values[1]}{unit} 時將自動推播警報
      </Text>
    </View>
  );

  // 處理儲存設定到資料庫的邏輯
  const handleSaveSettings = async () => {
    try {
      console.log("🔘 點擊了儲存按鈕，準備發送 API...");
      
      // 改為你本地的後端 API 網址
      const apiUrl = 'http://localhost:3000/api/alerts/settings';
      
      // 將前端的設定值打包
      const payload = {
        userId: 1, // ⚠️ 測試用：暫時將資料綁定給 user_id 為 1 的使用者
        tempRange,
        humidRange,
        co2Range
      };

      // 發送 HTTP POST 或 PUT 請求給後端
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 如果你的 API 需要身分驗證，可以在這裡加上 Token：
          // 'Authorization': `Bearer ${your_token_here}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ 警示條件已成功儲存！');
      } else {
        alert('❌ 儲存失敗：' + (data.message || '請稍後再試。'));
      }
    } catch (error) {
      console.error('儲存設定時發生錯誤:', error);
      alert('⚠️ 無法連線到伺服器，請確認後端已啟動！');
    }
  };

  return (
    <PageShell
      active="alerts"
      left={(
        <>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>最近警示紀錄</Text><TouchableOpacity onPress={() => setAlertLogs([])}><FontAwesome name="trash-o" size={18} color={colors.muted} /></TouchableOpacity></View>
          {alertLogs.map((log) => (
            <View key={log.id} style={styles.logItem}><View style={styles.logIcon}><FontAwesome name="exclamation-triangle" size={14} color={colors.alert} /></View><View style={{ flex: 1 }}><Text style={styles.logMsg}>{log.msg}</Text><Text style={styles.logTime}>{log.date} {log.time}</Text></View></View>
          ))}
          {alertLogs.length === 0 && <Text style={styles.emptyText}>太棒了！目前環境一切正常，暫無警示紀錄。</Text>}
        </>
      )}
      right={(
        <>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>允許接受範圍設定</Text></View>
          {renderRangeSetting('環境溫度', tempRange, setTempRange, 0, 50, '°C')}
          {renderRangeSetting('土壤濕度', humidRange, setHumidRange, 0, 100, '%')}
          {renderRangeSetting('二氧化碳', co2Range, setCo2Range, 0, 2000, 'ppm')}
          <View style={styles.saveContainer}><TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}><Text style={styles.saveButtonText}>儲存警示條件</Text></TouchableOpacity></View>
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
  
  // 導覽列
  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 30, width: '100%' },
  navLeftGroup: { flexDirection: 'row', gap: 25, alignItems: 'center', justifyContent: 'center' },
  navRightGroup: { position: 'absolute', right: 10 },
  navItem: { paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  navItemActive: { borderBottomColor: colors.primary },
  navText: { color: colors.muted, fontSize: 16 },
  navTextActive: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // 內容區排版 (改為兩欄對分)
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  
  // 紀錄列表樣式
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

  // 設定卡片樣式
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
  limitText: { color: colors.subMuted, fontSize: 13, width: 30, textAlign: 'center' },
  
  helperText: { color: colors.muted, fontSize: 12, marginTop: 10, textAlign: 'center' },

  saveContainer: { alignItems: 'flex-end', marginTop: 10 },
  saveButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: radii.md },
  saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});