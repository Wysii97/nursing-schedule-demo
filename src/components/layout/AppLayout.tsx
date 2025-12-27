import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Plus, Bell, ChevronDown, AlertTriangle, ArrowRightLeft, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ROLE_LABELS } from '../../types';
import UnitSelector from '../ui/UnitSelector';
import RoleSwitcher from '../ui/RoleSwitcher';
import styles from './Layout.module.css';

const AppLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, hasPermission } = useAuth();
    const { notifications, unreadCount, markAllAsRead } = useNotifications();
    const [showNotifications, setShowNotifications] = useState(false);

    // Check if current path is in settings section
    const isSettingsActive = location.pathname.startsWith('/settings');

    // Role-based navigation visibility
    const canAccessSettings = hasPermission('view_settings');

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'swap_pending': return <ArrowRightLeft size={14} />;
            case 'warning': return <AlertTriangle size={14} />;
            default: return <Info size={14} />;
        }
    };

    return (
        <div className={styles.appContainer}>
            {/* Top Navigation Bar */}
            <header className={styles.topbar}>
                <div className={styles.topbarLeft}>
                    {/* Logo */}
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>
                            <Plus size={16} />
                        </div>
                        <span className={styles.logoText}>護理排班系統</span>
                    </div>

                    {/* Main Nav */}
                    <nav className={styles.topbarNav}>
                        {/* 儀表板 - only for deputy and manager */}
                        {canAccessSettings && (
                            <NavLink
                                to="/dashboard"
                                className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
                            >
                                儀表板
                            </NavLink>
                        )}

                        {/* 我的班表 - visible to all */}
                        <NavLink
                            to="/nurse/schedule"
                            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
                        >
                            我的班表
                        </NavLink>

                        {/* 預假申請 - visible to all */}
                        <NavLink
                            to="/nurse/preleave"
                            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
                        >
                            預假申請
                        </NavLink>

                        {/* 換班管理 - visible to all */}
                        <NavLink
                            to="/nurse/swap"
                            className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
                        >
                            換班管理
                        </NavLink>

                        {/* 排班管理 - only for deputy and manager */}
                        {canAccessSettings && (
                            <div className={styles.dropdown}>
                                <span className={`${styles.navLink} ${location.pathname.startsWith('/schedule') ? styles.active : ''}`}>
                                    排班管理 <ChevronDown size={14} />
                                </span>
                                <div className={styles.dropdownMenu}>
                                    <NavLink to="/schedule/conflicts" className={styles.dropdownItem}>
                                        預假衝突處理
                                    </NavLink>
                                    <NavLink to="/schedule/workbench" className={styles.dropdownItem}>
                                        排班工作台
                                    </NavLink>
                                </div>
                            </div>
                        )}

                        {/* 設定 - only for deputy and manager */}
                        {canAccessSettings && (
                            <div className={styles.dropdown}>
                                <span className={`${styles.navLink} ${isSettingsActive ? styles.active : ''}`}>
                                    設定 <ChevronDown size={14} />
                                </span>
                                <div className={styles.dropdownMenu}>
                                    <NavLink to="/settings/shifts" className={styles.dropdownItem}>
                                        班別參數設定
                                    </NavLink>
                                    <NavLink to="/settings/rules" className={styles.dropdownItem}>
                                        單位規則設定
                                    </NavLink>
                                </div>
                            </div>
                        )}
                    </nav>
                </div>

                <div className={styles.topbarRight}>
                    {/* Unit Selector */}
                    <UnitSelector />

                    {/* Notifications */}
                    <div className={styles.notificationWrapper}>
                        <button
                            className={styles.notificationBtn}
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className={styles.notificationBadge}>{unreadCount}</span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className={styles.notificationDropdown}>
                                <div className={styles.notificationHeader}>
                                    <span>通知</span>
                                    {unreadCount > 0 && (
                                        <button onClick={markAllAsRead}>全部已讀</button>
                                    )}
                                </div>
                                <div className={styles.notificationList}>
                                    {notifications.length === 0 ? (
                                        <div className={styles.noNotifications}>目前沒有通知</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div
                                                key={n.id}
                                                className={`${styles.notificationItem} ${!n.read ? styles.unread : ''}`}
                                                onClick={() => {
                                                    if (n.link) navigate(n.link);
                                                    setShowNotifications(false);
                                                }}
                                            >
                                                <div className={styles.notificationIcon}>
                                                    {getNotificationIcon(n.type)}
                                                </div>
                                                <div className={styles.notificationContent}>
                                                    <div className={styles.notificationTitle}>{n.title}</div>
                                                    <div className={styles.notificationMessage}>{n.message}</div>
                                                    <div className={styles.notificationTime}>{n.time}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Info */}
                    <div className={styles.userInfo}>
                        <div>
                            <div className={styles.userName}>{currentUser?.name || '使用者'}</div>
                            <div className={styles.userRole}>
                                {currentUser ? ROLE_LABELS[currentUser.role] : ''} · {currentUser?.level}
                            </div>
                        </div>
                        <div className={styles.avatar}>{currentUser?.name?.charAt(0) || '?'}</div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.mainContent}>
                <Outlet />
            </main>

            {/* Dev Role Switcher */}
            <RoleSwitcher />
        </div>
    );
};

export default AppLayout;
