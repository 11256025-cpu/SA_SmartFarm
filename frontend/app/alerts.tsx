/*
 * frontend/app/alerts.tsx - 警示頁面，顯示最近的警報紀錄並提供環境安全範圍的設定。
 */
import { FontAwesome } from '@expo/vector-icons';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNotifications } from '../components/NotificationProvider';
import PageShell from '../components/PageShell';
import { colors, radii, spacing } from '../components/sharedStyles';

// 定義後端 API 基礎位址，自動判斷執行環境 (Android 模擬器或本機)
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

// 警示紀錄的 TypeScript 型別定義
interface AlertLog {
  id: number;     // 紀錄的唯一識別碼
  msg: string;    // 警示訊息內容
  date: string;   // 發生日期
  time: string;   // 發生時間
}

export default function AlertsScreen() {
  // 取得全域推播通知函式
  const { addNotification } = useNotifications();
  
  // === 狀態管理區域 ===
  // 1. 警示閾值狀態：儲存各環境指標的 [下限, 上限] 安全範圍
  const [tempRange, setTempRange] = useState([15, 35]);
  const [humidRange, setHumidRange] = useState([30, 80]);
  const [co2Range, setCo2Range] = useState([400, 1000]);
  const [lightRange, setLightRange] = useState([500, 50000]);
  // 頁面載入狀態，避免載入完成前畫面閃爍
  const [loading, setLoading] = useState(true);

  // 2. 初始化：元件掛載時讀取後端儲存的使用者設定，並將其數值套用到畫面滑軌上
  useEffect(() => {
    const loadSettings = async () => {
      try {
        let uid = await AsyncStorage.getItem('userId') || '1';
        
        const resp = await fetch(`${BASE_URL}/api/alerts/settings?userId=${uid}`);
        const data = await resp.json();
        
        if (data.success && data.settings) {
          const s = data.settings;
          
          // 確認後端回傳的資料為陣列且長度為 2，才將其轉為數字寫入狀態
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
        } else {
          console.log("ℹ️ 該使用者在資料庫尚無設定紀錄，使用前端預設值。");
        }
      } catch (e) {
        console.warn('❌ 載入使用者警示設定失敗：', e);
      } finally {
        // 無論成功或失敗，皆結束載入狀態以顯示畫面
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 3. 警示紀錄資料狀態 (預設為空陣列)
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>([]);

  // 💡 導航焦點效應 (useFocusEffect)：
  // 與 useEffect 不同，它確保每次「切換回此頁面」時都會觸發，向後端取得最新的警示紀錄
  useFocusEffect(
    useCallback(() => {
      const loadAlertLogs = async () => {
        try {
          let uid = await AsyncStorage.getItem('userId') || '1';
          const resp = await fetch(`${BASE_URL}/api/alerts/logs?userId=${uid}`);
          if (!resp.ok) {
            throw new Error(`伺服器回應 ${resp.status}`);
          }
          const data = await resp.json();
          if (data.success && data.logs) {
            setAlertLogs(data.logs);
          }
        } catch (e) {
          console.warn('❌ 載入警示紀錄失敗：', e);
          // 連線失敗時顯示警告通知
          addNotification({
            title: '載入失敗',
            message: '⚠️ 無法讀取警示紀錄，請確認後端是否已啟動在 http://localhost:3000。',
            type: 'error',
          });
        }
      };
      loadAlertLogs();
    }, [])
  );

  // 處理清空所有警示紀錄的操作
  const handleClearLogs = async () => {
    // 負責發送 DELETE 請求到後端的非同步函式
    const performClearLogs = async () => {
      try {
        const uid = await AsyncStorage.getItem('userId') || '1';
        const response = await fetch(`${BASE_URL}/api/alerts/logs?userId=${uid}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error(`伺服器回應 ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          // 成功後，同步清空前端狀態，讓畫面上的紀錄瞬間消失
          setAlertLogs([]); // 同步清空前端狀態
          addNotification({
            title: '警示紀錄清空成功',
            message: '所有警示紀錄已成功清空。',
            type: 'success',
          });
        } else {
          addNotification({
            title: '清空失敗',
            message: `❌ ${data.message || '清空警示紀錄失敗，請稍後再試'}`,
            type: 'error',
          });
        }
      } catch (error) {
        console.error('清空警示紀錄時發生錯誤:', error);
        addNotification({
          title: '清空失敗',
          message: '⚠️ 無法連線到伺服器，請確認後端是否已啟動在 http://localhost:3000。',
          type: 'error',
        });
      }
    };

    // 針對不同平台顯示不同的確認對話框
    if (Platform.OS === 'web') {
      // Web 環境使用 window.confirm
      if (window.confirm("此操作將會永久刪除所有警示紀錄，且無法復原。確定要繼續嗎？")) {
        performClearLogs();
      }
    } else {
      // 原生手機環境 (iOS/Android) 使用 Alert 元件跳出再次確認的對話框，防止誤觸
      Alert.alert(
        "確認清空紀錄",
        "此操作將會永久刪除所有警示紀錄，且無法復原。確定要繼續嗎？",
        [
          { text: "取消", style: "cancel" },
          {
            text: "確定清空",
            style: 'destructive', // 在 iOS 上會顯示為紅色按鈕
            onPress: performClearLogs,
          },
        ]
      );
    }
  };

  // 4. 幫助建立「雙向範圍設定滑軌」的共用渲染函式，減少重複的 UI 程式碼
  const renderRangeSetting = (label: string, values: number[], setter: (vals: number[]) => void, min: number, max: number, unit: string, step: number = 1) => (
    <View style={styles.settingCard}>
      <View style={styles.settingHeaderRow}>
        <Text style={styles.settingLabel}>{label}</Text>
        {/* 顯示目前選取的範圍值 */}
        <Text style={styles.rangeValueText}>允許範圍：{values[0]} ~ {values[1]} {unit}</Text>
      </View>
      
      <View style={styles.sliderRow}>
        <Text style={styles.limitText}>{min}</Text>
        {/* 第三方套件 MultiSlider：支援雙向拖曳的滑桿 */}
        <MultiSlider
          values={[values[0], values[1]]}
          sliderLength={320} 
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
        {/* 如果上限值太大 (例如 100000)，將其縮寫為 100k，避免撐破版面 */}
        <Text style={styles.limitText}>{max > 9999 ? (max/1000)+'k' : max}</Text> 
      </View>
      
      <Text style={styles.helperText}>
        * 當數值低於 {values[0]}{unit} 或高於 {values[1]}{unit} 時將自動推播警報
      </Text>
    </View>
  );

  // 5. 將警示條件的設定儲存回資料庫的邏輯
  const handleSaveSettings = async () => {
    try {
      const apiUrl = `${BASE_URL}/api/alerts/settings`;
      const uid = await AsyncStorage.getItem('userId');
      
      // 將目前畫面上所有的範圍數值打包成一個物件
      const payload = {
        userId: uid ? Number(uid) : 1, 
        tempRange,
        humidRange,
        co2Range,
        lightRange 
      };

      // 發送 POST 請求寫入資料庫
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        // 儲存成功，發送系統通知
        addNotification({
          title: '警示條件儲存成功',
          message: '✅ 警示條件已成功儲存到資料庫。',
          type: 'success',
        });
      } else {
        addNotification({
          title: '警示條件儲存失敗',
          message: data.message || '請稍後再試。',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('儲存設定時發生錯誤:', error);
      addNotification({
        title: '儲存失敗',
        message: '⚠️ 無法連線到伺服器，請確認後端已啟動！且 IP 設定正確。',
        type: 'error',
      });
    }
  };

  // 如果資料尚未載入完成，顯示載入中的提示畫面
  if (loading) {
    return (
      <PageShell active="alerts" left={<Text style={{color: '#fff', margin: 20}}>載入設定中...</Text>} right={<></>} />
    );
  }

  // === 畫面渲染區 ===
  return (
    <PageShell
      active="alerts"
      leftFlex={4}
      rightFlex={6}
      left={(
        <View style={{ flex: 1 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>最近警示紀錄</Text>
              <TouchableOpacity onPress={handleClearLogs}>
              <FontAwesome name="trash-o" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {/* 💡 效能優化：FlatList 虛擬列表 */}
          {/* 相較於 ScrollView + map，FlatList 只會渲染畫面可見範圍內的項目，能大幅提升長列表的渲染效能 */}
          {/* 若無紀錄時顯示的空狀態提示 */}
          <FlatList
            data={alertLogs}
            keyExtractor={(item) => String(item.id)}
            style={styles.logsScrollArea}
            showsVerticalScrollIndicator={true}
            ListEmptyComponent={<Text style={styles.emptyText}>暫無警示紀錄。</Text>}
            renderItem={({ item: log }) => (
              <View style={styles.logItem}>
                <View style={styles.logIcon}>
                  <FontAwesome name="exclamation-triangle" size={14} color={colors.alert} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logMsg}>{log.msg}</Text>
                  <Text style={styles.logTime}>{log.date} {log.time}</Text>
                </View>
              </View>
            )}
          />
        </View>
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  logItem: { 
    flexDirection: 'row', 
    backgroundColor: colors.card, 
    padding: 16, 
    borderRadius: radii.md, 
    marginBottom: 14,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: colors.alert,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(240, 110, 110, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 14, marginTop: 2 },
  logMsg: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 6, lineHeight: 22 },
  logTime: { color: colors.subMuted, fontSize: 13 },
  emptyText: { color: colors.subMuted, textAlign: 'center', marginTop: 80, lineHeight: 22, fontSize: 15 },
  logsScrollArea: { flex: 1, paddingRight: 14 },
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