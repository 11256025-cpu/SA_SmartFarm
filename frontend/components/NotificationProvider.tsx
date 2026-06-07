/*
 * frontend/components/NotificationProvider.tsx - 全域通知狀態管理與通知面板。
 */
import React, { createContext, useCallback, useContext, useState } from 'react';

export type NotificationType = 'alert' | 'success' | 'warning' | 'info' | 'error';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  action?: () => void;
  createdAt: number;
  read: boolean;
}

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

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [panelVisible, setPanelVisible] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev].slice(0, 30));
  }, []);

  const addNotifications = useCallback((notificationList: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>[]) => {
    const newNotifications = notificationList.map((notification) => ({
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      read: false,
    }));
    setNotifications((prev) => [...newNotifications, ...prev].slice(0, 30));
  }, []);

  const replaceNotificationsOfType = useCallback((type: NotificationType, notificationList: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>[]) => {
    setNotifications((prev) => {
      const filtered = prev.filter(n => n.type !== type);
      const newNotifications = notificationList.map((notification) => ({
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        read: false,
      }));
      return [...newNotifications, ...filtered].slice(0, 30);
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter(n => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const openPanel = useCallback(() => {
    setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
    setPanelVisible(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelVisible(false);
  }, []);

  const togglePanel = useCallback(() => {
    setPanelVisible((prev) => {
      if (!prev) {
        setNotifications((prevNotifications) => prevNotifications.map(n => ({ ...n, read: true })));
      }
      return !prev;
    });
  }, []);

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

  return React.createElement(
    NotificationContext.Provider,
    { value },
    children
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
