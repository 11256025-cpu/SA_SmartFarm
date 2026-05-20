import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';

export default function CropsScreen() {
  // 1. 初始作物資料
  const [crops, setCrops] = useState([
    { id: 1, name: '番茄', area: 'A區', status: '生長中', stage: '開花期', health: '良好' },
    { id: 2, name: '生菜', area: 'B區', status: '可採收', stage: '成熟期', health: '良好' },
    { id: 3, name: '草莓', area: 'C區', status: '生長中', stage: '結果期', health: '需注意' },
  ]);

  // 2. 控制「新增視窗」顯示狀態
  const [modalVisible, setModalVisible] = useState(false);

  // 3. 新增作物的表單暫存變數
  const [cropName, setCropName] = useState('');
  const [cropArea, setCropArea] = useState('A區');
  const [cropStage, setCropStage] = useState('幼苗期');

  // 4. 新增按鈕觸發事件
  const handleAddCrop = () => {
    if (!cropName.trim()) {
      alert('請輸入作物名稱！');
      return;
    }

    const newCrop = {
      id: crops.length + 1,
      name: cropName,
      area: cropArea,
      status: '生長中', // 新增預設為生長中
      stage: cropStage,
      health: '良好',  // 新增預設為良好
    };

    setCrops([...crops, newCrop]); // 加進陣列
    
    // 清空表單並關閉視窗
    setCropName('');
    setCropArea('A區');
    setCropStage('幼苗期');
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainLayout}>
          
          {/* === 頂部導覽列 === */}
          <View style={styles.topNav}>
            <View style={styles.navLeftGroup}>
              <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/environment')}>
                <Text style={styles.navText}>環境總覽</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/alerts')}>
                <Text style={styles.navText}>警示設定</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.navItem, styles.navItemActive]} onPress={() => router.replace('/crops')}>
                <Text style={styles.navTextActive}>作物管理</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/reports')}>
                <Text style={styles.navText}>報表統計</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.navRightGroup} onPress={() => router.replace('/profile')}>
              <FontAwesome name="user-o" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* === 頁面標題 === */}
          <Text style={styles.pageTitle}>作物狀態監控</Text>

          {/* === 作物卡片網格 === */}
          <View style={styles.gridContainer}>
            {crops.map((crop) => (
              <View key={crop.id} style={styles.cropCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cropName}>{crop.area} - {crop.name}</Text>
                  <View style={[
                    styles.statusBadge, 
                    crop.status === '可採收' ? styles.badgeSuccess : styles.badgeNormal
                  ]}>
                    <Text style={styles.badgeText}>{crop.status}</Text>
                  </View>
                </View>
                
                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>當前階段：</Text>
                    <Text style={styles.infoValue}>{crop.stage}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>健康狀況：</Text>
                    <Text style={[
                      styles.infoValue, 
                      crop.health === '需注意' ? styles.textWarning : styles.textNormal
                    ]}>
                      {crop.health}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.detailButton} onPress={() => console.log('查看詳情', crop.id)}>
                  <Text style={styles.detailButtonText}>詳細數據</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* === 新增作物按鈕卡片 (灰色虛線外框) === */}
            <TouchableOpacity 
              style={styles.addCropCard} 
              onPress={() => setModalVisible(true)}
            >
              <FontAwesome name="plus" size={24} color="#888" style={{ marginBottom: 8 }} />
              <Text style={styles.addCropText}>新增作物</Text>
            </TouchableOpacity>
          </View>
          
        </View>
      </ScrollView>

      {/* ================= 新增作物的彈出視窗 (Modal) ================= */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>建立新紀錄</Text>

            {/* 表單內容 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>作物名稱</Text>
              <TextInput
                style={styles.formInput}
                placeholder="例如：小黃瓜、九層塔..."
                placeholderTextColor="#666"
                value={cropName}
                onChangeText={setCropName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>種植區域</Text>
              <View style={styles.pickerWrapper}>
                <RNPickerSelect
                  value={cropArea}
                  onValueChange={(value) => setCropArea(value)}
                  items={[
                    { label: 'A區 (溫室區)', value: 'A區' },
                    { label: 'B區 (水耕區)', value: 'B區' },
                    { label: 'C區 (戶外區)', value: 'C區' },
                  ]}
                  style={pickerSelectStyles}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>目前生長階段</Text>
              <View style={styles.pickerWrapper}>
                <RNPickerSelect
                  value={cropStage}
                  onValueChange={(value) => setCropStage(value)}
                  items={[
                    { label: '幼苗期', value: '幼苗期' },
                    { label: '成長期', value: '成長期' },
                    { label: '開花期', value: '開花期' },
                    { label: '結果期', value: '結果期' },
                    { label: '成熟期', value: '成熟期' },
                  ]}
                  style={pickerSelectStyles}
                />
              </View>
            </View>

            {/* 按鈕操作區 */}
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.btnCancel]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnCancelText}>取消</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.btnSubmit]} 
                onPress={handleAddCrop}
              >
                <Text style={styles.btnSubmitText}>確認新增</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// 下拉選單專用樣式 (深色主題防呆優化)
