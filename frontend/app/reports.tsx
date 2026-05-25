import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Dimensions, LayoutChangeEvent, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { LineChart } from 'react-native-chart-kit';
import PageShell from '../components/PageShell';
import { colors, radii, spacing, typography } from '../components/sharedStyles';

// ⚠️ 實機測試注意：請將下方的 IP 換成你電腦真正的 Wi-Fi IPv4 位址！
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export default function ReportsScreen() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCharts, setSelectedCharts] = useState<string[]>(['temp', 'humid', 'light', 'co2']);
  const [chartWidth, setChartWidth] = useState<number>(Dimensions.get('window').width * 0.5);
  const [currentMonthStr, setCurrentMonthStr] = useState<string>(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);

  // 💡 儲存從後端抓回來的圖表資料
  const [chartData, setChartData] = useState({
    labels: ["00:00", "00:00", "00:00", "00:00", "00:00", "00:00"],
    temp: [0, 0, 0, 0, 0, 0],
    humid: [0, 0, 0, 0, 0, 0],
    light: [0, 0, 0, 0, 0, 0],
    co2: [0, 0, 0, 0, 0, 0],
  });

  // 💡 初始化：從後端載入歷史紀錄
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        let uid = await AsyncStorage.getItem('userId') || '1';
        
        // 💡 判斷日期區間，只選一天時也當作那一整天的起訖
        const queryStart = startDate;
        const queryEnd = endDate || startDate;
        
        let url = `${BASE_URL}/api/history?userId=${uid}&limit=12`;
        if (queryStart) {
          url += `&startDate=${queryStart}&endDate=${queryEnd}`;
        }

        // 呼叫 history API 取得最新數據
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.data) {
          const history = data.data;
          if (history.length > 0) {
            setChartData({
              labels: history.map((d: any) => {
                const date = new Date(d.record_time);
                // 💡 加上日期顯示 (如: 5/19 14:00) 這樣跨日才分得清楚
                return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
              }),
              temp: history.map((d: any) => d.history_temp),
              humid: history.map((d: any) => d.history_soil_moisture),
              light: history.map((d: any) => d.history_light),
              co2: history.map((d: any) => d.history_co2),
            });
          } else {
            // 💡 若該日期沒有資料，則清空圖表防呆
            setChartData({
              labels: ["查無資料", "無資料"],
              temp: [0, 0],
              humid: [0, 0],
              light: [0, 0],
              co2: [0, 0],
            });
          }
        }
      } catch (error) {
        console.error('無法載入歷史紀錄:', error);
      }
    };
    fetchHistory();
  }, [startDate, endDate]); // 如果未來後端支援日期範圍查詢，選擇日期後會自動重拉資料

  const handleDayPress = (day: any) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(day.dateString);
      setEndDate('');
    } else {
      const date1 = new Date(startDate);
      const date2 = new Date(day.dateString);
            if (date2 < date1) {
              // 💡 自動調換順序：後點的日期較早時，新的變起始日，原起始日變結束日
              setStartDate(day.dateString);
              setEndDate(startDate);
            } else {
              setEndDate(day.dateString);
            }
    }
  };

  // 計算起訖之間所有日期並標記
const getMarkedDates = () => {
  const marked: any = {};
  
  // 💡 預先將前後一年的假日 (六、日) 標記為紅色字體
  const today = new Date();
  const year = today.getFullYear();
  for (let y = year - 1; y <= year + 1; y++) {
    for (let m = 0; m < 12; m++) {
      const d = new Date(y, m, 1);
      const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
      const isCurrentMonth = monthStr === currentMonthStr;

      while (d.getMonth() === m) {
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // 使用本地端時間格式化，避免時區偏差
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          // 💡 判斷是否為當月，非當月的假日顏色變暗
          marked[dateStr] = { textColor: isCurrentMonth ? colors.alert : 'rgba(240, 110, 110, 0.3)' };
        }
        d.setDate(d.getDate() + 1);
      }
    }
  }

  if (!startDate) return marked;

  // 只選了起始日
  if (!endDate) {
    marked[startDate] = { ...marked[startDate], startingDay: true, endingDay: true, color: '#2e4f45', textColor: '#FFF' };
    return marked;
  }

  // 起訖都選了，填滿中間
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      const isSunday = current.getDay() === 0; // 週日 (每週的開始)
      const isSaturday = current.getDay() === 6; // 週六 (每週的結束)
      
      if (dateStr === startDate && dateStr === endDate) {
        marked[dateStr] = { ...marked[dateStr], startingDay: true, endingDay: true, color: '#2e4f45', textColor: '#FFF' };
      } else if (dateStr === startDate) {
        marked[dateStr] = { ...marked[dateStr], startingDay: true, endingDay: isSaturday, color: '#2e4f45', textColor: '#FFF' };
      } else if (dateStr === endDate) {
        marked[dateStr] = { ...marked[dateStr], startingDay: isSunday, endingDay: true, color: '#2e4f45', textColor: '#FFF' };
      } else {
        // 💡 跨行的關鍵：週日加上左圓角，週六加上右圓角
        marked[dateStr] = { ...marked[dateStr], startingDay: isSunday, endingDay: isSaturday, color: '#47695e', textColor: '#FFF' };
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
                onMonthChange={(month: any) => {
                  setCurrentMonthStr(`${month.year}-${String(month.month).padStart(2, '0')}`);
                }}
                theme={{ 
                  calendarBackground: colors.leftPanel, 
                  dayTextColor: colors.text, 
                  monthTextColor: colors.text, 
                  arrowColor: colors.secondary,
                  textDayOtherMonthColor: 'rgba(255, 255, 255, 0.2)', // 💡 一般非當月日期變暗
                  'stylesheet.calendar.header': {
                    dayTextAtIndex0: { color: colors.alert }, // 💡 讓星期日標題變紅
                    dayTextAtIndex6: { color: colors.alert }  // 💡 讓星期六標題變紅
                  }
                } as any}
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
                  data={{ labels: chartData.labels, datasets: [{ data: chartData[key as keyof typeof chartData], color: () => opt.color }] }}
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