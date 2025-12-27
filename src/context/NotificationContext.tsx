import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { swapApi } from '../api/client';
import { useAuth } from './AuthContext';

export interface Notification {
    id: string;
    type: 'swap_pending' | 'system' | 'info' | 'warning';
    title: string;
    message: string;
    time: string;
    read: boolean;
    link?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    pendingSwapCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    refresh: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [pendingSwapCount, setPendingSwapCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        if (!currentUser) return;

        // Fetch pending swap requests for this user
        const swapRes = await swapApi.getByStaff(currentUser.id);
        if (swapRes.success) {
            const pendingForMe = swapRes.data.filter(
                r => r.targetId === currentUser.id && r.status === 'pending'
            );
            setPendingSwapCount(pendingForMe.length);

            // Build notifications from pending swaps
            const swapNotifications: Notification[] = pendingForMe.map(r => ({
                id: `swap-${r.id}`,
                type: 'swap_pending' as const,
                title: '換班請求待處理',
                message: `${r.requesterName} 申請與您換班`,
                time: new Date(r.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
                read: false,
                link: '/nurse/swap'
            }));

            // Add static system notification
            const systemNotifications: Notification[] = [
                {
                    id: 'system-preleave',
                    type: 'system',
                    title: '系統公告',
                    message: '下月班表開放預假申請中，請於截止日前完成申請。',
                    time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
                    read: true,
                    link: '/nurse/preleave'
                }
            ];

            setNotifications([...swapNotifications, ...systemNotifications]);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            pendingSwapCount,
            markAsRead,
            markAllAsRead,
            refresh: fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
