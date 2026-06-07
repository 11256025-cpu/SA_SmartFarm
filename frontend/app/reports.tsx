/*
 * frontend/app/reports.tsx - 報表頁面，提供環境數據的圖表顯示與灌溉統計。
 */
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, LayoutChangeEvent, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { BarChart, LineChart } from 'react-native-chart-kit';
import PageShell from '../components/PageShell';
import { colors, radii, spacing, typography } from '../components/sharedStyles';

const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

// 定義從資料庫取得的環境紀錄資料型別
interface DbRecord {
  temperature: number;
  humidity: number;
  co2: number;
  light: number;
  timeStr: string;
}

export default function ReportsScreen() {
  // 取得今天的日期字串 (格式: YYYY-MM-DD)，作為預設的查詢起始日
  const todayStr = new Date().toISOString().split('T')[0];
  // 狀態變數：查詢日期的起訖狀態 (用於日曆選取)
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>('');
  
  // 狀態變數：紀錄使用者勾選要顯示哪些圖表，預設顯示四大環境數據圖表
  const [selectedCharts, setSelectedCharts] = useState<string[]>(['temp', 'humid', 'light', 'co2']);
  // 狀態變數：動態記錄右側圖表區塊的真實寬度，以便讓 Chart.js 能夠自適應排版 (RWD)
  const [chartWidth, setChartWidth] = useState<number>(Dimensions.get('window').width * 0.5);

  // 狀態變數：儲存整理過後的環境歷史圖表數據 (供 LineChart 使用)
  const [dbChartData, setDbChartData] = useState<{
    labels: string[];
    temp: number[];
    humid: number[];
    light: number[];
    co2: number[];
  }>({ labels: [], temp: [], humid: [], light: [], co2: [] });
  
  // 狀態變數：儲存灌溉次數統計的圖表數據 (供 BarChart 使用)
  const [irrigationData, setIrrigationData] = useState<{ labels: string[]; counts: number[]; totalCount: number; manualCount: number; autoCount: number }>({ labels: [], counts: [], totalCount: 0, manualCount: 0, autoCount: 0 });

  // 核心功能：向後端 API 取得所選日期區間的歷史環境數據
  const fetchHistoryData = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId') || '1';
      // 若使用者只選了一天 (endDate 為空)，則起訖日視為同一天
      const finalEndDate = endDate || startDate;

      console.log(`📡 前端發送請求 -> 日期區間: ${startDate} ~ ${finalEndDate}, 使用者: ${userId}`);

      const response = await fetch(`${BASE_URL}/api/reports/history?startDate=${startDate}&endDate=${finalEndDate}&userId=${userId}`);
      const json = await response.json();

      if (json.success && Array.isArray(json.historyData) && json.historyData.length > 0) {
        let records: DbRecord[] = json.historyData;

        // 💡 效能優化 (降採樣 Downsampling)：解決圖表資料點過於密集的關鍵
        // 如果一段時間內有成百上千筆資料，全部畫在手機畫面上會卡頓且看不清楚。
        // 這裡設定最多顯示 15 個點，當資料超過時，進行等距抽樣 (Skipping)
        const maxDataPoints = 15;
        if (records.length > maxDataPoints) {
          // 計算每隔幾筆抽樣一次
          const sampleInterval = Math.ceil(records.length / maxDataPoints);
          // 留下整除的點，且強制保留最後一筆確保趨勢結尾正確
          records = records.filter((_, index) => index % sampleInterval === 0 || index === records.length - 1);
        }

        const totalRecords = records.length;
        // 💡 為了避免 X 軸的時間標籤文字重疊，動態計算標籤顯示間隔 (最多顯示約 5 個標籤)
        const labelInterval = Math.ceil(totalRecords / 5); 

        const labels = records.map((r, index) => {
          // 只在特定間隔、開頭或結尾顯示時間標籤，其餘回傳空字串隱藏
          if (index === 0 || index === totalRecords - 1 || index % labelInterval === 0) {
            return r.timeStr || '';
          }
          return ''; 
        });

        // 分別將各項環境數據抽離成陣列，供圖表套件讀取
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

  // 核心功能：取得灌溉統計數據
  const fetchIrrigationStats = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId') || '1';
      const finalEndDate = endDate || startDate;
      
      // 向後端請求該區間的灌溉統計
      const response = await fetch(`${BASE_URL}/api/reports/irrigation-count?userId=${userId}&startDate=${startDate}&endDate=${finalEndDate}`);
      const json = await response.json();
      if (json.success) {
        // 將後端回傳的 X 軸 (日期/時間) 與 Y 軸 (次數) 存入狀態
        setIrrigationData({
          labels: Array.isArray(json.labels) ? json.labels : [],
          counts: Array.isArray(json.counts) ? json.counts : [],
          totalCount: Number(json.totalCount) || 0,
          manualCount: Number(json.manualCount) || 0,
          autoCount: Number(json.autoCount) || 0,
        });
      } else {
        setIrrigationData({ labels: [], counts: [], totalCount: 0, manualCount: 0, autoCount: 0 });
      }
    } catch (error) {
      console.error('❌ 抓取灌溉統計失敗:', error);
      setIrrigationData({ labels: [], counts: [], totalCount: 0, manualCount: 0, autoCount: 0 });
    }
  };

  // 觸發器：當 startDate 或 endDate 狀態改變時，自動重新抓取資料
  useEffect(() => {
    fetchHistoryData();
    fetchIrrigationStats();
  }, [startDate, endDate]);

  // 處理日曆點擊事件，實現「點擊兩次選取一個區間」的邏輯
  const handleDayPress = (day: DateData) => {
    if (!startDate || (startDate && endDate)) {
      // 情境 A：目前還沒選，或是已經選好了一組起訖日。此時點擊當作「重新選擇起始日」
      setStartDate(day.dateString);
      setEndDate('');
    } else {
      // 情境 B：已經有起始日，等待選擇結束日
      const date1 = new Date(startDate);
      const date2 = new Date(day.dateString);
      if (date2 < date1) {
        // 防呆：如果點擊的第二天比第一天還早，則視為重新選擇起始日
        setStartDate(day.dateString);
      } else {
        // 正常選取結束日
        setEndDate(day.dateString);
      }
    }
  };

  // 💡 效能優化：產生給 react-native-calendars 顯示的標記日期陣列
  // 使用 useMemo 避免每次元件重新渲染 (如：調整圖表寬度時) 都去跑一次 while 迴圈計算日期
  const markedDates = useMemo(() => {
    if (!startDate) return {};
    const marked: Record<string, any> = {};
    // 若只有起始日，僅標記單天
    if (!endDate) {
      marked[startDate] = { startingDay: true, endingDay: true, color: '#2e4f45', textColor: '#FFF' };
      return marked;
    }
    
    // 若有起訖日，透過迴圈將區間內的所有日期都標記上顏色
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      if (dateStr === startDate) {
        // 區間起點
        marked[dateStr] = { startingDay: true, color: '#2e4f45', textColor: '#FFF' };
      } else if (dateStr === endDate) {
        // 區間終點
        marked[dateStr] = { endingDay: true, color: '#2e4f45', textColor: '#FFF' };
      } else {
        // 區間中間的日子
        marked[dateStr] = { color: '#47695e', textColor: '#FFF' };
      }
      current.setDate(current.getDate() + 1);
    }
    return marked;
  }, [startDate, endDate]);

  // 切換圖表顯示狀態 (將圖表 key 從陣列中加入或移除)
  const toggleChart = (key: string) => {
    setSelectedCharts(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  // 💡 圖表選項清單設定
  // 將圖表名稱、顏色以及對應的圖表類型 (折線圖 line / 長條圖 bar) 定義成陣列，方便使用 map 渲染
  const chartOptions = [
    { key: 'temp', label: '溫度變化圖 (°C)', color: '#F06E6E', type: 'line' },
    { key: 'humid', label: '土壤濕度圖 (%)', color: '#4C84FF', type: 'line' },
    { key: 'light', label: '光照強度圖 (lux)', color: '#F39C12', type: 'line' },
    { key: 'co2', label: '二氧化碳濃度 (ppm)', color: '#9B59B6', type: 'line' },
    { key: 'irrigation', label: '灌溉次數統計', color: '#2ECC71', type: 'bar' },
  ];

  // 當右側容器大小改變時觸發，用來更新 chartWidth，讓圖表寬度能填滿版面
  const onRightPanelLayout = (event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
  };

  // === 畫面渲染區 ===
  return (
    <PageShell
      active="reports"
      left={(
        <>
          <Text style={styles.panelTitle}>報表查詢條件</Text>
          {/* 左側：日曆選取器 */}
          <View style={styles.controlBox}>
            <Text style={styles.controlLabel}>選擇查詢日期區間</Text>
            <View key="calendar-container" style={styles.calendarWrapper}>
              <Calendar
                markingType={'period'}
                markedDates={markedDates}
                onDayPress={handleDayPress}
                theme={{ calendarBackground: colors.leftPanel, dayTextColor: colors.text, monthTextColor: colors.text, arrowColor: colors.secondary }}
              />
            </View>
          </View>

          {/* 左側：圖表顯示開關 */}
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
        // 右側：圖表顯示區塊，綁定 onLayout 獲取實時寬度
        <View style={styles.rightWrapper} onLayout={onRightPanelLayout}>
          <ScrollView contentContainerStyle={styles.chartScrollContainer}>
            {/* 走訪所有已勾選的圖表並渲染出來 */}
            {chartWidth > 0 && selectedCharts.map((key) => {
              const opt = chartOptions.find(o => o.key === key);
              if (!opt) return null;

              // 防呆檢查：如果資料量少於 2 筆，折線圖會畫不出來，顯示提示訊息
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

              // 💡 共用的圖表設定 (ChartConfig)
              // 包含背景透明、格線顏色等 react-native-chart-kit 的底層設定
              const commonChartConfig = {
                backgroundGradientFrom: colors.card, 
                backgroundGradientTo: colors.card, 
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => colors.muted,
                propsForDots: { r: "3", strokeWidth: "1", stroke: opt.color }
              };

              return (
                <View key={key} style={styles.chartCard}>
                  <Text style={styles.chartTitle}>{opt.label}</Text>
                  {/* 若為灌溉統計，顯示加總文字 */}
                  {opt.key === 'irrigation' && (
                    <Text style={styles.chartSummary}>共執行灌溉 {irrigationData.totalCount} 次，手動 {irrigationData.manualCount} 次，自動 {irrigationData.autoCount} 次</Text>
                  )}
                  
                  {/* 💡 根據圖表設定的 type 動態渲染 長條圖 (BarChart) 或 折線圖 (LineChart) */}
                  {opt.type === 'bar' ? (
                    <BarChart
                      data={{
                        labels: opt.key === 'irrigation' ? irrigationData.labels : dbChartData.labels.filter(l => l !== ''),
                        datasets: [{ data: opt.key === 'irrigation' ? irrigationData.counts : (dbChartData[key as keyof typeof dbChartData] as number[]).filter(v => v > 0) || [] }]
                      }}
                      width={chartWidth - 55}
                      height={220}
                      chartConfig={{
                        ...commonChartConfig,
                        fillShadowGradient: opt.color,
                        fillShadowGradientOpacity: 0.8,
                      }}
                      yAxisLabel=""
                      yAxisSuffix=""
                      showValuesOnTopOfBars
                    />
                  ) : (
                    <LineChart
                      data={{ 
                        labels: dbChartData.labels, 
                        datasets: [{ data: dbChartData[key as keyof typeof dbChartData] as number[] || [], color: () => opt.color }] 
                      }}
                      width={chartWidth - 55}
                      height={220}
                      chartConfig={commonChartConfig}
                      bezier
                    />
                  )}
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
  chartSummary: { color: colors.subMuted, fontSize: typography.body, marginBottom: spacing.sm },
  noDataContainer: { height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: radii.md }
});