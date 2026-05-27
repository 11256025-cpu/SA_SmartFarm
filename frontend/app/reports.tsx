import { FontAwesome } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { Dimensions, LayoutChangeEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { LineChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PageShell from '../components/PageShell';
import { colors, radii, spacing, typography } from '../components/sharedStyles';

const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

interface DbRecord {
  temperature: number;
  humidity: number;
  co2: number;
  light: number;
  timeStr: string;
}

export default function ReportsScreen() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>('');
  
  const [selectedCharts, setSelectedCharts] = useState<string[]>(['temp', 'humid', 'light', 'co2']);
  const [chartWidth, setChartWidth] = useState<number>(Dimensions.get('window').width * 0.5);

  const [dbChartData, setDbChartData] = useState<{
    labels: string[];
    temp: number[];
    humid: number[];
    light: number[];
    co2: number[];
  }>({ labels: [], temp: [], humid: [], light: [], co2: [] });

  const fetchHistoryData = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId') || '1';
      const finalEndDate = endDate || startDate;

      console.log(`📡 前端發送請求 -> 日期區間: ${startDate} ~ ${finalEndDate}, 使用者: ${userId}`);

      const response = await fetch(`${BASE_URL}/api/reports/history?startDate=${startDate}&endDate=${finalEndDate}&userId=${userId}`);
      const json = await response.json();

      if (json.success && Array.isArray(json.historyData) && json.historyData.length > 0) {
        let records: DbRecord[] = json.historyData;

        // 💡 解決點點與格線過於密集的關鍵：當資料量大時進行等距抽樣
        // 將圖表上的資料點限制在最多 15 個，線條與背景網格就會變得非常乾淨、不擁擠
        const maxDataPoints = 15;
        if (records.length > maxDataPoints) {
          const sampleInterval = Math.ceil(records.length / maxDataPoints);
          records = records.filter((_, index) => index % sampleInterval === 0 || index === records.length - 1);
        }

        const totalRecords = records.length;
        // 畫面上最多顯示 5 個 X 軸時間標籤，避免文字重疊
        const labelInterval = Math.ceil(totalRecords / 5); 

        const labels = records.map((r, index) => {
          if (index === 0 || index === totalRecords - 1 || index % labelInterval === 0) {
            return r.timeStr || '';
          }
          return ''; // 不顯示的標籤給空字串，套件會自動留空
        });

        const temp = records.map(r => Number(r.temperature) || 0);
        const humid = records.map(r => Number(r.humidity) || 0);
        const light = records.map(r => Number(r.light) || 0);
        const co2 = records.map(r => Number(r.co2) || 0);

        setDbChartData({ labels, temp, humid, light, co2 });
      } else {
        setDbChartData({ labels: [], temp: [], humid: [], light: [], co2: [] });
      }
    } catch (error) {
      console.error('❌ 前端抓取歷史報表失敗:', error);
      setDbChartData({ labels: [], temp: [], humid: [], light: [], co2: [] });
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, [startDate, endDate]);

  const handleDayPress = (day: any) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(day.dateString);
      setEndDate('');
    } else {
      const date1 = new Date(startDate);
      const date2 = new Date(day.dateString);
      if (date2 < date1) {
        setStartDate(day.dateString);
      } else {
        setEndDate(day.dateString);
      }
    }
  };

  const getMarkedDates = () => {
    if (!startDate) return {};
    const marked: any = {};
    if (!endDate) {
      marked[startDate] = { startingDay: true, endingDay: true, color: '#2e4f45', textColor: '#FFF' };
      return marked;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      if (dateStr === startDate) {
        marked[dateStr] = { startingDay: true, color: '#2e4f45', textColor: '#FFF' };
      } else if (dateStr === endDate) {
        marked[dateStr] = { endingDay: true, color: '#2e4f45', textColor: '#FFF' };
      } else {
        marked[dateStr] = { color: '#47695e', textColor: '#FFF' };
      }
      current.setDate(current.getDate() + 1);
    }
    return marked;
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

  const onRightPanelLayout = (event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
  };

  return (
    <PageShell
      active="reports"
      left={(
        <>
          <Text style={styles.panelTitle}>報表查詢條件</Text>
          <View style={styles.controlBox}>
            <Text style={styles.controlLabel}>選擇查詢日期區間</Text>
            <View key="calendar-container" style={styles.calendarWrapper}>
              <Calendar
                markingType={'period'}
                markedDates={getMarkedDates()}
                onDayPress={handleDayPress}
                theme={{ calendarBackground: colors.leftPanel, dayTextColor: colors.text, monthTextColor: colors.text, arrowColor: colors.secondary }}
              />
            </View>
          </View>

          <View style={styles.controlBox}>
            <Text style={styles.controlLabel}>選擇顯示圖表</Text>
            {chartOptions.map((chart) => (
              <TouchableOpacity key={chart.key} style={[styles.checkboxRow, selectedCharts.includes(chart.key) && styles.checkboxRowActive]} onPress={() => toggleChart(chart.key)}>
                <FontAwesome name={selectedCharts.includes(chart.key) ? "check-square" : "square-o"} size={20} color={selectedCharts.includes(chart.key) ? chart.color : colors.muted} />
                <Text style={styles.checkboxText}>{chart.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      right={(
        <View style={styles.rightWrapper} onLayout={onRightPanelLayout}>
          <ScrollView contentContainerStyle={styles.chartScrollContainer}>
            {chartWidth > 0 && selectedCharts.map((key) => {
              const opt = chartOptions.find(o => o.key === key);
              if (!opt) return null;

              if (!dbChartData.labels || dbChartData.labels.length < 2) {
                return (
                  <View key={key} style={styles.chartCard}>
                    <Text style={styles.chartTitle}>{opt.label}</Text>
                    <View style={styles.noDataContainer}>
                      <Text style={{ color: colors.muted, textAlign: 'center', paddingHorizontal: 10 }}>
                        {dbChartData.labels && dbChartData.labels.length === 1 
                          ? '⏳ 歷史數據累積中（折線圖繪製至少需要 2 筆以上的資料點）...' 
                          : '⚠️ 所選日期區間目前無足夠歷史暫存數據'}
                      </Text>
                    </View>
                  </View>
                );
              }

              return (
                <View key={key} style={styles.chartCard}>
                  <Text style={styles.chartTitle}>{opt.label}</Text>
                  <LineChart
                    data={{ 
                      labels: dbChartData.labels, 
                      datasets: [{ data: dbChartData[key as keyof typeof dbChartData] || [], color: () => opt.color }] 
                    }}
                    width={chartWidth - 55}
                    height={220}
                    chartConfig={{ 
                      backgroundGradientFrom: colors.card, 
                      backgroundGradientTo: colors.card, 
                      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      labelColor: (opacity = 1) => colors.muted,
                      propsForDots: { r: "3", strokeWidth: "1", stroke: opt.color }
                    }}
                    propsForHorizontalLabels={{ fontSize: 10 }}
                    propsForVerticalLabels={{ fontSize: 10 }}
                    bezier
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  panelTitle: { color: colors.text, fontSize: typography.h2, fontWeight: 'bold', marginBottom: spacing.lg },
  controlBox: { marginBottom: spacing.xl },
  controlLabel: { color: colors.muted, fontSize: typography.body, marginBottom: spacing.md },
  calendarWrapper: { borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.border, borderRadius: radii.md, marginBottom: spacing.sm },
  checkboxRowActive: { borderColor: colors.secondary, borderWidth: 1 },
  checkboxText: { color: colors.subMuted, marginLeft: spacing.md, fontSize: typography.body },
  rightWrapper: { flex: 1, width: '100%' },
  chartScrollContainer: { paddingBottom: 30 },
  chartCard: { backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.xl, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  chartTitle: { color: colors.text, fontSize: typography.large, fontWeight: 'bold', marginBottom: spacing.md },
  noDataContainer: { height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: radii.md }
});