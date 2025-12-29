import React, { useState, useEffect } from 'react';
import { User, Bell, Lock, Save, UserCog } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { staffApi } from '../../api/client';
import { ROLE_LABELS } from '../../types';
import type { Staff } from '../../types';
import styles from './Profile.module.css';

const Profile: React.FC = () => {
    const { currentUser, setCurrentUser } = useAuth();
    const [notifySchedule, setNotifySchedule] = useState(true);
    const [notifyLeave, setNotifyLeave] = useState(true);
    const [notifySwap, setNotifySwap] = useState(true);
    const [saving, setSaving] = useState(false);
    const [staffList, setStaffList] = useState<Staff[]>([]);

    useEffect(() => {
        const loadStaff = async () => {
            const res = await staffApi.getAll();
            if (res.success) {
                setStaffList(res.data);
            }
        };
        loadStaff();
    }, []);

    // Group staff by role
    const roleRepresentatives = staffList.reduce((acc, staff) => {
        if (!acc.find(s => s.role === staff.role)) {
            acc.push(staff);
        }
        return acc;
    }, [] as Staff[]);

    const handleSave = () => {
        setSaving(true);
        setTimeout(() => {
            setSaving(false);
            alert('設定已儲存');
        }, 500);
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.mainContent}>
                <div className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>個人設定</h1>
                    <p className={styles.pageSubtitle}>查看個人資料與偏好設定</p>
                </div>

                {/* Profile Info */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <User size={20} />
                        <h2>個人資料</h2>
                    </div>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>姓名</span>
                            <span className={styles.infoValue}>{currentUser?.name || '-'}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>員工編號</span>
                            <span className={styles.infoValue}>{currentUser?.id || '-'}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>職級</span>
                            <span className={styles.infoValue}>{currentUser?.level || '-'}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>角色</span>
                            <span className={styles.infoValue}>
                                {ROLE_LABELS[currentUser?.role || 'nurse']}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Notification Preferences */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <Bell size={20} />
                        <h2>通知設定</h2>
                    </div>
                    <div className={styles.toggleList}>
                        <div className={styles.toggleItem}>
                            <div className={styles.toggleInfo}>
                                <span className={styles.toggleLabel}>班表通知</span>
                                <span className={styles.toggleDesc}>班表發佈、修改時通知</span>
                            </div>
                            <label className={styles.toggle}>
                                <input
                                    type="checkbox"
                                    checked={notifySchedule}
                                    onChange={(e) => setNotifySchedule(e.target.checked)}
                                />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
                        <div className={styles.toggleItem}>
                            <div className={styles.toggleInfo}>
                                <span className={styles.toggleLabel}>請假通知</span>
                                <span className={styles.toggleDesc}>請假審核結果通知</span>
                            </div>
                            <label className={styles.toggle}>
                                <input
                                    type="checkbox"
                                    checked={notifyLeave}
                                    onChange={(e) => setNotifyLeave(e.target.checked)}
                                />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
                        <div className={styles.toggleItem}>
                            <div className={styles.toggleInfo}>
                                <span className={styles.toggleLabel}>換班通知</span>
                                <span className={styles.toggleDesc}>換班申請與回覆通知</span>
                            </div>
                            <label className={styles.toggle}>
                                <input
                                    type="checkbox"
                                    checked={notifySwap}
                                    onChange={(e) => setNotifySwap(e.target.checked)}
                                />
                                <span className={styles.slider}></span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <Lock size={20} />
                        <h2>安全性</h2>
                    </div>
                    <button className={styles.secondaryBtn}>
                        修改密碼
                    </button>
                </div>

                {/* DEV Role Switcher */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <UserCog size={20} />
                        <h2>DEV 角色切換</h2>
                    </div>
                    <p className={styles.devNote}>開發測試用 - 模擬切換不同角色</p>
                    <div className={styles.roleButtons}>
                        {roleRepresentatives.map(user => (
                            <button
                                key={user.id}
                                className={`${styles.roleBtn} ${currentUser?.id === user.id ? styles.activeRole : ''}`}
                                onClick={() => setCurrentUser(user)}
                            >
                                {ROLE_LABELS[user.role]} ({user.name})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Save Button */}
                <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={saving}
                >
                    <Save size={16} />
                    {saving ? '儲存中...' : '儲存設定'}
                </button>
            </div>
        </div>
    );
};

export default Profile;

