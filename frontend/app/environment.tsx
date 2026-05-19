import { FontAwesome } from '@expo/vector-icons';
import Slider from '@react-native-community/slider'; // 需安裝
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select'; // 需安裝

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

  // 3. 異常判斷邏輯
  useEffect(() => {
    const isAbnormal = temperature > 35 || humidity < 30 || co2 > 1000 || light < 20000;
    setShowWarning(isAbnormal);
  }, [temperature, humidity, co2, light]);

  // 控制面板滑軌元件
  const renderSliderControl = (label: string, value: number, setter: any, min: number, max: number, unit: string) => (
    <View style={styles.controlRow}>
      <View style={styles.controlLabelGroup}>
        <Text style={styles.controlLabel}>{label}</Text>
        <Text style={styles.controlValueText}>{value.toLocaleString()} {unit}</Text>
      </View>
      <Slider
        style={{ width: '100%', height: 40 }}
        minimumValue={min}
        maximumValue={max}
        value={value}
        onValueChange={(val) => setter(Math.floor(val))}
        minimumTrackTintColor="#5A8B73"
        maximumTrackTintColor="#3E444A"
        thumbTintColor="#ffffff"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainLayout}>
          
          {/* ================= 左側：主畫面 ================= */}
          <View style={styles.leftColumn}>
            
            {/* === 頂部導覽列 (已修正靠左與靠右) === */}
            <View style={styles.topNav}>
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

              <TouchableOpacity style={styles.navRightGroup} onPress={() => router.replace('/profile')}>
                <FontAwesome name="user-o" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* === 紅色警示訊息 === */}
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
                <Text style={styles.cardTitle}>光照強度</Text>
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

            <View style={styles.horizontalDivider} />

            {/* === 自動灌溉排程區 (下拉選單版) === */}
            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleTitle}>自動灌溉排程</Text>
              
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>灌溉頻率</Text>
                <Text style={styles.scheduleText}>每隔</Text>
                <View style={styles.pickerWrapper}>
                    <RNPickerSelect
                        value={frequency}
                        onValueChange={(value) => setFrequency(value)}
                        items={[
                            { label: '1', value: 1 },
                            { label: '2', value: 2 },
                            { label: '4', value: 4 },
                            { label: '8', value: 8 },
                            { label: '12', value: 12 },
                            { label: '24', value: 24 },
                        ]}
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
                        items={[
                            { label: '1', value: 1 },
                            { label: '5', value: 5 },
                            { label: '10', value: 10 },
                            { label: '20', value: 20 },
                            { label: '30', value: 30 },
                            { label: '60', value: 60 },
                        ]}
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

          {/* ================= 右側：上帝控制面板 (滑軌版) ================= */}
          <View style={styles.rightColumn}>
            <Text style={styles.godPanelHeader}>
              <FontAwesome name="sliders" size={18} color="#FFF" /> 控制面板
            </Text>
            <Text style={styles.godPanelSub}>模擬硬體回傳數值</Text>
            
            <View style={styles.godPanelControls}>
              {renderSliderControl('溫度', temperature, setTemperature, 0, 50, '°C')}
              {renderSliderControl('光照強度', light, setLight, 0, 200000, 'lux')}
              {renderSliderControl('土壤濕度', humidity, setHumidity, 0, 100, '%')}
              {renderSliderControl('CO2 濃度', co2, setCo2, 0, 2000, 'ppm')}
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// 下拉選單專用樣式
const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 14,
        paddingVertical: 4,
        paddingHorizontal: 10,
        color: 'black',
        textAlign: 'center',
    },
    inputAndroid: {
        fontSize: 14,
        paddingHorizontal: 10,
        paddingVertical: 4,
        color: 'black',
        textAlign: 'center',
    },
    inputWeb: {
        fontSize: 14,
        paddingHorizontal: 10,
        paddingVertical: 4,
        color: 'black',
        textAlign: 'center',
        borderWidth: 0,
    }
});

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
    maxWidth: 1200, 
    padding: 30,
  },
  leftColumn: {
    flex: 3, 
    paddingRight: 30,
  },
  rightColumn: {
    flex: 1, 
    backgroundColor: '#2A2F35',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#3E444A',
    maxHeight: 600,
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
    marginLeft: 'auto',
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
    minHeight: 160,
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardValueContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardValue: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  cardUnit: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#AAA',
  },
  textAlert: {
    color: '#F06E6E',
  },
  actionButton: {
    backgroundColor: '#4A7561',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#3E444A',
    marginVertical: 15,
    width: '100%',
  },
  // --- 自動灌溉排程樣式 ---
  scheduleCard: {
    backgroundColor: '#32383E',
    borderRadius: 16,
    padding: 24,
  },
  scheduleTitle: {
    color: '#FFF',
    fontSize: 18,
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
    fontSize: 16,
    width: 80,
  },
  scheduleText: {
    color: '#FFF',
    fontSize: 14,
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
    backgroundColor: '#4A7561',
    paddingVertical: 10,
    paddingHorizontal: 20,
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  godPanelSub: {
    color: '#888',
    fontSize: 13,
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
    color: '#ffffff',
    fontSize: 14,
  },
  controlValueText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  }
});