const pickerSelectStyles = StyleSheet.create({
  inputIOS: { fontSize: 15, paddingVertical: 10, paddingHorizontal: 12, color: '#FFF' },
  inputAndroid: { fontSize: 15, paddingHorizontal: 12, paddingVertical: 10, color: '#FFF' },
  inputWeb: { fontSize: 15, paddingHorizontal: 12, paddingVertical: 10, color: '#FFF', borderWidth: 0 }
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E2328' },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  mainLayout: { width: '100%', maxWidth: 1000, padding: 30 },
  
  // 導覽列樣式
  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, width: '100%' },
  navLeftGroup: { flex: 1, flexDirection: 'row', gap: 25, alignItems: 'center' },
  navRightGroup: { marginLeft: 'auto' },
  navItem: { paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  navItemActive: { borderBottomColor: '#5A8B73' },
  navText: { color: '#999', fontSize: 16 },
  navTextActive: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  pageTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },

  // 網格佈局
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  
  // 一般作物卡片
  cropCard: {
    width: '31%', 
    minWidth: 280,
    backgroundColor: '#2A2F35',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3E444A',
    justifyContent: 'space-between',
    minHeight: 180,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cropName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  badgeNormal: { backgroundColor: '#3E444A' },
  badgeSuccess: { backgroundColor: '#4A7561' },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  
  cardBody: { marginBottom: 15 },
  infoRow: { flexDirection: 'row', marginBottom: 6 },
  infoLabel: { color: '#AAA', fontSize: 14 },
  infoValue: { color: '#FFF', fontSize: 14 },
  textNormal: { color: '#FFF' },
  textWarning: { color: '#F06E6E' },

  detailButton: { backgroundColor: '#3E444A', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  detailButtonText: { color: '#FFF', fontSize: 13, fontWeight: '500' },

  // 新增作物卡片 (灰色虛線外框)
  addCropCard: {
    width: '31%',
    minWidth: 280,
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#4A525A',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 180,
  },
  addCropText: { color: '#888', fontSize: 16, fontWeight: '500' },

  // ================= 燈箱視窗 (Modal) 樣式 =================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // 半透明遮罩
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 450,
    backgroundColor: '#2A2F35', // 契合背景色
    borderRadius: 16,
    padding: 25,
    borderWidth: 1,
    borderColor: '#3E444A',
  },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  formGroup: { marginBottom: 18 },
  formLabel: { color: '#AAA', fontSize: 14, marginBottom: 8 },
  formInput: {
    backgroundColor: '#1E2328',
    color: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#3E444A',
  },
  pickerWrapper: {
    backgroundColor: '#1E2328',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3E444A',
  },
  modalButtonGroup: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  btnCancel: { backgroundColor: '#3E444A' },
  btnCancelText: { color: '#AAA', fontWeight: '500' },
  btnSubmit: { backgroundColor: '#4A7561' },
  btnSubmitText: { color: '#FFF', fontWeight: 'bold' },
});