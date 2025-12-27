import React, { useState, useEffect } from 'react';
import { UserCog } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { staffApi } from '../../api/client';
import { ROLE_LABELS } from '../../types';
import type { Staff } from '../../types';
import styles from './RoleSwitcher.module.css';

const RoleSwitcher: React.FC = () => {
    const { currentUser, setCurrentUser } = useAuth();
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

    // Group staff by role and show one of each role
    const roleRepresentatives = staffList.reduce((acc, staff) => {
        if (!acc.find(s => s.role === staff.role)) {
            acc.push(staff);
        }
        return acc;
    }, [] as Staff[]);

    return (
        <div className={styles.container}>
            <div className={styles.label}>
                <UserCog size={12} />
                DEV 角色切換
            </div>
            <div className={styles.buttons}>
                {roleRepresentatives.map(user => (
                    <button
                        key={user.id}
                        className={`${styles.roleBtn} ${currentUser?.id === user.id ? styles.active : ''}`}
                        onClick={() => setCurrentUser(user)}
                        title={`${user.name} (${user.id})`}
                    >
                        {ROLE_LABELS[user.role]}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default RoleSwitcher;
