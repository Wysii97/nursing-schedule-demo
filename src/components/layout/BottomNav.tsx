import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Calendar, FileText, ArrowRightLeft, MoreHorizontal, Bell, Settings, LogOut, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import styles from './BottomNav.module.css';

const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { unreadCount } = useNotifications();
    const [showMore, setShowMore] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            {/* More Menu Overlay */}
            {showMore && (
                <div className={styles.moreOverlay} onClick={() => setShowMore(false)}>
                    <div className={styles.moreMenu} onClick={e => e.stopPropagation()}>
                        <div className={styles.moreHeader}>
                            <span>更多</span>
                            <button onClick={() => setShowMore(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <NavLink
                            to="/notifications"
                            className={styles.moreItem}
                            onClick={() => setShowMore(false)}
                        >
                            <Bell size={20} />
                            <span>通知中心</span>
                            {unreadCount > 0 && (
                                <span className={styles.badge}>{unreadCount}</span>
                            )}
                        </NavLink>
                        <NavLink
                            to="/settings/profile"
                            className={styles.moreItem}
                            onClick={() => setShowMore(false)}
                        >
                            <Settings size={20} />
                            <span>個人設定</span>
                        </NavLink>
                        <button className={styles.logoutItem} onClick={handleLogout}>
                            <LogOut size={20} />
                            <span>登出</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav className={styles.bottomNav}>
                <NavLink
                    to="/nurse/schedule"
                    className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                    <Calendar size={22} />
                    <span>班表</span>
                </NavLink>
                <NavLink
                    to="/nurse/leave-all"
                    className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                    <FileText size={22} />
                    <span>假別</span>
                </NavLink>
                <NavLink
                    to="/nurse/swap"
                    className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                    <ArrowRightLeft size={22} />
                    <span>換班</span>
                </NavLink>
                <button
                    className={`${styles.navItem} ${showMore ? styles.active : ''}`}
                    onClick={() => setShowMore(true)}
                >
                    <MoreHorizontal size={22} />
                    <span>更多</span>
                </button>
            </nav>
        </>
    );
};

export default BottomNav;
