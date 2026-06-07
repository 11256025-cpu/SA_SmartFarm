/*
 * frontend/components/NotificationProvider.tsx - 全域通知狀態管理與通知面板。
 */
import React, { createContext, useCallback, useContext, useState } from 'react';

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
  // 控制右側浮動通知面板是否展開
  const [panelVisible, setPanelVisible] = useState(false);

  // 動態計算「未讀通知」的數量
  const unreadCount = notifications.filter(n => !n.read).length;

  // 新增單筆通知
  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      // 自動產生一組獨一無二的 ID (時間戳 + 亂數)
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      read: false,
    };
    // 將新通知加入陣列的最前面，並且只保留最近的 30 筆，避免累積過多導致效能下降或記憶體溢出
    setNotifications((prev) => [newNotification, ...prev].slice(0, 30));
  }, []);

  // 一次新增多筆通知
  const addNotifications = useCallback((notificationList: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>[]) => {
    const newNotifications = notificationList.map((notification) => ({
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      read: false,
    }));
    // 同樣維持只保留最近 30 筆
    setNotifications((prev) => [...newNotifications, ...prev].slice(0, 30));
  }, []);

  // 替換特定類型的通知 (常用於覆寫同類型的警告，避免同一種警告重複洗頻)
  const replaceNotificationsOfType = useCallback((type: NotificationType, notificationList: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>[]) => {
    setNotifications((prev) => {
      // 先濾除掉畫面上舊有同類型的通知
      const filtered = prev.filter(n => n.type !== type);
      const newNotifications = notificationList.map((notification) => ({
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        read: false,
      }));
      // 將新的通知與過濾後的舊通知合併，並限制長度
      return [...newNotifications, ...filtered].slice(0, 30);
    });
  }, []);

  // 移除指定的單筆通知
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter(n => n.id !== id));
  }, []);

  // 清空所有通知
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 打開通知面板：開啟的瞬間會將目前所有的通知標記為「已讀」
  const openPanel = useCallback(() => {
    setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
    setPanelVisible(true);
  }, []);

  // 關閉通知面板
  const closePanel = useCallback(() => {
    setPanelVisible(false);
  }, []);

  // 切換通知面板顯示狀態
  const togglePanel = useCallback(() => {
    setPanelVisible((prev) => {
      if (!prev) {
        // 如果原本是關閉的，切換開啟時順便將所有通知標記為「已讀」
        setNotifications((prevNotifications) => prevNotifications.map(n => ({ ...n, read: true })));
      }
      return !prev;
    });
  }, []);

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
