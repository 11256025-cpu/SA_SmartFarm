import { FontAwesome, Ionicons } from '@expo/vector-icons'; // 新增 icon 函式庫以顯示大頭貼
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PageShell from '../components/PageShell';
import { colors, radii, spacing, typography } from '../components/sharedStyles';

const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export default function ProfileScreen() {
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [loginAccount, setLoginAccount] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：從後端或 AsyncStorage 取得資料
  useEffect(() => {
    // 建立一個帶有 Timeout 功能的 fetch，避免後端沒開時無限等待
    const fetchWithTimeout = (url: string, options: RequestInit = {}, timeout = 3000) => {
      return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error('連線逾時')), timeout))
      ]) as Promise<Response>;
    };

    const loadProfile = async () => {
      try {
        let uid = await AsyncStorage.getItem('userId') || '1';
        
        // 先從 AsyncStorage 取得快取，避免畫面空白等待
        const localName = await AsyncStorage.getItem('userName');
        const localAvatar = await AsyncStorage.getItem('avatarUri');
        const localAccount = await AsyncStorage.getItem('loginAccount');
        
        let hasLocalData = false;
        if (localName) {
          setUserName(localName);
          hasLocalData = true;
        }
        if (localAvatar) setAvatarUri(localAvatar);
        if (localAccount) setLoginAccount(localAccount);

        // 如果有本地快取，就先解除載入狀態，讓使用者瞬間看到畫面
        if (hasLocalData) {
          setIsLoading(false);
        }

        // 向後端請求最新資料
        const resp = await fetchWithTimeout(`${BASE_URL}/api/users/${uid}`, {}, 3000);
        
        if (!resp.ok) {
          throw new Error(`伺服器回傳錯誤狀態碼: ${resp.status}`);
        }
        
        const data = await resp.json();
        
        // 處理回傳資料結構，兼容 { success: true, user: {...} } 或直接回傳物件
        let userData = data.user || data;
        
        // 💡 許多資料庫 (如 MySQL) 查詢單筆資料時仍會回傳陣列，加上這行自動提取第一筆資料
        if (Array.isArray(userData)) {
          userData = userData[0];
        }

        if (userData) {
          console.log("✅ 成功從資料庫綁定資料:", userData); // 方便你觀察有沒有抓對
          if (userData.nickname) {
            setUserName(userData.nickname);
            await AsyncStorage.setItem('userName', userData.nickname);
          }
          // 改為對應資料庫的 account 欄位 (若無則降級尋找 username)
          if (userData.account) {
            setLoginAccount(userData.account);
            await AsyncStorage.setItem('loginAccount', userData.account);
          } else if (userData.username) {
            setLoginAccount(userData.username);
            await AsyncStorage.setItem('loginAccount', userData.username);
          }
          if (userData.avatar) {
            setAvatarUri(userData.avatar);
            await AsyncStorage.setItem('avatarUri', userData.avatar);
          }
        }
      } catch (e) {
        console.log('取得使用者資料失敗，使用本地快取。', e);
      } finally {
        setIsLoading(false); // 確保發生錯誤時也能解除載入狀態
      }
    };
    
    loadProfile();
  }, []);

  const handleChangeAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('權限不足', '系統需要手機相簿存取權限才能更換大頭貼！');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3, // 降低畫質避免 base64 字串過大撐爆資料庫
      base64: true, // 💡 關鍵：要求直接將圖片轉成 Base64 編碼的文字格式
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      // 組合完整的 Base64 字串，這樣就再也不會因為實體檔案遺失而破圖了
      const imagePayload = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      
      setAvatarUri(imagePayload);
      try {
        await AsyncStorage.setItem('avatarUri', imagePayload);
        let uid = await AsyncStorage.getItem('userId') || '1';
        // 嘗試同步到後端 API
        const response = await fetch(`${BASE_URL}/api/users/${uid}/avatar`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: imagePayload })
        });
        
        if (response.ok) console.log('✅ 頭像成功實體存入資料庫！');
        else console.log('❌ 後端更新頭像失敗', await response.text());
      } catch (e) {
        console.warn('儲存大頭貼失敗', e);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('提示', '暱稱不能為空白！');
      return;
    }
    setUserName(editName);
    setIsEditModalVisible(false);
    
    try {
      await AsyncStorage.setItem('userName', editName);
      let uid = await AsyncStorage.getItem('userId') || '1';
      // 同步到後端 API
      fetch(`${BASE_URL}/api/users/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: editName })
      }).catch(() => console.log('後端更新暱稱失敗，但已存入本地快取'));
    } catch (e) {
      console.warn('儲存暱稱失敗', e);
    }
  };

  // 處理跨平台的登出邏輯並清除快取
  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('確定要登出您的帳號嗎？');
      if (!confirmed) return;
      await AsyncStorage.clear();
      router.replace('/(auth)/login');
    } else {
      Alert.alert('登出確認', '確定要登出您的帳號嗎？', [
        { text: '取消', style: 'cancel' },
        { 
          text: '確定登出', 
          onPress: async () => { await AsyncStorage.clear(); router.replace('/(auth)/login'); } 
        }
      ]);
    }
  };

  // 如果還在讀取快取，則先顯示載入畫面，避免閃爍預設值
  if (isLoading) {
    return (
      <PageShell>
        <View style={[styles.page, { justifyContent: 'center' }]}>
          <Text style={{ color: '#FFF', fontSize: 16 }}>資料載入中...</Text>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <View style={styles.page}>
        
        {/* 個人資料卡片 (依照圖片刻板) */}
        <View style={styles.profileCard}>
          <View style={styles.cardContent}>
            
            {/* 左側：大頭貼區塊 (外層不裁切以顯示相機徽章) */}
            <TouchableOpacity style={styles.avatarWrapper} onPress={handleChangeAvatar} activeOpacity={0.8}>
              <View style={styles.avatarContainer}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={70} color="#000000" />
                )}
              </View>
              {/* 相機小圖示徽章 */}
              <View style={styles.avatarEditBadge}>
                <FontAwesome name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* 右側：資訊欄位與底線 */}
            <View style={styles.infoContainer}>
              <View style={styles.fieldsRow}>
                
                {/* 用戶暱稱 */}
                <View style={styles.fieldBlock}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>用戶暱稱</Text>
                    <TouchableOpacity onPress={() => { setEditName(userName); setIsEditModalVisible(true); }}>
                      <FontAwesome name="pencil" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.valueBox}>
                    <Text style={styles.valueText}>{userName}</Text>
                  </View>
                </View>

                {/* 登入帳號 */}
                <View style={styles.fieldBlock}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>登入帳號</Text>
                  </View>
                  <View style={styles.valueBox}>
                    <Text style={styles.valueText}>{loginAccount}</Text>
                  </View>
                </View>

              </View>

              {/* 欄位下方的白色底線 */}
              <View style={styles.divider} />
              
              {/* 將登出按鈕移至卡片內部，底線下的右下角 */}
              <View style={styles.cardFooter}>
                <TouchableOpacity 
                  style={styles.signOutTextButton}
                  onPress={handleLogout}
                >
                  <Text style={styles.signOutText}>登出帳號</Text>
                </TouchableOpacity>
              </View>
            </View>
            
          </View>
        </View>

        {/* --- 編輯暱稱的置中上彈窗 Modal (共用作物的樣式模板) --- */}
        <Modal visible={isEditModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>編輯個人資料</Text>
                <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.closeBtn}>
                  <FontAwesome name="times" size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.fieldLabel}>用戶暱稱</Text>
                <TextInput 
                  style={styles.formTextInput} 
                  placeholder="請輸入新暱稱" 
                  placeholderTextColor={colors.subMuted}
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditModalVisible(false)}><Text style={styles.cancelBtnText}>取消</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}><Text style={styles.saveBtnText}>儲存修改</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: '100%',
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '10%', // 讓畫面整體維持在中上區域
  },
  profileCard: {
    backgroundColor: '#35373A', // 配合圖片的深灰色背景
    borderRadius: radii.lg,
    padding: 30, // 增加內距讓整體更大
    width: '100%',
    maxWidth: 900, // 放寬最大寬度
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 120, // 放大頭像
    height: 120,
    marginRight: spacing.xxl,
    position: 'relative',
  },
  avatarContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: '#D9D9D9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#35373A',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  fieldsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 40, // 增加欄位間距
    marginBottom: spacing.lg,
  },
  fieldBlock: {
    flex: 1,
    maxWidth: 200, // 放大欄位寬度
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#FFFFFF', // 白色文字
    fontSize: 16, // 字體稍微加大
    fontWeight: 'bold',
    marginRight: 8,
  },
  valueBox: {
    paddingVertical: 6,
    height: 36,
    justifyContent: 'center',
  },
  valueText: {
    color: '#FFFFFF',
    fontSize: 18, // 字體加大
    fontWeight: '500',
  },
  divider: {
    height: 2,
    backgroundColor: '#FFFFFF', // 白色橫線
    width: '100%',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // 靠右對齊
    marginTop: 15,
  },
  signOutTextButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    backgroundColor: 'rgba(240, 110, 110, 0.1)', // 淡紅色背景增加點擊範圍與視覺回饋
  },
  signOutText: {
    color: colors.alert,
    fontSize: 15,
    fontWeight: 'bold',
  },
  
  // --- Modal 彈窗共用樣式 (源自 crops.tsx) ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', paddingTop: '15%', alignItems: 'center', padding: spacing.xl },
  modalCard: { width: '100%', maxWidth: 460, backgroundColor: colors.leftPanel, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontSize: typography.h2, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  modalBody: { padding: spacing.xl },
  fieldLabel: { color: colors.muted, fontSize: typography.body, fontWeight: '600', marginBottom: 8 },
  formTextInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: typography.body },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: radii.md, backgroundColor: colors.border },
  cancelBtnText: { color: colors.text, fontSize: typography.body, fontWeight: 'bold' },
  saveBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: radii.md, backgroundColor: colors.primary },
  saveBtnText: { color: colors.text, fontSize: typography.body, fontWeight: 'bold' },
});