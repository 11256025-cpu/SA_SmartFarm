import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function EnvironmentScreen() {
  // 1. 擴充環境狀態變數 (為上帝面板準備)
  const [temperature, setTemperature] = useState(25);
  const [light, setLight] = useState(100000);
  const [humidity, setHumidity] = useState(25);
  const [co2, setCo2] = useState(800);
  
  const [showWarning, setShowWarning] = useState(false);

  // 4. 異常判斷邏輯 (只要有任一數值超出安全範圍即觸發)
  useEffect(() => {
    // 判斷標準可以依照你們的專題設定自行修改
    const isAbnormal = temperature > 35 || humidity < 30 || co2 > 1000 || light < 20000;
    setShowWarning(isAbnormal);
  }, [temperature, humidity, co2, light]);

  // 上帝面板的數值增減按鈕元件 (保持程式碼乾淨)
  const renderGodControl = (label: string, value: number, setter: any, step: number = 1) => (
    <View style={styles.controlRow}>
      <Text style={styles.controlLabel}>{label}</Text>
      <View style={styles.controlAction}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => setter((v: number) => v - step)}>
          <Text style={styles.controlBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.controlValue}>{value.toLocaleString()}</Text>
        <TouchableOpacity style={styles.controlBtn} onPress={() => setter((v: number) => v + step)}>
          <Text style={styles.controlBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* === 將原本的 innerContainer 改為左右排版的 mainLayout === */}
        <View style={styles.mainLayout}>
          
          {/* ================= 左側：主畫面 ================= */}
          <View style={styles.leftColumn}>
            
{/* === 頂部導覽列 === */}
<View style={styles.topNav}>
  
  {/* 左側選單：明確給予 flex: 1 讓他撐開 */}
  <View style={styles.navLeftGroup}>
    <TouchableOpacity style={[styles.navItem, styles.navItemActive]} onPress={() => router.replace('/environment')}>
      <Text style={styles.navTextActive}>環境總覽</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/alerts')}>
      <Text style={styles.navText}>警示設定</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/crops')}>
      <Text style={styles.navText}>作物管理</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/reports')}>
      <Text style={styles.navText}>報表統計</Text>
    </TouchableOpacity>
  </View>

  {/* 帳號圖示容器：這裡不加 flex */}
  <TouchableOpacity style={styles.navRightGroup} onPress={() => router.replace('/profile')}>
    <FontAwesome name="user-o" size={24} color="#FFF" />
  </TouchableOpacity>
  
</View>
            {/* === 紅色警示訊息 (僅異常時顯示) === */}
            {showWarning && (
              <View style={styles.warningWrapper}>
                <TouchableOpacity style={styles.warningToast} onPress={() => router.replace('/alerts')}>
                  <FontAwesome name="exclamation-circle" size={16} color="#000" style={{ marginRight: 8 }} />
                  <Text style={styles.warningText}>環境數值異常，請盡速檢查並處理！</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* === 四宮格數據卡片區 === */}
            <View style={styles.gridContainer}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>溫度</Text>
                <View style={styles.cardValueContainer}>
                  <Text style={[styles.cardValue, temperature > 35 && styles.textAlert]}>
                    {temperature} <Text style={styles.cardUnit}>°C</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  <FontAwesome name="sun-o" size={14} color="#DDD" /> 光照強度
                </Text>
                <View style={styles.cardValueContainer}>
                  <Text style={[styles.cardValue, light < 20000 && styles.textAlert]}>
                    {light.toLocaleString()} <Text style={styles.cardUnit}>lux</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>土壤濕度</Text>
                <View style={styles.cardValueContainer}>
                  <Text style={[styles.cardValue, humidity < 30 && styles.textAlert]}>
                    {humidity} <Text style={styles.cardUnit}>%</Text>
                  </Text>
                </View>
                <TouchableOpacity style={styles.actionButton} onPress={() => setHumidity(50)}>
                  <Text style={styles.actionButtonText}>手動灌溉</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>二氧化碳濃度</Text>
                <View style={styles.cardValueContainer}>
                  <Text style={[styles.cardValue, co2 > 1000 && styles.textAlert]}>
                    {co2} <Text style={styles.cardUnit}>ppm</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. 數據面板與自動灌溉排程中間的分隔線 */}
            <View style={styles.horizontalDivider} />

            {/* === 自動灌溉排程區 === */}
            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleTitle}>自動灌溉排程</Text>
              
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>灌溉頻率</Text>
                <Text style={styles.scheduleText}>每隔</Text>
                <TextInput style={styles.inputBox} defaultValue="2" keyboardType="numeric" />
                <View style={styles.dropdownBox}>
                  <Text style={styles.dropdownText}>小時</Text>
                  <FontAwesome name="angle-down" size={14} color="#000" />
                </View>
                <Text style={styles.scheduleText}>灌溉一次</Text>
              </View>

              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>單次時長</Text>
                <Text style={styles.scheduleText}>一次灌溉</Text>
                <TextInput style={styles.inputBox} defaultValue="10" keyboardType="numeric" />
                <Text style={styles.scheduleText}>分鐘</Text>
                
                <View style={styles.saveButtonContainer}>
                  <TouchableOpacity style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>儲存設定</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* ================= 右側：控制面板 (1.) ================= */}
          <View style={styles.rightColumn}>
            <Text style={styles.godPanelHeader}>
              <FontAwesome name="sliders" size={18} color="#FFF" /> 控制面板
            </Text>
            <Text style={styles.godPanelSub}>模擬環境數值變化與展示</Text>
            
            <View style={styles.godPanelControls}>
              {/* 這裡設定每次按鈕點擊增減的幅度 */}
              {renderGodControl('溫度 (°C)', temperature, setTemperature, 1)}
              {renderGodControl('光照 (lux)', light, setLight, 5000)}
              {renderGodControl('土壤濕度 (%)', humidity, setHumidity, 5)}
              {renderGodControl('CO2 (ppm)', co2, setCo2, 50)}
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E2328',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center', 
  },
  mainLayout: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 1100, // 放寬最大寬度以容納右側面板
    padding: 30,
  },
  leftColumn: {
    flex: 3, // 左側主內容佔 3 份寬
    paddingRight: 20,
  },
  rightColumn: {
    flex: 1, // 右側面板佔 1 份寬
    backgroundColor: '#2A2F35',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3E444A',
  },
