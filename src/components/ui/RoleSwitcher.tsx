import React from 'react';
import { UserCog } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { testUsers } from '../../api/mockData';
import { ROLE_LABELS } from '../../types';
import styles from './RoleSwitcher.module.css';

const RoleSwitcher: React.FC = () => {
    const { currentUser, setCurrentUser } = useAuth();

    return (
        <div className={styles.container}>
            <div className={styles.label}>
                <UserCog size={12} />
                DEV 角色切換
            </div>
            <div className={styles.buttons}>
                {testUsers.map(user => (
                    <button
                        key={user.id}
                        className={`${styles.roleBtn} ${currentUser?.id === user.id ? styles.active : ''}`}
                        onClick={() => setCurrentUser(user)}
                    >
                        {ROLE_LABELS[user.role]}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default RoleSwitcher;
