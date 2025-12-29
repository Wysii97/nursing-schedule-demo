import React, { useState } from 'react';
import { Calendar, FileText } from 'lucide-react';
import PreLeave from './PreLeave';
import LeaveRequest from './LeaveRequest';
import styles from './LeaveAll.module.css';

type TabType = 'preleave' | 'leave';

const LeaveAll: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('preleave');

    return (
        <div className={styles.container}>
            {/* Tab Header */}
            <div className={styles.tabHeader}>
                <button
                    className={`${styles.tab} ${activeTab === 'preleave' ? styles.active : ''}`}
                    onClick={() => setActiveTab('preleave')}
                >
                    <Calendar size={18} />
                    預假申請
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'leave' ? styles.active : ''}`}
                    onClick={() => setActiveTab('leave')}
                >
                    <FileText size={18} />
                    請假申請
                </button>
            </div>

            {/* Tab Content */}
            <div className={styles.tabContent}>
                {activeTab === 'preleave' && <PreLeave />}
                {activeTab === 'leave' && <LeaveRequest />}
            </div>
        </div>
    );
};

export default LeaveAll;
