import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const mockChartData = {
  labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
  temp: [22, 21, 24, 28, 26, 23],
  humid: [60, 65, 55, 45, 50, 58],
  light: [0, 0, 15000, 85000, 45000, 0],
  co2: [400, 420, 380, 350, 390, 410],
};

export default function ReportsScreen() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCharts, setSelectedCharts] = useState<string[]>(['temp', 'humid', 'light', 'co2']);

  const handleDayPress = (day: any) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(day.dateString);
      setEndDate('');
    } else {
      const date1 = new Date(startDate);
      const date2 = new Date(day.dateString);
      if (date2 < date1) setStartDate(day.dateString);
      else setEndDate(day.dateString);
    }
  };

  const toggleChart = (key: string) => {
    setSelectedCharts(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const chartOptions = [
    { key: 'temp', label: '溫度變化圖 (°C)', color: '#F06E6E' },
    { key: 'humid', label: '土壤濕度圖 (%)', color: '#4C84FF' },
    { key: 'light', label: '光照強度圖 (lux)', color: '#F39C12' },
    { key: 'co2', label: '二氧化碳濃度 (ppm)', color: '#9B59B6' },
  ];

  return (
    <SafeAreaView style={styles.container}>
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

      <View style={styles.mainLayout}>
        <View style={styles.leftPanel}>
          <Text style={styles.panelTitle}>報表查詢條件</Text>
          <View style={styles.controlBox}>
            <Text style={styles.controlLabel}>選擇查詢日期區間</Text>
            <View key="calendar-container" style={styles.calendarWrapper}>
              <Calendar
                markingType={'period'}
                markedDates={{ [startDate]: { startingDay: true, color: '#4C84FF' }, [endDate]: { endingDay: true, color: '#4C84FF' } }}
                onDayPress={handleDayPress}
                theme={{ calendarBackground: '#161920', dayTextColor: '#FFF', monthTextColor: '#FFF', arrowColor: '#4C84FF' }}
              />
            </View>
          </View>

          <View style={styles.controlBox}>
            <Text style={styles.controlLabel}>選擇顯示圖表</Text>
            {chartOptions.map((chart) => (
              <TouchableOpacity key={chart.key} style={[styles.checkboxRow, selectedCharts.includes(chart.key) && styles.checkboxRowActive]} onPress={() => toggleChart(chart.key)}>
                <FontAwesome name={selectedCharts.includes(chart.key) ? "check-square" : "square-o"} size={20} color={selectedCharts.includes(chart.key) ? chart.color : '#7F848E'} />
                <Text style={styles.checkboxText}>{chart.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.rightPanel}>
          <ScrollView contentContainerStyle={styles.chartScrollContainer}>
            {screenWidth > 0 && selectedCharts.map((key) => {
              const opt = chartOptions.find(o => o.key === key);
              if (!opt) return null;
              return (
                <View key={key} style={styles.chartCard}>
                  <Text style={styles.chartTitle}>{opt.label}</Text>
                  <LineChart
                    data={{ labels: mockChartData.labels, datasets: [{ data: mockChartData[key as keyof typeof mockChartData], color: () => opt.color }] }}
                    width={screenWidth * 0.53}
                    height={220}
                    chartConfig={{ backgroundGradientFrom: "#161920", backgroundGradientTo: "#161920", color: (opacity=1) => `rgba(255, 255, 255, ${opacity})` }}
                    bezier
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E222B' },
  topNav: { height: 60, backgroundColor: '#161920', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'relative', paddingHorizontal: 24 },
  navLeftGroup: { flexDirection: 'row', alignItems: 'center', gap: 24, justifyContent: 'center' },
  navRightGroup: { position: 'absolute', right: 24, flexDirection: 'row', alignItems: 'center' },
  header: { height: 60, backgroundColor: '#161920', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 },
  brandText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  headerRight: { flexDirection: 'row', gap: 24 },
  headerIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerIconText: { color: '#9EA3AE', fontSize: 13 },
  mainLayout: { flex: 1, flexDirection: 'row', padding: 25, gap: 25 },
  leftPanel: { width: '38%', backgroundColor: '#161920', borderRadius: 16, padding: 24 },
  panelTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  controlBox: { marginBottom: 25 },
  controlLabel: { color: '#7F848E', fontSize: 14, marginBottom: 12 },
  calendarWrapper: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#2C313D' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#1B202A', borderRadius: 10, marginBottom: 8 },
  checkboxRowActive: { borderColor: '#4C84FF', borderWidth: 1 },
  checkboxText: { color: '#AAA', marginLeft: 12 },
  rightPanel: { width: '62%', flex: 1 },
  navTabs: { flexDirection: 'row', gap: 25, marginBottom: 25, borderBottomWidth: 1, borderBottomColor: '#2C313D', paddingBottom: 10 },
  navItem: { paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  navItemActive: { borderBottomColor: '#5A8B73' },
  navText: { color: '#999' },
  navTextActive: { color: '#FFF', fontWeight: 'bold' },
  chartScrollContainer: { paddingBottom: 30 },
  chartCard: { backgroundColor: '#161920', borderRadius: 16, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: '#252A34' },
  chartTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 15 }
});