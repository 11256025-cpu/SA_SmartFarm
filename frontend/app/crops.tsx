/*
 * frontend/app/crops.tsx - 作物管理頁面。
 * 讓使用者可以新增、編輯、刪除作物，並記錄每一株作物的生長狀態與照片。
 */
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { useNotifications } from '../components/NotificationProvider';
import PageShell from '../components/PageShell';
import { colors, radii, spacing, typography } from '../components/sharedStyles';

// 💡 自動判斷執行環境，避免 localhost 在實機上連不到
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

// 💡 時間格式化工具 (產出如：2026/05/27 21:35)
const formatDateTime = (dateString: string) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

// 作物歷史紀錄的 TypeScript 型別定義
interface CropHistory {
  timestamp: string; // 變更發生的時間戳記
  stage: string;     // 當時的作物階段
  status: string;    // 當時的作物狀態
}

// 作物資料的 TypeScript 型別定義
interface Crop {
  id: number;
  name: string;          // 作物名稱
  stage: string;         // 目前階段 (例如: 幼苗期)
  status: string;        // 目前狀態 (例如: 良好)
  image: string | null;  // Base64 格式的圖片字串，或 null
  history?: CropHistory[]; // 可選的歷史紀錄陣列
}

export default function CropsScreen() {
  // === 狀態管理區域 ===
  // 儲存從後端取得的所有作物列表
  const [crops, setCrops] = useState<Crop[]>([]);
  // 取得全域通知功能
  const { addNotification } = useNotifications();

  // 控制新增/編輯作物的彈窗 (Modal) 是否顯示
  const [isModalVisible, setIsModalVisible] = useState(false);

  // --- 表單輸入欄位狀態 ---
  const [cropName, setCropName] = useState('');
  const [cropStage, setCropStage] = useState('');
  const [cropStatus, setCropStatus] = useState('');
  // 儲存使用者上傳或拍下的圖片 (以 Base64 字串形式儲存)
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  // 紀錄目前正在編輯的作物 ID (若為 null 代表是「新增」模式)
  const [editingCropId, setEditingCropId] = useState<number | null>(null); 

  // 初始化：元件掛載時從後端載入該使用者的作物資料
  useEffect(() => {
    const loadCrops = async () => {
      try {
        // 從 AsyncStorage 取得使用者 ID
        let uid = await AsyncStorage.getItem('userId') || '1';
        // 向後端請求該使用者的作物清單
        const response = await fetch(`${BASE_URL}/api/crops?userId=${uid}`);
        const data = await response.json();
        if (data.success && data.crops) {
          // 成功取得資料，更新到前端狀態中
          setCrops(data.crops);
        }
      } catch (error) {
        // 捕捉連線錯誤並推播通知
        console.warn('載入作物失敗:', error);
        addNotification({
          title: '載入作物失敗',
          message: '⚠️ 無法從伺服器讀取作物資料，請檢查後端是否已啟動。',
          type: 'error',
        });
      }
    };
    loadCrops();
  }, []);

  // 核心功能：開啟手機相簿或相機，選取植物照片
  const handlePickImage = async () => {
    // 1. 請求相簿存取權限
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      // 若使用者拒絕授權，顯示警告
      addNotification({
        title: '相簿存取權限不足',
        message: '系統需要手機相簿存取權限才能上傳植物照片。',
        type: 'warning',
      });
      return;
    }

    // 2. 開啟相簿選擇器
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // 僅允許選擇圖片
      allowsEditing: true, // 允許使用者在選擇後裁切圖片
      aspect: [1, 1], // 設定裁切比例為 1:1 (正方形)
      // 💡 移除了 aspect 限制，現在您可以自由拖曳裁切框的邊角，決定要裁切的形狀與位置！
      quality: 0.3, // 降低畫質至 30%，避免 base64 字串過大撐爆資料庫
      base64: true, // 關鍵：要求 expo-image-picker 直接回傳 Base64 編碼的文字格式
    });

    if (!result.canceled) {
      // 若使用者完成選擇，組合完整的 Base64 圖片字串 (包含 MIME type 標頭)
      const asset = result.assets[0];
      const imagePayload = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      // 寫入表單狀態，讓畫面即時預覽
      setUploadedImageUri(imagePayload);
    }
  };

  // 重置表單狀態 (清空所有輸入框與圖片)
  const resetForm = () => {
    setEditingCropId(null);
    setCropName('');
    setCropStage('');
    setCropStatus('');
    setUploadedImageUri(null);
  };

  // 開啟「新增」彈窗：先清空表單再打開
  const handleOpenAddModal = () => {
    resetForm();
    setIsModalVisible(true);
  };

  // 關閉彈窗並清空表單
  const handleCloseModal = () => {
    setIsModalVisible(false);
    resetForm();
  };

  // 開啟「編輯」模式：將點選的作物資料帶入表單中，再開啟彈窗
  const handleEditCrop = (crop: Crop) => {
    setEditingCropId(crop.id);
    setCropName(crop.name);
    setCropStage(crop.stage);
    setCropStatus(crop.status);
    setUploadedImageUri(crop.image);
    setIsModalVisible(true);
  };

  // 處理儲存表單 (新增或更新) 的邏輯
  const handleSaveCrop = async () => {
    // 防呆：名稱必填
    if (!cropName.trim()) {
      addNotification({
        title: '欄位不足',
        message: '請輸入作物名稱！',
        type: 'warning',
      });
      return;
    }

    try {
      let uid = await AsyncStorage.getItem('userId') || '1';
      
      // 找出原本的作物紀錄，準備檢查是否有變動
      const currentCrop = editingCropId ? crops.find(c => c.id === editingCropId) : null;
      let currentHistory = currentCrop?.history || [];
      
      // 若階段或狀態沒有填寫，給予預設值
      const newStage = cropStage || '幼苗期';
      const newStatus = cropStatus || '良好';
      
      // 💡 判斷是否需要新增一筆歷史紀錄 (當是全新作物，或者作物的「階段」或「狀態」與之前不同時)
      if (!editingCropId || currentCrop?.stage !== newStage || currentCrop?.status !== newStatus) {
        currentHistory = [
          ...currentHistory,
          {
            timestamp: new Date().toISOString(),
            stage: newStage,
            status: newStatus
          }
        ];
      }

      // 準備送給後端的資料封包
      const payload = {
        userId: Number(uid),
        name: cropName,
        stage: newStage,
        status: newStatus,
        image: uploadedImageUri,
        history: currentHistory, // 一併傳送更新後的歷史紀錄陣列給後端
      };

      // 根據 editingCropId 決定是更新 (PUT) 還是新增 (POST)
      const isEditing = editingCropId !== null;
      const url = isEditing ? `${BASE_URL}/api/crops/${editingCropId}` : `${BASE_URL}/api/crops`;
      const method = isEditing ? 'PUT' : 'POST';

      // 發送請求
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        // 儲存成功，推播通知
        addNotification({
          title: isEditing ? '作物更新成功' : '新增作物成功',
          message: isEditing ? '作物已成功更新，已同步至資料庫。' : '作物已成功新增，請留意後續生長狀況。',
          type: 'success',
          action: () => router.replace('/crops'),
        });
        
        // 更新前端狀態陣列
        if (isEditing) {
          // 編輯模式：替換掉原本那一筆
          setCrops(crops.map(c => c.id === editingCropId ? { ...c, ...payload } : c));
        } else {
          // 新增模式：推入新的一筆 (賦予後端回傳的新 ID)
          const newCropRecord = data.crop || { ...payload, id: data.insertId || crops.length + 1 };
          setCrops([...crops, newCropRecord]);
        }

        // 關閉彈窗
        handleCloseModal();
      } else {
        addNotification({
          title: '作物儲存失敗',
          message: data.message || '請稍後再試。',
          type: 'error',
        });
      }
    } catch (error) {
      // 捕捉網路異常
      console.error('儲存作物時發生錯誤:', error);
      addNotification({
        title: '儲存失敗',
        message: '⚠️ 無法連線到伺服器，請確認後端服務已啟動。',
        type: 'error',
      });
    }
  };

  // 處理清空特定作物歷史紀錄的操作
  const handleClearHistory = async () => {
    if (!editingCropId) return;

    // 實際執行清空的非同步函式
    const performClear = async () => {
      try {
        const cropToUpdate = crops.find(c => c.id === editingCropId);
        if (!cropToUpdate) {
          addNotification({
            title: '找不到目標作物',
            message: '找不到要更新的作物。',
            type: 'warning',
          });
          return;
        }

        // 準備一個 history 為空陣列的 payload
        const payload = { ...cropToUpdate, history: [] };

        // 送出 PUT 請求覆蓋原有紀錄
        const response = await fetch(`${BASE_URL}/api/crops/${editingCropId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (data.success) {
          addNotification({
            title: '歷史紀錄已清空',
            message: '該作物的狀態變更歷史已成功清空。',
            type: 'success',
            action: () => router.replace('/crops'),
          });
          // 更新前端狀態，使畫面上的歷史清單變為空，無須重新載入整個頁面
          setCrops(crops.map(c => (c.id === editingCropId ? { ...c, history: [] } : c)));
        } else {
          addNotification({
            title: '清空失敗',
            message: data.message || '請稍後再試。',
            type: 'error',
          });
        }
      } catch (error) { console.error('清空歷史紀錄時發生錯誤:', error); addNotification({ title: '清空失敗', message: '⚠️ 無法連線到伺服器。', type: 'error' }); }
    };

    // 依據平台顯示確認對話框 (Web 使用 window.confirm，原生使用 Alert)
    if (Platform.OS === 'web') {
      if (window.confirm("此操作將會永久刪除該作物所有的狀態變更歷史，且無法復原。確定要繼續嗎？")) {
        performClear();
      }
    } else {
      Alert.alert(
        "確認清空紀錄",
        "此操作將會永久刪除該作物所有的狀態變更歷史，且無法復原。確定要繼續嗎？",
        [
          { text: "取消", style: "cancel" },
          {
            text: "確定清空",
            style: 'destructive',
            onPress: performClear,
          },
        ]
      );
    }
  };

  // 處理刪除作物的邏輯
  const handleDeleteCrop = async () => {
    if (!editingCropId) return;
    
    // 實際執行刪除的非同步函式
    const performDelete = async () => {
      try {
        // 向後端發送 DELETE 請求
        const response = await fetch(`${BASE_URL}/api/crops/${editingCropId}`, {
          method: 'DELETE',
        });

        const data = await response.json();
        if (data.success) {
          addNotification({
            title: '作物刪除成功',
            message: '作物已成功刪除並從列表中移除。',
            type: 'success',
          });
          // 將被刪除的作物從前端陣列中過濾掉，更新畫面
          setCrops(crops.filter(c => c.id !== editingCropId));
          // 關閉彈窗
          handleCloseModal();
        } else {
          addNotification({
            title: '刪除失敗',
            message: data.message || '請稍後再試。',
            type: 'error',
          });
        }
      } catch (error) {
        console.error('刪除作物時發生錯誤:', error);
        addNotification({
          title: '刪除失敗',
          message: '⚠️ 無法連線到伺服器。',
          type: 'error',
        });
      }
    };

    // 同樣針對不同平台顯示再次確認對話框
    if (Platform.OS === 'web') {
      if (window.confirm("確定要刪除此作物嗎？此操作無法復原。")) {
        performDelete();
      }
    } else {
      Alert.alert(
        "確認刪除",
        "確定要刪除此作物嗎？此操作無法復原。",
        [
          { text: "取消", style: "cancel" },
          {
            text: "確定刪除",
            style: 'destructive', // 在 iOS 上會顯示為紅色警告按鈕
            onPress: performDelete,
          },
        ]
      );
    }
  };

  // === 畫面渲染區 ===
  return (
    <PageShell active="crops">
      {/* 標題與操作列 */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>作物管理</Text>
          <Text style={styles.pageSubtitle}>目前共記錄了 {crops.length} 項作物</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal}>
          <FontAwesome name="plus" size={16} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={styles.addBtnText}>新增作物</Text>
        </TouchableOpacity>
      </View>

      {/* 作物卡片網格 */}
      <ScrollView contentContainerStyle={styles.cardGridContainer} showsVerticalScrollIndicator={false}>
        {crops.map((item) => (
          <View key={item.id} style={styles.cropCard}>
            {/* 卡片上半部 (照片與基本資料)：點擊可開啟編輯模式 */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => handleEditCrop(item)}>
              <View style={styles.cardImageLayer}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.cardRealRenderImage} />
                ) : (
                  // 找不到圖片時的預設佔位圖示
                  <View style={styles.cardIllustrationPlaceholder}>
                    <FontAwesome name="leaf" size={36} color={colors.primary} />
                  </View>
                )}
              </View>

              <View style={styles.cardDataLayer}>
                <Text style={styles.cardCropNameTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardCropMetaText} numberOfLines={1}>作物階段：{item.stage}</Text>
                <Text style={styles.cardCropMetaText} numberOfLines={1}>作物狀態：{item.status}</Text>
              </View>
            </TouchableOpacity>

            {/* 卡片下半部：歷史紀錄區塊 */}
            <View style={styles.cardHistoryContainer}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>
                  狀態變更紀錄 {item.history?.length > 0 ? `(${item.history.length})` : ''}
                </Text>
                {item.history?.length > 2 && (
                  <FontAwesome name="angle-double-down" size={16} color={colors.subMuted} style={{ opacity: 0.6 }} />
                )}
              </View>
              {/* 將歷史紀錄包裹在 ScrollView 中，讓較長的紀錄可以獨立捲動 (nestedScrollEnabled) */}
              <ScrollView style={styles.historyScrollArea} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
                {item.history && item.history.length > 0 ? (
                  // 透過 reverse() 讓最新的紀錄排在最上面
                  [...item.history].reverse().map((h: CropHistory, idx: number) => (
                    <Text key={idx} style={styles.historyText}>
                      {formatDateTime(h.timestamp)} {h.stage} {h.status}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.historyText}>暫無紀錄</Text>
                )}
              </ScrollView>
            </View>
          </View>
        ))}

        {/* 虛線新增按鈕卡片 (保留作為第二個新增入口) */}
        <TouchableOpacity style={styles.dashedActionCard} onPress={handleOpenAddModal}>
          <FontAwesome name="plus" size={24} color={colors.muted} style={{ marginBottom: 8 }} />
          <Text style={styles.dashedActionText}>新增作物</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* --- 新增作物的置中彈窗 Modal --- */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* 彈窗標題 */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCropId ? '編輯作物' : '新增作物'}</Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeBtn}>
                <FontAwesome name="times" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* 彈窗表單內容區 */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* 第一排：名稱與階段 */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.fieldLabel}>作物名稱</Text>
                  <TextInput 
                    style={styles.formTextInput} 
                    placeholder="請輸入作物名稱" 
                    placeholderTextColor={colors.subMuted}
                    value={cropName}
                    onChangeText={setCropName}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.fieldLabel}>作物階段</Text>
                  <View style={styles.pickerContainer}>
                    {/* 下拉選單元件 */}
                    <RNPickerSelect
                      placeholder={{ label: '選擇階段...', value: '' }}
                      value={cropStage}
                      onValueChange={setCropStage}
                      items={[
                        { label: '幼苗期', value: '幼苗期' },
                        { label: '成長期', value: '成長期' },
                        { label: '成熟期', value: '成熟期' },
                      ]}
                      style={pickerCustomStyles}
                    />
                  </View>
                </View>
              </View>

              {/* 第二排：狀態 */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.fieldLabel}>作物狀態</Text>
                  <View style={styles.pickerContainer}>
                    <RNPickerSelect
                      placeholder={{ label: '選擇狀態...', value: '' }}
                      value={cropStatus}
                      onValueChange={setCropStatus}
                      items={[
                        { label: '良好', value: '良好' },
                        { label: '需注意', value: '需注意' },
                        { label: '已休耕', value: '已休耕' },
                      ]}
                      style={pickerCustomStyles}
                    />
                  </View>
                </View>
                <View style={styles.formCol} /> {/* 保持排版平衡 */}
              </View>

              {/* 照片上傳 */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>作物照片</Text>
                <TouchableOpacity style={styles.photoUploadDashedBox} onPress={handlePickImage} activeOpacity={0.8}>
                  {uploadedImageUri ? (
                    <Image source={{ uri: uploadedImageUri }} style={styles.uploadedImagePreview} />
                  ) : (
                    <View style={styles.uploadFlexInner}>
                      <FontAwesome name="camera" size={28} color={colors.muted} />
                      <Text style={styles.uploadPlaceholderText}>點擊開啟相機或相簿</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* 彈窗按鈕區 */}
            <View style={styles.modalFooter}>
              {/* 若為編輯模式，左側額外顯示刪除與清空紀錄按鈕 */}
              {editingCropId && (
                <>
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteCrop}>
                    <Text style={styles.deleteBtnText}>刪除作物</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.clearHistoryBtn} onPress={handleClearHistory}>
                    <Text style={styles.clearHistoryBtnText}>清空紀錄</Text>
                  </TouchableOpacity>
                </>
              )}
              {/* 將左右按鈕推開的彈性空間 */}
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCloseModal}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCrop}>
                <Text style={styles.saveBtnText}>{editingCropId ? '儲存修改' : '確認新增'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </PageShell>
  );
}

const pickerCustomStyles = StyleSheet.create({
  inputIOS: { color: '#000000', fontSize: typography.body, paddingVertical: 10, paddingHorizontal: 12 },
  inputAndroid: { color: '#000000', fontSize: typography.body, paddingHorizontal: 12, paddingVertical: 8 },
  inputWeb: { color: '#000000', fontSize: typography.body, paddingHorizontal: 12, paddingVertical: 10, outlineStyle: 'none' as any }
});

const styles = StyleSheet.create({
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, paddingHorizontal: spacing.xl },
  pageTitle: { color: colors.text, fontSize: typography.h1, fontWeight: 'bold' },
  pageSubtitle: { color: colors.subMuted, fontSize: typography.body, marginTop: 4 },
  addBtn: { flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radii.md, alignItems: 'center' },
  addBtnText: { color: colors.text, fontSize: typography.body, fontWeight: 'bold' },
  
  // Modal 彈窗樣式
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modalCard: { width: '100%', maxWidth: 540, backgroundColor: colors.leftPanel, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontSize: typography.h2, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  modalBody: { padding: spacing.xl },
  formRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.lg },
  formCol: { flex: 1 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { color: colors.muted, fontSize: typography.body, fontWeight: '600', marginBottom: 8 },
  formTextInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: typography.body },
  pickerContainer: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, overflow: 'hidden' },
  photoUploadDashedBox: { width: '100%', height: 180, backgroundColor: colors.background, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  uploadFlexInner: { alignItems: 'center', gap: 8 },
  uploadPlaceholderText: { color: colors.muted, fontSize: typography.small },
  uploadedImagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: radii.md, backgroundColor: colors.border },
  cancelBtnText: { color: colors.text, fontSize: typography.body, fontWeight: 'bold' },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: radii.md, backgroundColor: colors.primary },
  saveBtnText: { color: colors.text, fontSize: typography.body, fontWeight: 'bold' },
  deleteBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: radii.md, backgroundColor: 'rgba(240, 110, 110, 0.1)' },
  deleteBtnText: { color: colors.alert, fontSize: typography.body, fontWeight: 'bold' },
  clearHistoryBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: radii.md, backgroundColor: 'rgba(243, 156, 18, 0.1)' },
  clearHistoryBtnText: { color: '#F39C12', fontSize: typography.body, fontWeight: 'bold' },

  // 作物列表卡片樣式
  cardGridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, paddingHorizontal: spacing.xl, paddingBottom: 60 },
  cropCard: { width: '48%', minWidth: 280, minHeight: 475, backgroundColor: colors.card, borderRadius: radii.lg, padding: 18, borderWidth: 1, borderColor: colors.border, position: 'relative', overflow: 'hidden', paddingBottom: 20, flexDirection: 'column' },
  cardImageLayer: { height: 240, borderRadius: radii.md, overflow: 'hidden', marginBottom: 16 },
  cardRealRenderImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardIllustrationPlaceholder: { backgroundColor: colors.border, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  cardDataLayer: { gap: 6 },
  cardCropNameTitle: { color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 6 },
  cardCropMetaText: { color: colors.muted, fontSize: 16, marginBottom: 2 },
  cardHistoryContainer: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historyTitle: { color: colors.muted, fontSize: 16, fontWeight: 'bold' },
  historyScrollArea: { height: 65, paddingRight: 4 },
  historyText: { color: colors.subMuted, fontSize: 14, marginBottom: 6, lineHeight: 20 },
  dashedActionCard: { width: '48%', minWidth: 280, minHeight: 475, borderRadius: radii.lg, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  dashedActionText: { color: colors.muted, fontSize: 18, fontWeight: 'bold' }
});