// --- 頂部導覽列樣式 ---
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
    paddingHorizontal: 10,
    width: '100%',
  },
  navLeftGroup: {
    flexDirection: 'row',
    gap: 25,
    alignItems: 'center',
  },
  navRightGroup: {
    // 這裡我們把圖示的 TouchableOpacity 包起來的容器樣式定義好
    marginLeft: 'auto', // 這是最暴力也最有效的靠右法：自動推到最右邊
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

  // --- 警示框樣式 ---
  warningWrapper: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  warningToast: {
    backgroundColor: '#F06E6E',
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
    backgroundColor: '#32383E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: '#AAA',
    fontSize: 15,
  },
  cardValueContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  cardValue: {
    color: '#FFF',
    fontSize: 38,
    fontWeight: 'bold',
  },
  cardUnit: {
    fontSize: 18,
    fontWeight: 'normal',
    color: '#AAA',
  },
  textAlert: {
    color: '#F06E6E', // 當數值異常時，將字體變成紅色
  },
  actionButton: {
    backgroundColor: '#4A7561',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // --- 分隔線 ---
  horizontalDivider: {
    height: 1,
    backgroundColor: '#3E444A',
    marginVertical: 10,
    width: '100%',
  },
  // --- 自動灌溉排程樣式 ---
  scheduleCard: {
    backgroundColor: '#32383E',
    borderRadius: 16,
    padding: 24,
    marginTop: 10,
  },
  scheduleTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scheduleLabel: {
    color: '#AAA',
    fontSize: 14,
    width: 80,
  },
  scheduleText: {
    color: '#FFF',
    fontSize: 14,
    marginHorizontal: 8,
  },
  inputBox: {
    backgroundColor: '#D9D9D9',
    color: '#000',
    width: 45,
    height: 30,
    borderRadius: 6,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  dropdownBox: {
    backgroundColor: '#D9D9D9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 65,
    height: 30,
    borderRadius: 6,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  dropdownText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  saveButtonContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  saveButton: {
    backgroundColor: '#4A7561',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // --- 上帝面板樣式 ---
  godPanelHeader: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  godPanelSub: {
    color: '#888',
    fontSize: 12,
    marginBottom: 25,
  },
  godPanelControls: {
    flexDirection: 'column',
  },
  controlRow: {
    marginBottom: 20,
  },
  controlLabel: {
    color: '#CCC',
    fontSize: 14,
    marginBottom: 10,
  },
  controlAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E2328', // 內凹深色底
    borderRadius: 8,
    padding: 6,
  },
  controlBtn: {
    backgroundColor: '#3E444A', // 按鈕稍微亮一點
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  controlValue: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  }
});