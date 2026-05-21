import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, LayoutChangeEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { LineChart } from 'react-native-chart-kit';
import PageShell from '../components/PageShell';
import { colors, radii, spacing, typography } from '../components/sharedStyles';

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
  const [chartWidth, setChartWidth] = useState<number>(Dimensions.get('window').width * 0.5);

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

  // 計算起訖之間所有日期並標記
const getMarkedDates = () => {
  if (!startDate) return {};
  
  const marked: any = {};
  
  // 只選了起始日
  if (!endDate) {
    marked[startDate] = { startingDay: true, endingDay: true, color: '#2e4f45', textColor: '#FFF' };
    return marked;
  }

  // 起訖都選了，填滿中間
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
            return (
              <View key={key} style={styles.chartCard}>
                <Text style={styles.chartTitle}>{opt.label}</Text>
                <LineChart
                  data={{ labels: mockChartData.labels, datasets: [{ data: mockChartData[key as keyof typeof mockChartData], color: () => opt.color }] }}
                    width={chartWidth - 55}
                  height={220}
                    chartConfig={{ backgroundGradientFrom: colors.card, backgroundGradientTo: colors.card, color: (opacity=1) => `rgba(255, 255, 255, ${opacity})` }}
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
  chartTitle: { color: colors.text, fontSize: typography.large, fontWeight: 'bold', marginBottom: spacing.md }
});