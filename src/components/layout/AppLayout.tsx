import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Plus, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../types';
import UnitSelector from '../ui/UnitSelector';
import RoleSwitcher from '../ui/RoleSwitcher';
import styles from './Layout.module.css';

const AppLayout: React.FC = () => {
    const location = useLocation();
    const { currentUser, hasPermission } = useAuth();

    // Check if current path is in settings section
    const isSettingsActive = location.pathname.startsWith('/settings');

    // Role-based navigation visibility
    const canAccessSettings = hasPermission('view_settings');

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
                    <button className={styles.notificationBtn}>
                        <Bell size={20} />
                        <span className={styles.notificationDot}></span>
                    </button>

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
