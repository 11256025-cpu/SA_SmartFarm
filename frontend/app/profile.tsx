/*
 * frontend/app/profile.tsx - 使用者個人資料頁面。
 * 提供檢視與編輯暱稱、更換大頭貼，以及登出帳號的功能。
 */
import { FontAwesome, Ionicons } from '@expo/vector-icons'; // 新增 icon 函式庫以顯示大頭貼
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNotifications } from '../components/NotificationProvider';
import PageShell from '../components/PageShell';
import { colors, radii, spacing, typography } from '../components/sharedStyles';

// 定義後端 API 基礎位址，自動判斷執行環境 (Android 模擬器或本機)
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export default function ProfileScreen() {
  // 取得全域推播通知函式
  const { addNotification } = useNotifications();
  
  // === 狀態管理 ===
  // 使用者大頭貼的 Base64 圖片字串或 URI
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  // 使用者的顯示暱稱
  const [userName, setUserName] = useState('');
  // 控制編輯暱稱彈窗的顯示與隱藏
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  // 儲存編輯彈窗中正在輸入的新暱稱
  const [editName, setEditName] = useState('');
  // 使用者的登入帳號 (通常作為唯一識別，不可修改)
  const [loginAccount, setLoginAccount] = useState('');
  // 控制頁面初始載入狀態，避免載入期間畫面顯示空白或預設值而產生閃爍
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：元件掛載時從本地快取 (AsyncStorage) 與後端 API 取得使用者資料
  useEffect(() => {
    // 💡 實用技巧：建立一個帶有 Timeout 功能的 fetch 包裝函式
    // 避免後端沒開或網路不穩時，fetch 一直處於 pending 導致畫面卡在「資料載入中」
    const fetchWithTimeout = (url: string, options: RequestInit = {}, timeout = 3000) => {
      return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error('連線逾時')), timeout))
      ]) as Promise<Response>;
    };

    const loadProfile = async () => {
      try {
        let uid = await AsyncStorage.getItem('userId') || '1';
        
        // 💡 效能優化 (Optimistic UI)：
        // 先從 AsyncStorage 取得本地快取，讓使用者一點進頁面就能立刻看到自己的資料，無須等待網路請求
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

        // 如果有本地快取，就先解除 isLoading 狀態，讓使用者瞬間看到畫面
        if (hasLocalData) {
          setIsLoading(false);
        }

        // 接著在背景向後端請求最新資料，確保若有在別的裝置修改過，畫面能同步更新
        const resp = await fetchWithTimeout(`${BASE_URL}/api/users/${uid}`, {}, 3000);
        
        if (!resp.ok) {
          throw new Error(`伺服器回傳錯誤狀態碼: ${resp.status}`);
        }
        
        const data = await resp.json();
        
        // 處理回傳的資料結構，兼容 { success: true, user: {...} } 或直接回傳 user 物件的寫法
        let userData = data.user || data;
        
        // 許多資料庫 (如 MySQL) 查詢單筆資料時仍會回傳陣列格式，這裡加上檢查自動提取第一筆
        if (Array.isArray(userData)) {
          userData = userData[0];
        }

        if (userData) {
          console.log("✅ 成功從資料庫綁定資料:", userData); // 方便你觀察有沒有抓對
          if (userData.nickname) {
            setUserName(userData.nickname);
            await AsyncStorage.setItem('userName', userData.nickname);
          }
          // 優先讀取對應資料庫的 account 欄位 (若無則降級尋找 username)
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
        // 如果網路不穩或後端沒開，印出警告，但此時畫面上還是會顯示剛才載入的快取資料
        console.log('取得使用者資料失敗，使用本地快取。', e);
      } finally {
        setIsLoading(false); // 確保發生錯誤時也能解除載入狀態
      }
    };
    
    loadProfile();
  }, []);

  // 處理更換大頭貼的操作邏輯
  const handleChangeAvatar = async () => {
    // 1. 請求手機相簿存取權限
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      // 若遭拒絕，提示使用者
      addNotification({
        title: '權限不足',
        message: '系統需要手機相簿存取權限才能更換大頭貼！',
        type: 'warning',
      });
      return;
    }

    // 2. 開啟相簿選擇器
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // 僅允許選擇圖片
      allowsEditing: true, // 允許裁切
      aspect: [1, 1],      // 強制裁切比例為正方形 1:1，適合大頭貼
      quality: 0.3, // 降低畫質避免 base64 字串過大撐爆資料庫
      base64: true, // 關鍵設定：要求直接將圖片轉成 Base64 編碼的文字格式回傳
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      // 組合完整的 Base64 字串 (加入 MIME type)，這樣就再也不會因為手機內的實體檔案被刪除而破圖了
      const imagePayload = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      
      // 更新前端畫面
      setAvatarUri(imagePayload);
      try {
        // 優先儲存至本地端快取，讓下次開啟 App 時能馬上看見新照片
        await AsyncStorage.setItem('avatarUri', imagePayload);
        addNotification({
          title: '頭像更新成功',
          message: '您的大頭貼已更新並同步至系統。',
          type: 'success',
        });
        
        let uid = await AsyncStorage.getItem('userId') || '1';
        
        // 嘗試將新頭像同步到後端 API，讓所有裝置都能讀到
        const response = await fetch(`${BASE_URL}/api/users/${uid}/avatar`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: imagePayload })
        });
        
        if (response.ok) console.log('✅ 頭像成功實體存入資料庫！');
        else console.log('❌ 後端更新頭像失敗', await response.text());
      } catch (e) {
        console.warn('儲存大頭貼失敗', e);
        addNotification({
          title: '頭像更新失敗',
          message: '儲存大頭貼時發生錯誤，請稍後再試。',
          type: 'error',
        });
      }
    }
  };

  // 處理儲存編輯後的新暱稱邏輯
  const handleSaveProfile = async () => {
    // 防呆機制：確保暱稱不能為空白或只有空白字元
    if (!editName.trim()) {
      addNotification({
        title: '暱稱不可空白',
        message: '請輸入有效的暱稱內容。',
        type: 'warning',
      });
      return;
    }
    
    // 先更新畫面狀態與關閉彈窗 (帶來更好的流暢度)
    setUserName(editName);
    setIsEditModalVisible(false);
    
    try {
      // 同步到本地快取
      await AsyncStorage.setItem('userName', editName);
      addNotification({
        title: '暱稱更新成功',
        message: '您的暱稱已更新並存入本地。',
        type: 'success',
      });
      let uid = await AsyncStorage.getItem('userId') || '1';
      
      // 非同步發送到後端 API 儲存 (不 await 阻塞畫面)
      fetch(`${BASE_URL}/api/users/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: editName })
      }).catch(() => console.log('後端更新暱稱失敗，但已存入本地快取'));
    } catch (e) {
      console.warn('儲存暱稱失敗', e);
      addNotification({
        title: '暱稱更新失敗',
        message: '儲存暱稱時發生錯誤，請稍後再試。',
        type: 'error',
      });
    }
  };

  // 處理跨平台的登出邏輯並清除本地登入快取
  const handleLogout = async () => {
    // 區分 Web 瀏覽器與原生手機 App 不同的系統提示框實作方式
    if (Platform.OS === 'web') {
      // Web 環境使用 window.confirm
      const confirmed = window.confirm('確定要登出您的帳號嗎？');
      if (!confirmed) return;
      
      // 清除全部 AsyncStorage 紀錄 (包含 userId 等)
      await AsyncStorage.clear();
      addNotification({
        title: '登出成功',
        message: '您已成功登出。',
        type: 'info',
      });
      // 將使用者導回登入頁
      router.replace('/(auth)/login');
    } else {
      // iOS / Android 環境使用原生的 Alert 元件
      Alert.alert('登出確認', '確定要登出您的帳號嗎？', [
        { text: '取消', style: 'cancel' },
        { 
          text: '確定登出', 
          onPress: async () => { await AsyncStorage.clear(); addNotification({ title: '登出成功', message: '您已成功登出。', type: 'info' }); router.replace('/(auth)/login'); } 
        }
      ]);
    }
  };

  // 防閃爍處理：如果仍在讀取本地快取，則先顯示單純的載入畫面
  if (isLoading) {
    return (
      <PageShell>
        <View style={[styles.page, { justifyContent: 'center' }]}>
          <Text style={{ color: '#FFF', fontSize: 16 }}>資料載入中...</Text>
        </View>
      </PageShell>
    );
  }

  // === 畫面渲染區 ===
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
                    {/* 點擊鉛筆圖標開啟編輯彈窗 */}
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
              {/* 彈窗標題列 */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>編輯個人資料</Text>
                <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.closeBtn}>
                  <FontAwesome name="times" size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>

              {/* 彈窗輸入內容 */}
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

              {/* 彈窗底部按鈕 */}
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