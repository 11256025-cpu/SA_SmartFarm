/*
 * frontend/app/crops.tsx - 作物頁面，顯示作物相關資料與操作。
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

// 💡 新增：作物資料與歷史紀錄的 TypeScript 型別定義
interface CropHistory {
  timestamp: string;
  stage: string;
  status: string;
}

interface Crop {
  id: number;
  name: string;
  stage: string;
  status: string;
  image: string | null;
  history?: CropHistory[];
}

export default function CropsScreen() {
  // === 狀態管理 ===
  const [crops, setCrops] = useState<Crop[]>([]);
  const { addNotification } = useNotifications();

  const [isModalVisible, setIsModalVisible] = useState(false);

  // 表單輸入欄位
  const [cropName, setCropName] = useState('');
  const [cropStage, setCropStage] = useState('');
  const [cropStatus, setCropStatus] = useState('');
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  const [editingCropId, setEditingCropId] = useState<number | null>(null); // 💡 新增：紀錄正在編輯的作物 ID

  // 💡 初始化：從後端載入作物的資料
  useEffect(() => {
    const loadCrops = async () => {
      try {
        let uid = await AsyncStorage.getItem('userId') || '1';
        const response = await fetch(`${BASE_URL}/api/crops?userId=${uid}`);
        const data = await response.json();
        if (data.success && data.crops) {
          setCrops(data.crops);
        }
      } catch (error) {
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

  // 核心功能：開啟手機相簿選取植物照片
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      addNotification({
        title: '相簿存取權限不足',
        message: '系統需要手機相簿存取權限才能上傳植物照片。',
        type: 'warning',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      // 💡 移除了 aspect 限制，現在您可以自由拖曳裁切框的邊角，決定要裁切的形狀與位置！
      quality: 0.3, // 降低畫質避免 base64 字串過大
      base64: true, // 💡 關鍵：要求直接將圖片轉成 Base64 編碼的文字格式
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      // 組合完整的 Base64 字串，這樣實體檔案遺失也不會破圖
      const imagePayload = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setUploadedImageUri(imagePayload);
    }
  };

  // 💡 重置表單
  const resetForm = () => {
    setEditingCropId(null);
    setCropName('');
    setCropStage('');
    setCropStatus('');
    setUploadedImageUri(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    resetForm();
  };

  // 💡 開啟編輯模式：將卡片資料帶入表單中
  const handleEditCrop = (crop: Crop) => {
    setEditingCropId(crop.id);
    setCropName(crop.name);
    setCropStage(crop.stage);
    setCropStatus(crop.status);
    setUploadedImageUri(crop.image);
    setIsModalVisible(true);
  };

  // 儲存表單
  const handleSaveCrop = async () => {
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
      
      const currentCrop = editingCropId ? crops.find(c => c.id === editingCropId) : null;
      let currentHistory = currentCrop?.history || [];
      
      const newStage = cropStage || '幼苗期';
      const newStatus = cropStatus || '良好';
      
      // 💡 判斷是否需要新增歷史紀錄 (新增作物，或者作物的階段/狀態有被更改)
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

      const payload = {
        userId: Number(uid),
        name: cropName,
        stage: newStage,
        status: newStatus,
        image: uploadedImageUri,
        history: currentHistory, // 💡 一併傳送歷史紀錄陣列給後端存入資料庫
      };

      const isEditing = editingCropId !== null;
      const url = isEditing ? `${BASE_URL}/api/crops/${editingCropId}` : `${BASE_URL}/api/crops`;
      const method = isEditing ? 'PUT' : 'POST';

      // 發送 API 請求到後端
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        addNotification({
          title: isEditing ? '作物更新成功' : '新增作物成功',
          message: isEditing ? '作物已成功更新，已同步至資料庫。' : '作物已成功新增，請留意後續生長狀況。',
          type: 'success',
          action: () => router.replace('/crops'),
        });
        
        if (isEditing) {
          setCrops(crops.map(c => c.id === editingCropId ? { ...c, ...payload } : c));
        } else {
          const newCropRecord = data.crop || { ...payload, id: data.insertId || crops.length + 1 };
          setCrops([...crops, newCropRecord]);
        }

        handleCloseModal();
      } else {
        addNotification({
          title: '作物儲存失敗',
          message: data.message || '請稍後再試。',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('儲存作物時發生錯誤:', error);
      addNotification({
        title: '儲存失敗',
        message: '⚠️ 無法連線到伺服器，請確認後端服務已啟動。',
        type: 'error',
      });
    }
  };

  // 💡 新增：清空歷史紀錄
  const handleClearHistory = async () => {
    if (!editingCropId) return;

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

    if (Platform.OS === 'web') {
      if (window.confirm("此操作將會永久刪除該作物所有的狀態變更歷史，且無法復原。確定要繼續嗎？")) {
        performClear();
      }
    } else {
      // 跳出再次確認的對話框，防止誤觸
      Alert.alert(
        "確認清空紀錄",
        "此操作將會永久刪除該作物所有的狀態變更歷史，且無法復原。確定要繼續嗎？",
        [
          { text: "取消", style: "cancel" },
          {
            text: "確定清空",
            style: 'destructive', // 在 iOS 上會顯示為紅色按鈕
            onPress: performClear,
          },
        ]
      );
    }
  };

  // 💡 刪除作物
  const handleDeleteCrop = async () => {
    if (!editingCropId) return;
    
    const performDelete = async () => {
      try {
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
          setCrops(crops.filter(c => c.id !== editingCropId));
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
            style: 'destructive',
            onPress: performDelete,
          },
        ]
      );
    }
  };

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
            {/* 💡 將卡片改為 View，把點擊事件限制在照片與資料區塊，避免滑動時誤觸 */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => handleEditCrop(item)}>
              <View style={styles.cardImageLayer}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.cardRealRenderImage} />
                ) : (
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

            {/* 💡 新增：歷史紀錄區塊 */}
            <View style={styles.cardHistoryContainer}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>
                  狀態變更紀錄 {item.history?.length > 0 ? `(${item.history.length})` : ''}
                </Text>
                {item.history?.length > 2 && (
                  <FontAwesome name="angle-double-down" size={16} color={colors.subMuted} style={{ opacity: 0.6 }} />
                )}
              </View>
              {/* 💡 將歷史紀錄包裹在 ScrollView 中，並開啟 nestedScrollEnabled */}
              <ScrollView style={styles.historyScrollArea} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
                {item.history && item.history.length > 0 ? (
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
              {/* 💡 編輯模式時，顯示刪除與清空按鈕 */}
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