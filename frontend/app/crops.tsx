import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import PageShell from '../components/PageShell';
import { colors, radii, spacing, typography } from '../components/sharedStyles';

export default function CropsScreen() {
  // === 狀態管理 ===
  const [crops, setCrops] = useState([
    { id: 1, name: '番茄A', stage: '成熟期', status: '良好', image: null },
    { id: 2, name: '番茄B', stage: '成熟期', status: '良好', image: null },
    { id: 3, name: '番茄C', stage: '成熟期', status: '良好', image: null },
    { id: 4, name: '番茄A', stage: '成熟期', status: '良好', image: null },
    { id: 5, name: '番茄B', stage: '成熟期', status: '良好', image: null },
  ]);

  const [isModalVisible, setIsModalVisible] = useState(false);

  // 表單輸入欄位
  const [cropName, setCropName] = useState('');
  const [cropStage, setCropStage] = useState('');
  const [cropStatus, setCropStatus] = useState('');
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);

  // 核心功能：開啟手機相簿選取植物照片
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert("系統需要手機相簿存取權限才能上傳植物照片！");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUploadedImageUri(result.assets[0].uri);
    }
  };

  // 儲存表單
  const handleSaveCrop = () => {
    if (!cropName.trim()) {
      alert('請輸入作物名稱！');
      return;
    }

    const newCropRecord = {
      id: crops.length + 1,
      name: cropName,
      stage: cropStage || '幼苗期',
      status: cropStatus || '良好',
      image: uploadedImageUri,
    };

    setCrops([...crops, newCropRecord]);

    // 重置表單狀態並關閉彈窗
    setCropName('');
    setCropStage('');
    setCropStatus('');
    setUploadedImageUri(null);
    setIsModalVisible(false);
  };

  return (
    <PageShell active="crops">
      {/* 標題與操作列 */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>作物管理</Text>
          <Text style={styles.pageSubtitle}>目前共記錄了 {crops.length} 項作物</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsModalVisible(true)}>
          <FontAwesome name="plus" size={16} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={styles.addBtnText}>新增作物</Text>
        </TouchableOpacity>
      </View>

      {/* 作物卡片網格 */}
      <ScrollView contentContainerStyle={styles.cardGridContainer} showsVerticalScrollIndicator={false}>
        {crops.map((item) => (
          <View key={item.id} style={styles.cropCard}>
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

            <View style={styles.heartPulseBadge}>
              <FontAwesome name="heartbeat" size={11} color={colors.text} />
            </View>
          </View>
        ))}

        {/* 虛線新增按鈕卡片 (保留作為第二個新增入口) */}
        <TouchableOpacity style={styles.dashedActionCard} onPress={() => setIsModalVisible(true)}>
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
              <Text style={styles.modalTitle}>新增作物</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeBtn}>
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
                <Text style={styles.fieldLabel}>作物實體外觀照片</Text>
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
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCrop}>
                <Text style={styles.saveBtnText}>確認新增</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </PageShell>
  );
}

const pickerCustomStyles = StyleSheet.create({
  inputIOS: { color: colors.text, fontSize: typography.body, paddingVertical: 10, paddingHorizontal: 12 },
  inputAndroid: { color: colors.text, fontSize: typography.body, paddingHorizontal: 12, paddingVertical: 8 },
  inputWeb: { color: colors.text, fontSize: typography.body, paddingHorizontal: 12, paddingVertical: 10, outlineStyle: 'none' as any }
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

  // 作物列表卡片樣式
  cardGridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, paddingHorizontal: spacing.xl, paddingBottom: 60 },
  cropCard: { width: '31%', minWidth: 220, height: 260, backgroundColor: colors.card, borderRadius: radii.lg, padding: 14, borderWidth: 1, borderColor: colors.border, position: 'relative', overflow: 'hidden' },
  cardImageLayer: { height: 130, borderRadius: radii.md, overflow: 'hidden', marginBottom: 14 },
  cardRealRenderImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardIllustrationPlaceholder: { backgroundColor: colors.border, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  cardDataLayer: { gap: 6 },
  cardCropNameTitle: { color: colors.text, fontSize: typography.large, fontWeight: 'bold', marginBottom: 4 },
  cardCropMetaText: { color: colors.muted, fontSize: typography.body },
  heartPulseBadge: { position: 'absolute', bottom: 16, right: 16, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 },
  dashedActionCard: { width: '31%', minWidth: 220, height: 260, borderRadius: radii.lg, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  dashedActionText: { color: colors.muted, fontSize: typography.body, fontWeight: 'bold' }
});