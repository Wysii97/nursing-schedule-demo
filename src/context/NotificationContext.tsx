import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { swapApi, leaveApi } from '../api/client';
import { useAuth } from './AuthContext';

export interface Notification {
    id: string;
    type: 'swap_pending' | 'leave_approved' | 'leave_rejected' | 'system' | 'info' | 'warning';
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
    addNotification: (notification: Omit<Notification, 'id' | 'time' | 'read'>) => void;
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

            // Fetch recent leave requests for this user to check for approved/rejected
            const leaveRes = await leaveApi.getByStaff(currentUser.id);
            const leaveNotifications: Notification[] = [];
            if (leaveRes.success) {
                // Show notifications for recently processed (approved/rejected) requests
                const recentProcessed = leaveRes.data.filter(
                    r => (r.status === 'approved' || r.status === 'rejected') &&
                        new Date(r.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
                );
                recentProcessed.forEach(r => {
                    leaveNotifications.push({
                        id: `leave-${r.id}`,
                        type: r.status === 'approved' ? 'leave_approved' : 'leave_rejected',
                        title: r.status === 'approved' ? '預假已核准 ✓' : '預假已駁回 ✗',
                        message: `您的 ${r.date} ${r.leaveType} 已${r.status === 'approved' ? '核准' : '駁回'}`,
                        time: new Date(r.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
                        read: false,
                        link: '/nurse/preleave'
                    });
                });
            }

            // System notification
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

            setNotifications([...swapNotifications, ...leaveNotifications, ...systemNotifications]);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds for new notifications
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const addNotification = (notification: Omit<Notification, 'id' | 'time' | 'read'>) => {
        const newNotif: Notification = {
            ...notification,
            id: `notif-${Date.now()}`,
            time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
            read: false
        };
        setNotifications(prev => [newNotif, ...prev]);
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            pendingSwapCount,
            markAsRead,
            markAllAsRead,
            refresh: fetchNotifications,
            addNotification
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
