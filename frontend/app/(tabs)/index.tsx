import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, Switch, TextInput } from 'react-native';

export default function EnvironmentScreen() {
  // 模擬從後端取得的數據狀態
  const [humidity, setHumidity] = useState(25); // 目前濕度
  const [showWarning, setShowWarning] = useState(false); // 控制警示是否顯示

  // 模擬前端判斷邏輯：當濕度低於 30% 時，顯示警示
  useEffect(() => {
    if (humidity < 30) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [humidity]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* === 頂部導覽列模擬 (未來可用 Expo Router Tabs 取代) === */}
        <View style={styles.topNav}>
          <Text style={styles.navItem}>警示設定</Text>
          <Text style={[styles.navItem, styles.navItemActive]}>環境總覽</Text>
          <Text style={styles.navItem}>作物管理</Text>
          <Text style={styles.navItem}>報表統計</Text>
        </View>

        {/* === 動態紅色警示 (Toast) === */}
        {showWarning && (
          <View style={styles.warningToast}>
            <Text style={styles.warningText}>⚠️ 濕度異常，請盡速進行灌溉作業</Text>
          </View>
        )}

        {/* === 四宮格數據卡片區 === */}
        <View style={styles.gridContainer}>
          {/* 溫度卡片 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>溫度</Text>
            <Text style={styles.cardValue}>25 <Text style={styles.cardUnit}>°C</Text></Text>
          </View>

          {/* 光照強度卡片 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>☀ 光照強度</Text>
            <Text style={styles.cardValue}>100,000 <Text style={styles.cardUnit}>lux</Text></Text>
          </View>

          {/* 土壤濕度卡片 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>土壤濕度</Text>
            <Text style={styles.cardValue}>{humidity} <Text style={styles.cardUnit}>%</Text></Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setHumidity(50)} // 模擬按下灌溉後濕度回升，警示就會自動消失
            >
              <Text style={styles.actionButtonText}>手動灌溉</Text>
            </TouchableOpacity>
          </View>

          {/* CO2 濃度卡片 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>二氧化碳濃度</Text>
            <Text style={styles.cardValue}>80 <Text style={styles.cardUnit}>%</Text></Text>
          </View>
        </View>

        {/* === 底部自動灌溉排程設定 === */}
        <View style={styles.scheduleCard}>
          <Text style={styles.scheduleTitle}>自動灌溉排程</Text>
          
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleLabel}>灌溉頻率　每隔</Text>
            <TextInput style={styles.inputBox} placeholder="2" placeholderTextColor="#999" />
            <Text style={styles.scheduleLabel}> 小時 灌溉一次</Text>
          </View>

          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleLabel}>單次時長　一次灌溉</Text>
            <TextInput style={styles.inputBox} placeholder="10" placeholderTextColor="#999" />
            <Text style={styles.scheduleLabel}> 分鐘</Text>
            
            <TouchableOpacity style={styles.saveButton}>
              <Text style={styles.saveButtonText}>儲存設定</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E2328', // 背景深灰
  },
  content: {
    padding: 20,
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
    paddingTop: 10,
  },
  navItem: {
    color: '#888',
    fontSize: 16,
  },
  navItemActive: {
    color: '#FFF',
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: '#5A8B73', // 底部綠線
    paddingBottom: 5,
  },
  // --- 警告提示框樣式 ---
  warningToast: {
    position: 'absolute',
    top: 60, // 覆蓋在導覽列下方
    right: 20,
    backgroundColor: '#FF6B6B', // 紅色警示
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    zIndex: 10, // 確保它浮在最上層
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  warningText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // --- 網格與卡片 ---
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%', // 兩欄佈局
    backgroundColor: '#343A40', // 卡片底色
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: '#DDD',
    fontSize: 14,
    marginBottom: 10,
  },
  cardValue: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardUnit: {
    fontSize: 16,
    fontWeight: 'normal',
  },
  actionButton: {
    backgroundColor: '#5A8B73',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  // --- 底部排程卡片 ---
  scheduleCard: {
    backgroundColor: '#343A40',
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
  },
  scheduleTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  scheduleLabel: {
    color: '#DDD',
    fontSize: 14,
  },
  inputBox: {
    backgroundColor: '#2A2F34',
    color: '#FFF',
    width: 50,
    height: 30,
    borderRadius: 4,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  saveButton: {
    backgroundColor: '#5A8B73',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginLeft: 'auto', // 推到最右邊
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  }
});