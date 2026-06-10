/*
 * frontend/components/NotificationProvider.tsx - 全域通知狀態管理與通知面板。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// 1. 定義通知的類型，用來決定通知面板中顯示的圖示與邊框顏色
export type NotificationType = 'alert' | 'success' | 'warning' | 'info' | 'error';

// 2. 定義單筆通知的資料結構
export interface NotificationItem {
  id: string;               // 通知唯一識別碼
  title: string;            // 通知標題
  message: string;          // 通知詳細內容
  type: NotificationType;   // 通知類型
  action?: () => void;      // (可選) 點擊通知的「前往查看」按鈕時執行的回呼函式
  createdAt: number;        // 建立時間 (Timestamp)
  read: boolean;            // 是否已讀狀態
}

// 3. 定義 Context 提供的狀態與操作方法 (API 介面)
interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  panelVisible: boolean;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void;
  addNotifications: (notifications: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>[]) => void;
  replaceNotificationsOfType: (type: NotificationType, notifications: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>[]) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

// 建立 React Context，預設值為 undefined
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// 4. 實作 Notification Provider 元件
// 這個元件會包在應用程式的最外層 (在 _layout.tsx 中)，讓內部所有元件都能共享通知狀態
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // === 狀態管理 ===
  // 儲存所有通知的陣列
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // 控制右側浮動通知面板是否展開
  const [panelVisible, setPanelVisible] = useState(false);

  // 動態計算「未讀通知」的數量
  const unreadCount = notifications.filter(n => !n.read).length;

  const persistNotifications = useCallback(async (userId: string, next: NotificationItem[]) => {
    try {
      await AsyncStorage.setItem(`notifications:${userId}`, JSON.stringify(next));
    } catch (_e) {
      // ignore storage errors
    }
  }, []);

  const loadNotificationsForUser = useCallback(async (userId: string) => {
    try {
      const raw = await AsyncStorage.getItem(`notifications:${userId}`);
      if (raw) {
        const parsed: NotificationItem[] = JSON.parse(raw);
        setNotifications(parsed);
        return;
      }
    } catch (_e) {
      // ignore
    }
    setNotifications([]);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const uid = (await AsyncStorage.getItem('userId')) || '1';
        setCurrentUserId(uid);
        await loadNotificationsForUser(uid);
      } catch (_e) {
        // ignore
      }
    })();
  }, [loadNotificationsForUser]);

  const addNotification = useCallback(async (notification: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      read: false,
    };
    const userId = currentUserId || (await AsyncStorage.getItem('userId')) || '1';
    const next = [newNotification, ...notifications].slice(0, 30);
    setNotifications(next);
    await persistNotifications(userId, next);
  }, [currentUserId, notifications, persistNotifications]);

  // 一次新增多筆通知
  const addNotifications = useCallback(async (notificationList: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>[]) => {
    const newNotifications = notificationList.map((notification) => ({
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      read: false,
    }));
    const userId = currentUserId || (await AsyncStorage.getItem('userId')) || '1';
    const next = [...newNotifications, ...notifications].slice(0, 30);
    setNotifications(next);
    await persistNotifications(userId, next);
  }, [currentUserId, notifications, persistNotifications]);

  // 替換特定類型的通知 (常用於覆寫同類型的警告，避免同一種警告重複洗頻)
  const replaceNotificationsOfType = useCallback(async (type: NotificationType, notificationList: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>[]) => {
    const newNotifications = notificationList.map((notification) => ({
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      read: false,
    }));
    const filtered = notifications.filter(n => n.type !== type);
    const next = [...newNotifications, ...filtered].slice(0, 30);
    const userId = currentUserId || (await AsyncStorage.getItem('userId')) || '1';
    setNotifications(next);
    await persistNotifications(userId, next);
  }, [currentUserId, notifications, persistNotifications]);

  // 移除指定的單筆通知
  const removeNotification = useCallback(async (id: string) => {
    const next = notifications.filter(n => n.id !== id);
    const userId = currentUserId || (await AsyncStorage.getItem('userId')) || '1';
    setNotifications(next);
    await persistNotifications(userId, next);
  }, [currentUserId, notifications, persistNotifications]);

  // 清空所有通知
  const clearNotifications = useCallback(async () => {
    const userId = currentUserId || (await AsyncStorage.getItem('userId')) || '1';
    setNotifications([]);
    try {
      await AsyncStorage.removeItem(`notifications:${userId}`);
    } catch (_e) {}
  }, [currentUserId]);

  // 打開通知面板：開啟的瞬間會將目前所有的通知標記為「已讀」
  const openPanel = useCallback(async () => {
    const next = notifications.map(n => ({ ...n, read: true }));
    const userId = currentUserId || (await AsyncStorage.getItem('userId')) || '1';
    setNotifications(next);
    setPanelVisible(true);
    await persistNotifications(userId, next);
  }, [currentUserId, notifications, persistNotifications]);

  // 關閉通知面板
  const closePanel = useCallback(() => {
    setPanelVisible(false);
  }, []);

  // 切換通知面板顯示狀態
  const togglePanel = useCallback(async () => {
    if (!panelVisible) {
      const next = notifications.map(n => ({ ...n, read: true }));
      const userId = currentUserId || (await AsyncStorage.getItem('userId')) || '1';
      setNotifications(next);
      setPanelVisible(true);
      await persistNotifications(userId, next);
      return;
    }
    setPanelVisible(false);
  }, [panelVisible, currentUserId, notifications, persistNotifications]);

  // 匯集所有狀態與方法，準備傳遞給 Context
  const value: NotificationContextType = {
    notifications,
    unreadCount,
    panelVisible,
    addNotification,
    addNotifications,
    replaceNotificationsOfType,
    removeNotification,
    clearNotifications,
    openPanel,
    closePanel,
    togglePanel,
  };

  // 渲染 Provider，將 value 往下層傳遞
  return React.createElement(
    NotificationContext.Provider,
    { value },
    children
  );
};

// 5. 提供一個客製化 Hook (Custom Hook)，讓各個元件可以輕鬆取得通知系統的方法
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    // 防呆機制：確保使用這個 Hook 的元件一定是被包在 NotificationProvider 內
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
