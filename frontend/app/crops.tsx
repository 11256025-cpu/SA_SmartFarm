import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import PageShell from '../components/PageShell';
import { colors, radii, spacing, typography } from '../components/sharedStyles';

interface CropItem {
  id: string;
  name: string;
  image: string;
}

export default function CropManagementScreen() {
  // 控制目前顯示哪個畫面：'list' (列表頁) 或 'add' (新增作物頁)
  const [currentView, setCurrentView] = useState<'list' | 'add'>('list');
  
  const [crops] = useState<CropItem[]>([
    { id: '1', name: '草莓', image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400' },
    { id: '2', name: '菠菜', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400' },
    { id: '3', name: '藍莓', image: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=400' },
    { id: '4', name: '番茄', image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=400' },
    { id: '5', name: '香蕉', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400' },
    { id: '6', name: '茄子', image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400' },
  ]);

  const handleNavPress = (target: string) => {
    if (target === '作物管理') {
      setCurrentView('list');
    } else {
      alert('導航跳轉：正在前往 ' + target);
    }
  };

  const handleCropPress = (cropName: string) => {
    alert('作物詳情：已選取「' + cropName + '」，正在載入監控數據...');
  };

  const handleSaveCrop = () => {
    alert('資料已儲存！');
    setCurrentView('list'); // 儲存後自動返回列表
  };

  return (
    <PageShell active="crops">
      {/* ---------------- 畫面一：作物管理主列表 ---------------- */}
      {currentView === 'list' && (
        <View style={styles.cardContentContainer}>
          <View style={styles.cardGrid}>
            {crops.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.longCard}
                onPress={() => handleCropPress(item.name)}
                activeOpacity={0.7}
              >
                <View style={styles.cardLeft}>
                  <Image source={{ uri: item.image }} style={styles.cropImage} />
                  <Text style={styles.cropName}>{item.name}</Text>
                </View>
                
                <View style={styles.arrowCircle}>
                  <Text style={styles.arrowText}>❯</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* 右下角：新增作物按鍵 */}
          <View style={styles.fabContainer}>
            <TouchableOpacity 
              style={styles.fabButton} 
              onPress={() => setCurrentView('add')} // 點擊切換至表單頁面
              activeOpacity={0.8}
            >
              <Text style={styles.fabText}>新增作物</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ---------------- 畫面二：新增作物表單面板 (完全還原圖二視覺) ---------------- */}
      {currentView === 'add' && (
        <View style={styles.formMainContainer}>
          <View style={styles.formRowLayout}>
            
            {/* 左側：圖片與基礎文字欄位 */}
            <View style={styles.formLeftColumn}>
              {/* 圖片上傳區域 */}
              <TouchableOpacity style={styles.imageUploadBox} activeOpacity={0.8}>
                <View style={styles.uploadIconCircle}>
                  <View style={styles.uploadIconPic} />
                  <Text style={styles.uploadPlusText}>+</Text>
                </View>
              </TouchableOpacity>

              {/* 作物名稱 */}
              <View style={styles.inputCard}>
                <Text style={styles.inputTitle}>作物名稱</Text>
                <TextInput 
                  style={styles.textInputStyle} 
                  placeholder="請輸入作物名稱" 
                  placeholderTextColor="#757575"
                />
              </View>

              {/* 適合栽種月份 */}
              <View style={styles.inputCard}>
                <Text style={styles.inputTitle}>適合栽培月份</Text>
                <TextInput 
                  style={styles.textInputStyle} 
                  placeholder="[11月~2月]" 
                  placeholderTextColor="#757575"
                />
              </View>
            </View>

            {/* 右側：滑塊與週期設定 */}
            <View style={styles.formRightColumn}>
              {/* 適合濕度範圍 */}
              <View style={styles.rightCardBox}>
                <Text style={styles.inputTitle}>適合濕度範圍</Text>
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderTrackLine} />
                  <View style={styles.sliderActiveLine} />
                  <View style={[styles.sliderNode, { left: '35%' }]} />
                  <View style={[styles.sliderNode, { left: '55%' }]} />
                </View>
                <View style={styles.sliderLabelsRow}>
                  <Text style={styles.sliderSideLabel}>0%</Text>
                  <View style={styles.sliderCenterLabels}>
                    <Text style={[styles.sliderValueText, { marginRight: 20 }]}>35%</Text>
                    <Text style={styles.sliderValueText}>50%</Text>
                  </View>
                  <Text style={styles.sliderSideLabel}>100%</Text>
                </View>
              </View>

              {/* 生長週期設定 */}
              <View style={styles.rightCardBox}>
                <Text style={styles.inputTitle}>生長週期設定</Text>
                
                {/* 下拉選單模擬樣式 */}
                <TouchableOpacity style={styles.dropdownSelector}>
                  <Text style={styles.dropdownText}>[80天]</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                {/* 下拉展開清單模擬 */}
                <View style={styles.dropdownMenuMock}>
                  <View style={[styles.menuItem, styles.menuItemActive]}><Text style={styles.menuItemTextActive}>[80天]</Text></View>
                  <View style={styles.menuItem}><Text style={styles.menuItemText}>[120天]</Text></View>
                  <View style={styles.menuItem}><Text style={styles.menuItemText}>[3個月]</Text></View>
                  <View style={styles.menuItem}><Text style={styles.menuItemText}>[6個月]</Text></View>
                  <View style={styles.menuItem}><Text style={styles.menuItemText}>[自定義]</Text></View>
                </View>

                {/* 自定義天數輸入框 */}
                <View style={styles.customDayContainer}>
                  <Text style={styles.customDayLabel}>[自定義]</Text>
                  <View style={styles.customDayInputRow}>
                    <View style={styles.dayNumBox}>
                      <Text style={styles.dayNumText}>[20]</Text>
                    </View>
                    <Text style={styles.dayUnitText}>天</Text>
                  </View>
                </View>

                {/* 儲存按鍵 */}
                <TouchableOpacity style={styles.saveFormButton} onPress={handleSaveCrop}>
                  <Text style={styles.saveButtonText}>儲存</Text>
                </TouchableOpacity>

              </View>
            </View>

          </View>
        </View>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  cardContentContainer: {
    flex: 1,
    width: '100%',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 100,
  },
  longCard: {
    backgroundColor: colors.card, 
    width: '49%', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.lg, 
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: spacing.lg,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropImage: {
    width: 85,
    height: 70,
    borderRadius: radii.md,
  },
  cropName: {
    color: colors.text,
    fontSize: typography.large,
    fontWeight: '500',
    marginLeft: 20,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.text,
    opacity: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 2, 
  },
  fabContainer: {
    position: 'absolute',
    bottom: 40,
    right: '5%',
  },
  fabButton: {
    backgroundColor: colors.primary, 
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radii.md,
  },
  fabText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 1,
  },

  /* ---------------- 圖二：表單專用樣式區 ---------------- */
  formMainContainer: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingBottom: 60,
  },
  formRowLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  formLeftColumn: {
    width: '49%',
  },
  formRightColumn: {
    width: '49%',
  },
  imageUploadBox: {
    width: '100%',
    height: 240,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  uploadIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: colors.subMuted,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  uploadIconPic: {
    width: 36,
    height: 28,
    borderWidth: 3,
    borderColor: colors.subMuted,
    borderRadius: 6,
  },
  uploadPlusText: {
    color: colors.subMuted,
    fontSize: 22,
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 12,
    right: 14,
    backgroundColor: colors.card,
    paddingHorizontal: 2,
  },
  inputCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: spacing.lg,
  },
  inputTitle: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 12,
  },
  textInputStyle: {
    backgroundColor: colors.border,
    borderRadius: radii.md,
    height: 40,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 14,
  },
  rightCardBox: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 22,
    marginBottom: spacing.lg,
  },
  sliderContainer: {
    height: 30,
    justifyContent: 'center',
    position: 'relative',
    marginTop: 10,
  },
  sliderTrackLine: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    width: '100%',
  },
  sliderActiveLine: {
    position: 'absolute',
    height: 4,
    backgroundColor: colors.primary,
    left: '35%',
    right: '45%',
  },
  sliderNode: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.text,
    top: 9,
    marginLeft: -6,
  },
  sliderLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderSideLabel: {
    color: colors.subMuted,
    fontSize: 14,
  },
  sliderCenterLabels: {
    flexDirection: 'row',
  },
  sliderValueText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  dropdownText: {
    color: colors.subMuted,
    fontSize: 14,
  },
  dropdownArrow: {
    color: colors.subMuted,
    fontSize: 12,
  },
  dropdownMenuMock: {
    backgroundColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
  },
  menuItemActive: {
    backgroundColor: colors.subMuted,
  },
  menuItemTextActive: {
    color: colors.muted,
    fontSize: 14,
  },
  menuItemText: {
    color: colors.subMuted,
    fontSize: 14,
  },
  customDayContainer: {
    marginBottom: 24,
  },
  customDayLabel: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 8,
  },
  customDayInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayNumBox: {
    backgroundColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  dayNumText: {
    color: colors.subMuted,
    fontSize: 14,
  },
  dayUnitText: {
    color: colors.text,
    fontSize: 16,
  },
  saveFormButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 4,
  },
});