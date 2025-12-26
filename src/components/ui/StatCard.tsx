import React from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './StatCard.module.css';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: LucideIcon;
    color?: 'blue' | 'yellow' | 'red';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color = 'blue' }) => {
    return (
        <div className={styles.statCard}>
            <div className={styles.statContent}>
                <h3>{title}</h3>
                <div className={styles.statValue}>{value}</div>
            </div>
            <div className={`${styles.statIcon} ${styles[color]}`}>
                <Icon size={20} />
            </div>
        </div>
    );
};

export default StatCard;
