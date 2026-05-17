import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function EnvironmentScreen() {
  const [humidity, setHumidity] = useState(25);
  const [showWarning, setShowWarning] = useState(false);

  // 當濕度低於 30% 時自動觸發異常警示
  useEffect(() => {
    if (humidity < 30) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [humidity]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.innerContainer}>
          
          {/* === 頂部導覽列 === */}
          <View style={styles.topNav}>
            <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/alerts')}>
              <Text style={styles.navText}>警示設定</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.navItem, styles.navItemActive]} onPress={() => router.replace('/environment')}>
              <Text style={styles.navTextActive}>環境總覽</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/crops')}>
              <Text style={styles.navText}>作物管理</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/reports')}>
              <Text style={styles.navText}>報表統計</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/profile')}>
              <FontAwesome name="user-o" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* === 警示框外層容器 (用來控制水平向右對齊) === */}
          {showWarning && (
            <View style={styles.warningWrapper}>
              <TouchableOpacity 
                style={styles.warningToast}
                onPress={() => router.replace('/alerts')}
              >
                <FontAwesome name="exclamation-circle" size={16} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.warningText}>濕度異常，請盡速進行灌溉作業</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* === 四宮格數據卡片區 === */}
          <View style={styles.gridContainer}>
            {/* 溫度卡片 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>溫度</Text>
              <View style={styles.cardValueContainer}>
                <Text style={styles.cardValue}>25 <Text style={styles.cardUnit}>°C</Text></Text>
              </View>
            </View>

            {/* 光照強度卡片 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                <FontAwesome name="sun-o" size={14} color="#DDD" /> 光照強度
              </Text>
              <View style={styles.cardValueContainer}>
                <Text style={styles.cardValue}>100,000 <Text style={styles.cardUnit}>lux</Text></Text>
              </View>
            </View>

            {/* 土壤濕度卡片 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>土壤濕度</Text>
              <View style={styles.cardValueContainer}>
                <Text style={styles.cardValue}>{humidity} <Text style={styles.cardUnit}>%</Text></Text>
              </View>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setHumidity(50)}
              >
                <Text style={styles.actionButtonText}>手動灌溉</Text>
              </TouchableOpacity>
            </View>

            {/* 二氧化碳濃度卡片 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>二氧化碳濃度</Text>
              <View style={styles.cardValueContainer}>
                <Text style={styles.cardValue}>80 <Text style={styles.cardUnit}>%</Text></Text>
              </View>
            </View>
          </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E2328', // 主底色
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center', // 確保網頁版網頁置中
  },
  innerContainer: {
    width: '100%',
    maxWidth: 800, // 限制最大寬度，完美還原設計比例
    padding: 30,
  },
  // --- 頂部導覽列樣式 ---
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  navItem: {
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  navItemActive: {
    borderBottomColor: '#5A8B73', // 綠色底線
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
  // --- 紅色提示框樣式 ---
  warningWrapper: {
    alignItems: 'flex-end', // 靠右對齊
    marginBottom: 20,
  },
  warningToast: {
    backgroundColor: '#F06E6E', // 鮭魚紅
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20, // 圓角邊框
  },
  warningText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  // --- 四宮格數據卡片樣式 (無絕對定位，絕不重疊) ---
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#32383E', // 卡片深灰色
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    minHeight: 180, // 給予充足高度
    justifyContent: 'space-between', // 讓標題、數值、按鈕由上至下垂直均分
  },
  cardTitle: {
    color: '#AAA',
    fontSize: 15,
  },
  cardValueContainer: {
    flex: 1,
    justifyContent: 'center', // 數值區塊垂直置中
    alignItems: 'center', // 數值區塊水平置中
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
  actionButton: {
    backgroundColor: '#4A7561', // 莫蘭迪綠按鈕
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
  }
});