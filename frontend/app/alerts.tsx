import { FontAwesome } from '@expo/vector-icons';
import MultiSlider from '@ptomasroos/react-native-multi-slider'; // 引入雙滑塊套件
import { router } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
          selectedStyle={{ backgroundColor: '#5A8B73' }} // 中間安全範圍 (綠)
          unselectedStyle={{ backgroundColor: '#F06E6E' }} // 兩側危險範圍 (紅)
          trackStyle={{ height: 6, borderRadius: 3 }}
          markerStyle={{ 
            backgroundColor: '#FFF', 
            width: 20, 
            height: 20, 
            borderRadius: 10,
            borderWidth: 2,
            borderColor: '#5A8B73',
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainLayout}>
          
          {/* === 頂部導覽列 === */}
          <View style={styles.topNav}>
            <View style={styles.navLeftGroup}>
              <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/environment')}>
                <Text style={styles.navText}>環境總覽</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.navItem, styles.navItemActive]} onPress={() => router.replace('/alerts')}>
                <Text style={styles.navTextActive}>警示設定</Text>
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

          {/* === 主要內容區 (左右兩欄) === */}
          <View style={styles.contentRow}>
            
            {/* --- 左側：警示紀錄區 --- */}
            <View style={styles.logSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>最近警示紀錄</Text>
                <TouchableOpacity onPress={() => setAlertLogs([])}>
                  <FontAwesome name="trash-o" size={18} color="#999" />
                </TouchableOpacity>
              </View>
              
              {alertLogs.map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <View style={styles.logIcon}>
                    <FontAwesome name="exclamation-triangle" size={14} color="#F06E6E" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logMsg}>{log.msg}</Text>
                    <Text style={styles.logTime}>{log.date} {log.time}</Text>
                  </View>
                </View>
              ))}
              {alertLogs.length === 0 && <Text style={styles.emptyText}>太棒了！目前環境一切正常，暫無警示紀錄。</Text>}
            </View>

            {/* --- 右側：閾值設定區 --- */}
            <View style={styles.settingSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>允許接受範圍設定</Text>
              </View>
              
              {renderRangeSetting('環境溫度', tempRange, setTempRange, 0, 50, '°C')}
              {renderRangeSetting('土壤濕度', humidRange, setHumidRange, 0, 100, '%')}
              {renderRangeSetting('二氧化碳', co2Range, setCo2Range, 0, 2000, 'ppm')}

              <View style={styles.saveContainer}>
                <TouchableOpacity style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>儲存警示條件</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E2328' },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  mainLayout: { width: '100%', maxWidth: 1000, padding: 30 },
  
  // 導覽列
  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, width: '100%' },
  navLeftGroup: { flex: 1, flexDirection: 'row', gap: 25, alignItems: 'center' },
  navRightGroup: { marginLeft: 'auto' },
  navItem: { paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  navItemActive: { borderBottomColor: '#5A8B73' },
  navText: { color: '#999', fontSize: 16 },
  navTextActive: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // 內容區排版 (改為兩欄對分)
  contentRow: { flexDirection: 'row', gap: 30 },
  logSection: { flex: 1, backgroundColor: '#2A2F35', borderRadius: 16, padding: 25, borderWidth: 1, borderColor: '#3E444A' },
  settingSection: { flex: 1.5, backgroundColor: '#2A2F35', borderRadius: 16, padding: 25, borderWidth: 1, borderColor: '#3E444A' },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  
  // 紀錄列表樣式
  logItem: { 
    flexDirection: 'row', 
    backgroundColor: '#1E2328', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 12,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#F06E6E'
  },
  logIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(240, 110, 110, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  logMsg: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  logTime: { color: '#888', fontSize: 12, marginTop: 4 },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 80, lineHeight: 22 },

  // 設定卡片樣式
  settingCard: { 
    backgroundColor: '#1E2328', 
    borderRadius: 12, 
    padding: 20, 
    marginBottom: 20 
  },
  settingHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  settingLabel: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  rangeValueText: { color: '#5A8B73', fontWeight: 'bold', fontSize: 15 },
  
  sliderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15 },
  limitText: { color: '#888', fontSize: 13, width: 30, textAlign: 'center' },
  
  helperText: { color: '#999', fontSize: 12, marginTop: 10, textAlign: 'center' },

  saveContainer: { alignItems: 'flex-end', marginTop: 10 },
  saveButton: { backgroundColor: '#5A8B73', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 },
  saveButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
});