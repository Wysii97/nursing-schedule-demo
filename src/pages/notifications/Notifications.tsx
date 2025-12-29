import React, { useState } from 'react';
import { Bell, Check, CheckCheck, Calendar, FileText, RefreshCw, Trash2 } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import styles from './Notifications.module.css';

const Notifications: React.FC = () => {
    const { notifications, markAsRead, clearAll } = useNotifications();
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const filteredNotifications = filter === 'all'
        ? notifications
        : notifications.filter(n => !n.read);

    const getIcon = (type: string) => {
        switch (type) {
            case 'schedule_published':
            case 'schedule_updated':
                return <Calendar size={18} />;
            case 'leave_approved':
            case 'leave_rejected':
                return <FileText size={18} />;
            case 'swap_request':
            case 'swap_approved':
                return <RefreshCw size={18} />;
            default:
                return <Bell size={18} />;
        }
    };

    const getTypeColor = (type: string) => {
        if (type.includes('approved')) return '#10B981';
        if (type.includes('rejected')) return '#EF4444';
        if (type.includes('schedule')) return '#3B82F6';
        if (type.includes('swap')) return '#F59E0B';
        return '#6B7280';
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '剛剛';
        if (minutes < 60) return `${minutes} 分鐘前`;
        if (hours < 24) return `${hours} 小時前`;
        if (days < 7) return `${days} 天前`;
        return date.toLocaleDateString('zh-TW');
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>
                        <Bell size={24} />
                        通知中心
                    </h1>
                    <span className={styles.count}>
                        {notifications.filter(n => !n.read).length} 則未讀
                    </span>
                </div>
                <div className={styles.headerActions}>
                    <button
                        className={styles.actionBtn}
                        onClick={() => clearAll()}
                    >
                        <Trash2 size={16} />
                        清空全部
                    </button>
                </div>
            </div>

            <div className={styles.filters}>
                <button
                    className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
                    onClick={() => setFilter('all')}
                >
                    全部
                </button>
                <button
                    className={`${styles.filterBtn} ${filter === 'unread' ? styles.active : ''}`}
                    onClick={() => setFilter('unread')}
                >
                    未讀
                </button>
            </div>

            <div className={styles.list}>
                {filteredNotifications.length === 0 ? (
                    <div className={styles.empty}>
                        <Bell size={48} />
                        <p>沒有通知</p>
                    </div>
                ) : (
                    filteredNotifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`${styles.item} ${!notification.read ? styles.unread : ''}`}
                            onClick={() => markAsRead(notification.id)}
                        >
                            <div
                                className={styles.iconWrapper}
                                style={{ background: `${getTypeColor(notification.type)}20`, color: getTypeColor(notification.type) }}
                            >
                                {getIcon(notification.type)}
                            </div>
                            <div className={styles.content}>
                                <p className={styles.message}>{notification.message}</p>
                                <span className={styles.time}>{formatTime(notification.timestamp)}</span>
                            </div>
                            <div className={styles.status}>
                                {notification.read ? (
                                    <CheckCheck size={16} className={styles.readIcon} />
                                ) : (
                                    <Check size={16} className={styles.unreadIcon} />
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Notifications;
