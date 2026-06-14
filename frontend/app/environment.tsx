// environment.tsx
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useNotifications } from '../components/NotificationProvider';
import PageShell from '../components/PageShell';
import { colors, radii, spacing, typography } from '../components/sharedStyles';

const BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : Platform.OS === 'web' && typeof window !== 'undefined'
    ? `http://${window.location.hostname}:3000`
    : 'http://localhost:3000';

export default function EnvironmentScreen() {
  // 1. 環境狀態變數：負責儲存與顯示控制面板及感測器當前的環境數值
  const [temperature, setTemperature] = useState(25);
  const [light, setLight] = useState(20000);
  const [humidity, setHumidity] = useState(50);
  const [co2, setCo2] = useState(800);

  // 2. 灌溉排程變數：儲存自動灌溉的頻率、持續時間與目標濕度
  const [frequency, setFrequency] = useState(2);
  const [duration, setDuration] = useState(10);
  const [targetHumidity, setTargetHumidity] = useState(60);
  
  // 取得全域通知函式，用來在畫面上方顯示推播通知
  const { addNotification } = useNotifications();
  
  // 紀錄目前已觸發的警示類型 (如：'temperature', 'humidity')，避免重複發送通知
  const [activeThresholdAlerts, setActiveThresholdAlerts] = useState<string[]>([]);
  
  // 用來追蹤使用者是否正在拖曳控制面板的滑軌
  // 如果正在操作，則暫停來自後端的數值同步更新，以免發生畫面拉扯
  const [isInteracting, setIsInteracting] = useState(false);
  
  // 追蹤是否已完成從本地 (AsyncStorage) 載入上次的設定值
  // 避免在初始化尚未完成時，就觸發自動保存而覆蓋掉正確的舊設定
  const [isLoaded, setIsLoaded] = useState(false);

  // 控制「儲存設定成功」時彈出視窗 (Modal) 的顯示與隱藏狀態，以及對應的提示訊息
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // 3. 警示閾值狀態：定義各項環境數據的安全範圍
  // (預設先給予較寬鬆的範圍，待元件掛載後會透過 API 向後端獲取真實設定並覆蓋)
  const [thresholds, setThresholds] = useState({
    tempRange: [15, 35],
    humidRange: [30, 80],
    co2Range: [400, 1000],
    lightRange: [500, 50000]
  });

  // 同步模擬器最新數據的函式
  // 會向後端抓取目前最新的模擬環境狀態，解決如「自動灌溉後濕度未即時更新」的問題
  const syncSimulatorState = async () => {
    // 防呆：如果使用者正在滑動控制面板，則先跳過本次同步，維持前端操作流暢度
    if (isInteracting) return;

    try {
      // 從本地取得使用者 ID
      const uid = await AsyncStorage.getItem('userId');
      if (!uid) return;

      // 呼叫後端 API 取得該使用者的模擬環境狀態
      const stateResp = await fetch(`${BASE_URL}/api/simulator/state?userId=${uid}`);
      const stateData = await stateResp.json();
      
      if (stateData.success && stateData.state) {
        const s = stateData.state;
        
        // 💡 核心修正：判斷若後端回傳的環境數值為異常預設值（同時滿足濕度 25 與光照 100000）
        // 則主動將環境數值修改至安全範圍內，並同步更新回後端
        if (Number(s.humidity) === 25 && Number(s.light) === 100000) {
          s.humidity = 50;
          s.light = 20000;
          fetch(`${BASE_URL}/api/simulator/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid, humidity: 50, light: 20000 }),
          }).catch(e => console.warn("自動修正環境數值失敗:", e));
        }

        // 更新 React 狀態，若從後端拿到的值存在，則覆寫當前畫面上的數值
        if (s.temperature !== undefined) setTemperature(Number(s.temperature));
        if (s.humidity !== undefined) setHumidity(Number(s.humidity));
        if (s.co2 !== undefined) setCo2(Number(s.co2));
        if (s.light !== undefined) setLight(Number(s.light));

        // 將從後端取得的最新數值一併更新到本地快取 (AsyncStorage) 中，確保下次重開 App 資料一致
        saveControlSettings({ 
          temperature: Number(s.temperature), 
          humidity: Number(s.humidity), 
          co2: Number(s.co2), 
          light: Number(s.light) 
        });
      }
    } catch (e) {
      console.warn('同步環境數據失敗', e);
    }
  };

  // 4. 向後端請求使用者的完整設定 (包含警示範圍、灌溉排程與最新環境狀態)
  const fetchSettings = async () => {
    try {
      // 檢查是否已登入，若無登入則將使用者導向登入頁面
      const uid = await AsyncStorage.getItem('userId');
      if (!uid) {
        router.replace('/(auth)/login');
        return;
      }
      // 步驟 1：向後端請求警示範圍設定
      const resp = await fetch(`${BASE_URL}/api/alerts/settings?userId=${uid}`);
      const data = await resp.json();

      // 若成功取得，則覆寫 thresholds 狀態
      if (data.success && data.settings) {
        setThresholds({
          tempRange: data.settings.tempRange || [15, 35],
          humidRange: data.settings.humidRange || [30, 80],
          co2Range: data.settings.co2Range || [400, 1000],
          lightRange: data.settings.lightRange || [500, 50000]
        });
      }

      // 步驟 2：向後端請求使用者的灌溉排程設定，若有值則覆蓋前端的排程頻率與時長
      try {
        const schedResp = await fetch(`${BASE_URL}/api/schedule?userId=${uid}`);
        const schedData = await schedResp.json();
        if (schedData.success && schedData.schedule) {
          // 更新排程的頻率與持續時間
          if (typeof schedData.schedule.frequency === 'number') setFrequency(schedData.schedule.frequency);
          if (typeof schedData.schedule.duration === 'number') setDuration(schedData.schedule.duration);
        }
      } catch (e) {
        console.warn('載入排程設定失敗', e);
      }

      // 步驟 3：向後端請求使用者的模擬器當前狀態，將其覆蓋到控制面板
      try {
        const stateResp = await fetch(`${BASE_URL}/api/simulator/state?userId=${uid}`);
        const stateData = await stateResp.json();
        if (stateData.success && stateData.state) {
          const s = stateData.state;
          
          // 💡 核心修正：判斷若後端回傳的環境數值為異常預設值（同時滿足濕度 25 與光照 100000）
          // 則主動將環境數值修改至安全範圍內，並同步更新回後端
          if (Number(s.humidity) === 25 && Number(s.light) === 100000) {
            s.humidity = 50;
            s.light = 20000;
            fetch(`${BASE_URL}/api/simulator/update`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: uid, humidity: 50, light: 20000 }),
            }).catch(e => console.warn("自動修正環境數值失敗:", e));
          }

          // 套用後端傳來的環境數值
          if (s.temperature !== undefined) setTemperature(Number(s.temperature));
          if (s.humidity !== undefined) setHumidity(Number(s.humidity));
          if (s.co2 !== undefined) setCo2(Number(s.co2));
          if (s.light !== undefined) setLight(Number(s.light));

          // 將這些數值與排程同步保存到本地端快取
          saveControlSettings({ temperature: Number(s.temperature), humidity: Number(s.humidity), co2: Number(s.co2), light: Number(s.light), frequency, duration });
        }
      } catch (e) {
        console.warn('載入模擬器當前狀態失敗', e);
      }
      // 最後確保執行一次同步，補齊可能的狀態落差
      await syncSimulatorState();
    } catch (error) {
      console.warn('載入警示設定失敗，使用預設值。', error);
    }
  };

  // 5. 將控制面板的最新數值同步回後端模擬器的非同步函式 (例如：放開滑軌時觸發)
  const updateBackendSimulator = async (updatedValues: { temperature?: number; humidity?: number; co2?: number; light?: number }) => {
    try {
      const uid = await AsyncStorage.getItem('userId');
      if (!uid) {
        // 若未登入，不允許更新，強制導回登入頁
        console.warn('未登入：無法更新模擬器，導回登入頁');
        router.replace('/(auth)/login');
        return;
      }

      // 發送 POST 請求，將最新的改變值 (updatedValues) 告訴後端資料庫
      await fetch(`${BASE_URL}/api/simulator/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          ...updatedValues
        }),
      });
    } catch (error) {
      console.error("同步後端模擬環境數據失敗:", error);
    }
  };

  // 處理手動灌溉操作的函式
  const handleManualIrrigation = async () => {
    try {
      const uid = await AsyncStorage.getItem('userId');
      if (!uid) {
        // 提示使用者先登入
        setSaveMessage('請先登入後再執行手動灌溉');
        setSaveModalVisible(true);
        return;
      }

      // 發送請求呼叫後端手動灌溉 API
      const response = await fetch(`${BASE_URL}/api/irrigation/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, targetHumidity }),
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        // 若灌溉成功，更新畫面濕度，並通知後端模擬器更新該數值
        setHumidity(Number(data.newHumidity));
        updateBackendSimulator({ humidity: Number(data.newHumidity) });
        setSaveMessage(`手動灌溉成功，已將濕度調整至 ${data.newHumidity}% 並儲存紀錄。`);
        addNotification({
          title: '手動灌溉成功',
          message: `濕度已調整至 ${data.newHumidity}% 並儲存紀錄。`,
          type: 'success',
          action: () => router.replace('/environment'),
        });
      } else {
        // 若後端拒絕或發生錯誤，顯示錯誤通知
        const message = `手動灌溉失敗：${data.message || '請稍後再試'}`;
        setSaveMessage(message);
        addNotification({
          title: '手動灌溉失敗',
          message,
          type: 'error',
        });
      }
    } catch (error) {
      // 捕捉網路異常
      console.error('手動灌溉失敗:', error);
      const message = '無法連線到伺服器，請稍後再試。';
      setSaveMessage(message);
      addNotification({
        title: '手動灌溉失敗',
        message,
        type: 'error',
      });
    } finally {
      // 不論成功或失敗，皆打開訊息彈窗提示使用者
      setSaveModalVisible(true);
    }
  };

  // The handleAutoIrrigation function is no longer used after removing the button.
  // 處理自動灌溉判斷的函式
  const handleAutoIrrigation = async () => {
    try {
      const uid = await AsyncStorage.getItem('userId');
      if (!uid) {
        // 未登入的防呆檢查
        const message = '請先登入後再執行自動灌溉';
        setSaveMessage(message);
        addNotification({
          title: '自動灌溉未執行',
          message,
          type: 'warning',
        });
        setSaveModalVisible(true);
        return;
      }

      // 檢查目前的土壤濕度是否已經在允許範圍之內，如果是，則無須灌溉
      if (!thresholds.humidRange || humidity >= thresholds.humidRange[0]) {
        const message = '土壤濕度已達標準，不需執行自動灌溉。';
        setSaveMessage(message);
        addNotification({
          title: '自動灌溉未觸發',
          message,
          type: 'info',
        });
        setSaveModalVisible(true);
        return;
      }

      // 設定自動灌溉的目標濕度，最高不超過 100%，並預設增加 20%
      const autoTargetHumidity = Math.min(100, thresholds.humidRange[1] || humidity + 20);
      // 發送請求呼叫後端自動灌溉 API
      const response = await fetch(`${BASE_URL}/api/irrigation/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, targetHumidity: autoTargetHumidity }),
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        // 若執行成功，同樣更新畫面濕度與模擬器
        setHumidity(Number(data.newHumidity));
        updateBackendSimulator({ humidity: Number(data.newHumidity) });
        const message = `自動灌溉已執行並記錄：目標濕度 ${data.targetHumidity}%，目前濕度 ${data.newHumidity}%。`;
        setSaveMessage(message);
        addNotification({
          title: '自動灌溉成功',
          message,
          type: 'success',
          action: () => router.replace('/environment'),
        });
      } else {
        // 自動灌溉被後端拒絕或發生邏輯錯誤
        const message = `自動灌溉失敗：${data.message || '請稍後再試'}`;
        setSaveMessage(message);
        addNotification({
          title: '自動灌溉失敗',
          message,
          type: 'error',
        });
      }
    } catch (error) {
      // 捕捉網路異常
      console.error('自動灌溉失敗:', error);
      const message = '無法連線到伺服器，請稍後再試。';
      setSaveMessage(message);
      addNotification({
        title: '自動灌溉失敗',
        message,
        type: 'error',
      });
    } finally {
      // 打開提示彈窗
      setSaveModalVisible(true);
    }
  };

  // 5.5 將控制面板的設定值保存到本地快取 (AsyncStorage) 中
  // 產生以使用者 ID 為基礎的專屬 Storage Key，避免不同帳號切換時互相干擾
  const getControlSettingsKey = (uid: string) => `controlSettings_${uid}`;

  const saveControlSettings = async (settings: { temperature?: number; humidity?: number; co2?: number; light?: number; frequency?: number; duration?: number; targetHumidity?: number }) => {
    try {
      const uid = await AsyncStorage.getItem('userId');
      if (!uid) return;
      const storageKey = getControlSettingsKey(uid);
      
      // 先取出舊設定
      const currentSettings = await AsyncStorage.getItem(storageKey);
      const existing = currentSettings ? JSON.parse(currentSettings) : {};
      // 將新的數值與舊的設定進行合併 (Merge)
      const updated = { ...existing, ...settings };
      // 重新寫回 AsyncStorage
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.error('保存控制面板設定失敗:', error);
    }
  };

  // 根據超標的環境類型，回傳對應的警告標題與內文
  const getEnvironmentAlertContent = (type: 'temperature' | 'humidity' | 'co2' | 'light') => {
    switch (type) {
      case 'temperature':
        return {
          title: '溫度超出範圍',
          message: `目前溫度 ${Math.round(temperature)}°C，不在允許範圍 ${thresholds.tempRange[0]}~${thresholds.tempRange[1]}°C。`, 
        };
      case 'humidity':
        return {
          title: '濕度超出範圍',
          message: `目前濕度 ${Math.round(humidity)}%，不在允許範圍 ${thresholds.humidRange[0]}~${thresholds.humidRange[1]}%。`, 
        };
      case 'co2':
        return {
          title: 'CO₂ 濃度超出範圍',
          message: `目前 CO₂ ${Math.round(co2)} ppm，不在允許範圍 ${thresholds.co2Range[0]}~${thresholds.co2Range[1]} ppm。`, 
        };
      case 'light':
        return {
          title: '光照超出範圍',
          message: `目前光照 ${Math.round(light).toLocaleString()} lux，不在允許範圍 ${thresholds.lightRange[0]}~${thresholds.lightRange[1]} lux。`, 
        };
    }
  };

  // 5.6 從 AsyncStorage 載入上次的控制面板設定值
  const loadControlSettings = async () => {
    try {
      const uid = await AsyncStorage.getItem('userId');
      if (!uid) {
        // 若未登入，也將 isLoaded 設為 true 讓元件得以完成初次渲染
        setIsLoaded(true);
        return;
      }
      const storageKey = getControlSettingsKey(uid);
      const savedSettings = await AsyncStorage.getItem(storageKey);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        // 將取出的各項設定賦值到前端狀態上
        if (settings.temperature !== undefined) setTemperature(settings.temperature);
        if (settings.humidity !== undefined) setHumidity(settings.humidity);
        if (settings.co2 !== undefined) setCo2(settings.co2);
        if (settings.light !== undefined) setLight(settings.light);
        if (settings.frequency !== undefined) setFrequency(settings.frequency);
        if (settings.duration !== undefined) setDuration(settings.duration);
        if (settings.targetHumidity !== undefined) setTargetHumidity(settings.targetHumidity);
      }
    } catch (error) {
      console.error('載入控制面板設定失敗，使用預設值。', error);
    } finally {
      // 無論載入成功與否，皆標記為已載入完畢
      setIsLoaded(true);
    }
  };

  // 6. 生命週期：當元件掛載時，確保會載入本地的設定
  useEffect(() => {
    if (!isLoaded) {
      loadControlSettings();
    }
  }, [isLoaded]);

  // 定時輪詢 (Polling) 機制
  // 每 3 秒向後端抓取一次最新數據，藉此實現「不同裝置或排程更新時」畫面的即時同步
  useEffect(() => {
    if (!isLoaded) return;

    // 設定定時器
    const pollInterval = setInterval(() => {
      syncSimulatorState();
    }, 3000);

    // 清除定時器避免 Memory Leak
    return () => clearInterval(pollInterval);
  }, [isLoaded, isInteracting]);

  // 7. 導航焦點效應：確保每次從別的頁面點進來時，都能去後端拉取最新的使用設定
  useFocusEffect(
    useCallback(() => {
      fetchSettings();
    }, [])
  );

  // 7.5 監聽控制面板數值的任何變化，並利用 setTimeout 進行防抖 (Debounce)，自動存入 AsyncStorage
  useEffect(() => {
    if (isLoaded) {
      // 延遲 500ms，若在這期間數值又變動則會重算，避免拖曳滑桿時瘋狂寫入
      const timeoutId = setTimeout(() => {
        saveControlSettings({
          temperature, humidity, co2, light, frequency, duration, targetHumidity
        });
      }, 500); 
      
      // 清除前一次未執行的存檔任務
      return () => clearTimeout(timeoutId);
    }
  }, [temperature, humidity, co2, light, frequency, duration, targetHumidity, isLoaded]);

  // 7.8 環境異常監測：若環境數值超出警示範圍，主動觸發全域推播並寫入通知中心
  useEffect(() => {
    if (!isLoaded) return;
    // 收集當前超標的類型
    const currentAlerts: ('temperature' | 'humidity' | 'co2' | 'light')[] = [];
    if (isWarning(temperature, thresholds.tempRange)) currentAlerts.push('temperature');
    if (isWarning(humidity, thresholds.humidRange)) currentAlerts.push('humidity');
    if (isWarning(co2, thresholds.co2Range)) currentAlerts.push('co2');
    if (isWarning(light, thresholds.lightRange)) currentAlerts.push('light');

    // 篩選出「尚未觸發過」的警告類型，發送通知
    const newAlerts = currentAlerts.filter((key) => !activeThresholdAlerts.includes(key));
    newAlerts.forEach((type) => {
      const content = getEnvironmentAlertContent(type);
      addNotification({
        title: content.title,
        message: content.message,
        type: 'alert',
        action: () => router.replace('/alerts'),
      });
    });
    
    // 更新已觸發警示的狀態，防止被相同的異常重複洗頻
    setActiveThresholdAlerts(currentAlerts);
  }, [temperature, humidity, co2, light, thresholds, isLoaded]);

  // 8. 共用的異常判斷小工具：判斷 current 值是否超出 range [min, max] 的陣列範圍
  const isWarning = (currentValue: number, range: number[]) => {
    if (!range || range.length !== 2) return false;
    return currentValue < range[0] || currentValue > range[1];
  };

  // 處理儲存排程按鈕的邏輯：將自訂排程寫入後端資料庫
  const handleSaveSchedule = async () => {
    try {
      const uid = await AsyncStorage.getItem('userId');
      if (!uid) {
        // 未登入防呆
        setSaveMessage('請先登入以儲存排程');
        setSaveModalVisible(true);
        router.replace('/(auth)/login');
        return;
      }

      // 將前端選定的 frequency 與 duration 送至後端 API
      const response = await fetch(`${BASE_URL}/api/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: uid, 
          frequency, 
          duration 
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // 儲存成功，觸發推播並開啟成功彈窗
        const message = '儲存成功！排程已同步至資料庫。';
        setSaveMessage(message);
        addNotification({
          title: '排程儲存成功',
          message,
          type: 'success',
          action: () => router.replace('/environment'),
        });
        setSaveModalVisible(true);
      } else {
        // 後端拒絕儲存
        const message = `儲存失敗: ${data.message || '未知錯誤'}`;
        setSaveMessage(message);
        addNotification({
          title: '排程儲存失敗',
          message,
          type: 'error',
        });
        setSaveModalVisible(true);
      }
    } catch (error) {
      // 捕捉網路斷線等預期外錯誤
      console.error('儲存排程時發生錯誤:', error);
      const message = '無法連接到後端伺服器，請檢查網路連線。';
      setSaveMessage(message);
      addNotification({
        title: '排程儲存失敗',
        message,
        type: 'error',
      });
      setSaveModalVisible(true);
    }
  };

  // 幫助建立滑軌元件的共用渲染函式，避免重複寫冗長的 UI 程式碼
  const renderSliderControl = (label: string, value: number, setter: (val: number) => void, min: number, max: number, unit: string, apiKey: 'temperature' | 'humidity' | 'co2' | 'light') => (
    <View style={styles.controlRow}>
      <View style={styles.controlLabelGroup}>
        <Text style={styles.controlLabel}>{label}</Text>
        <Text style={styles.controlValueText}>{Math.round(value).toLocaleString()} {unit}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        value={value}
        onValueChange={(v) => {
          setIsInteracting(true); // 使用者開始手動調整，封鎖輪詢覆蓋
          setter(v);
        }}
        onSlidingComplete={(v) => { 
          setIsInteracting(false); // 調整結束，恢復背景的自動同步
          // 在手放開滑鼠/手指的瞬間，通知後端寫入新值
          updateBackendSimulator({ [apiKey]: Math.round(v) } as Parameters<typeof updateBackendSimulator>[0]);
        }}
        step={1}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />
    </View>
  );

  const pickerSelectStyles = StyleSheet.create({
    inputIOS: { color: '#000000', paddingLeft: 12, paddingRight: 30, fontSize: typography.body, height: 36, backgroundColor: 'transparent' },
    inputAndroid: { color: '#000000', paddingLeft: 12, paddingRight: 30, fontSize: typography.body, height: 36, backgroundColor: 'transparent' },
    inputWeb: { color: '#000000', paddingLeft: 12, paddingRight: 30, fontSize: typography.body, height: 36, backgroundColor: 'transparent', borderWidth: 0, outlineStyle: 'none', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', cursor: 'pointer' } as any,
    placeholder: { color: '#999999' },
    iconContainer: { top: 12, right: 10 },
  });

  return (
    <>
      <PageShell
        active="environment"
        leftFlex={6}
        rightFlex={4}
        left={(
          <>
          <View style={styles.leftColumn}>
            <View style={styles.gridContainer}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>溫度</Text>
                <View style={styles.cardValueContainer}>
                  <Text style={[styles.cardValue, isWarning(temperature, thresholds.tempRange) && styles.textAlert]}>{Math.round(temperature)} <Text style={styles.cardUnit}>°C</Text></Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>土壤濕度</Text>
                <View style={styles.cardValueContainer}>
                  <Text style={[styles.cardValue, isWarning(humidity, thresholds.humidRange) && styles.textAlert]}>{Math.round(humidity)} <Text style={styles.cardUnit}>%</Text></Text>
                </View>
                <View style={styles.targetRow}>
                  <Text style={styles.targetLabel}>目標濕度</Text>
                  <Text style={styles.targetValue}>{targetHumidity}%</Text>
                </View>
                <Slider
                  style={styles.targetSlider}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={targetHumidity}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                  onValueChange={(value) => setTargetHumidity(Number(value))}
                />
                <TouchableOpacity style={styles.actionButton} onPress={handleManualIrrigation}>
                  <Text style={styles.actionButtonText}>手動灌溉</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>二氧化碳濃度</Text>
                <View style={styles.cardValueContainer}>
                  <Text style={[styles.cardValue, isWarning(co2, thresholds.co2Range) && styles.textAlert]}>{Math.round(co2)} <Text style={styles.cardUnit}>ppm</Text></Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>光照強度</Text>
                <View style={styles.cardValueContainer}>
                  <Text style={[styles.cardValue, isWarning(light, thresholds.lightRange) && styles.textAlert]}>{Math.round(light).toLocaleString()} <Text style={styles.cardUnit}>lux</Text></Text>
                </View>
              </View>
            </View>
            

            <View style={styles.horizontalDivider} />

            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleTitle}>自動灌溉排程</Text>
              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>灌溉頻率</Text>
                <Text style={styles.scheduleText}>每隔</Text>
                <View style={styles.pickerWrapper}>
                  <RNPickerSelect value={frequency} onValueChange={setFrequency} items={[{ label: '1', value: 1 },{ label: '2', value: 2 },{ label: '4', value: 4 },{ label: '8', value: 8 },{ label: '12', value: 12 },{ label: '24', value: 24 }]} style={pickerSelectStyles} useNativeAndroidPickerStyle={false} Icon={() => <FontAwesome name="chevron-down" size={12} color="#64748B" />} />
                </View>
                <Text style={styles.scheduleText}>分鐘灌溉一次</Text>
              </View>

              <View style={styles.scheduleRow}>
                <Text style={styles.scheduleLabel}>單次時長</Text>
                <Text style={styles.scheduleText}>一次灌溉</Text>
                <View style={styles.pickerWrapper}>
                  <RNPickerSelect value={duration} onValueChange={setDuration} items={[{ label: '1', value: 1 },{ label: '5', value: 5 },{ label: '10', value: 10 },{ label: '20', value: 20 },{ label: '30', value: 30 },{ label: '60', value: 60 }]} style={pickerSelectStyles} useNativeAndroidPickerStyle={false} Icon={() => <FontAwesome name="chevron-down" size={12} color="#64748B" />} />
                </View>
                <Text style={styles.scheduleText}>分鐘</Text>
              </View>

              <View style={styles.scheduleFooter}>
                <TouchableOpacity style={[styles.saveButton, styles.scheduleFooterButton]} onPress={handleSaveSchedule}>
                  <Text style={styles.saveButtonText}>儲存設定</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
        )}
        right={(
        <View style={styles.rightColumn}>
            <Text style={styles.godPanelHeader}><FontAwesome name="sliders" size={18} color="#FFF" /> 控制面板</Text>
            <Text style={styles.godPanelSub}>模擬硬體回傳數值</Text>
            <View style={styles.godPanelControls}>
              {renderSliderControl('溫度', temperature, setTemperature, -30, 60, '°C', 'temperature')}
              {renderSliderControl('土壤濕度', humidity, setHumidity, 0, 100, '%', 'humidity')}
              {renderSliderControl('二氧化碳濃度', co2, setCo2, 300, 2000, 'ppm', 'co2')}
              {renderSliderControl('光照強度', light, setLight, 0, 150000, 'lux', 'light')}
            </View>
        </View>
        )}
      />
      


      {/* 💡 核心新增：自訂暗色系儲存排程成功彈窗 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={saveModalVisible}
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View 
            entering={ZoomIn.duration(400).springify()} 
            style={styles.modalCard}
          >
            <View style={styles.iconCircle}>
              <FontAwesome name="check" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.modalTitle}>系統提示</Text>
            <Text style={styles.modalMessage}>{saveMessage}</Text>
            
            <TouchableOpacity style={styles.modalButton} onPress={() => setSaveModalVisible(false)}>
              <Text style={styles.modalButtonText}>確 定</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

    </>
  );
}

const styles = StyleSheet.create({
  leftColumn: { flex: 1 },
  rightColumn: { flex: 1, backgroundColor: colors.control, borderRadius: radii.lg, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, maxHeight: 600 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg, minHeight: 160, justifyContent: 'space-between' },
  cardTitle: { color: colors.text, fontSize: typography.h2, fontWeight: 'bold' },
  cardValueContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardValue: { color: colors.text, fontSize: typography.large, fontWeight: 'bold' },
  cardUnit: { fontSize: 16, fontWeight: 'normal', color: colors.subtle },
  textAlert: { color: colors.alert },
  actionButton: { backgroundColor: colors.secondary, paddingVertical: 8, borderRadius: radii.md, alignItems: 'center', width: '100%' },
  actionButtonText: { color: colors.text, fontWeight: 'bold', fontSize: 13 },
  targetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  targetLabel: { color: colors.subtle, fontSize: 13 },
  targetValue: { color: colors.text, fontSize: 13, fontWeight: 'bold' },
  targetSlider: { width: '100%', height: 34, marginTop: 10, marginBottom: 10 },
  horizontalDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md, width: '100%' },
  scheduleCard: { backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.xl },
  scheduleTitle: { color: colors.text, fontSize: typography.h2, fontWeight: 'bold', marginBottom: spacing.lg },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, width: '100%' },
  scheduleLabel: { color: colors.subtle, fontSize: 16, width: 80 },
  scheduleText: { color: colors.text, fontSize: typography.body, marginHorizontal: 8 },
  pickerWrapper: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#64748B', minWidth: 80, height: 36, justifyContent: 'center', overflow: 'hidden' },
  scheduleFooter: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  saveButton: { backgroundColor: colors.secondary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: radii.md, flex: 1, alignItems: 'center' },
  scheduleFooterButton: { minWidth: 140 },
  smallButton: { marginRight: 10, backgroundColor: colors.primary },
  saveButtonText: { color: colors.text, fontWeight: 'bold', fontSize: 14 },
  godPanelHeader: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  godPanelSub: { color: colors.subMuted, fontSize: typography.small, marginBottom: 30 },
  godPanelControls: { flexDirection: 'column' },
  controlRow: { marginBottom: 25 },
  controlLabelGroup: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  controlLabel: { color: colors.text, fontSize: 14 },
  controlValueText: { color: colors.text, fontWeight: 'bold', fontSize: 14 },
  slider: { width: '100%', height: 40 },

  // 💡 追加新增的 Modal 樣式，沿用與登入頁完全一致的設計
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#1E2124',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border || '#33373E',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5A8B73',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#5A8B73',
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});