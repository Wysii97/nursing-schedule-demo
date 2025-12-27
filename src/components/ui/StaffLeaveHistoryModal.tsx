import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { leaveApi, balanceApi } from '../../api/client';
import type { Staff } from '../../types';
import type { BalanceData, LeaveRequest } from '../../api/mockData';
import styles from './StaffLeaveHistoryModal.module.css';

interface StaffLeaveHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    staff: Staff;
    year: number;
    month: number;
}

const StaffLeaveHistoryModal: React.FC<StaffLeaveHistoryModalProps> = ({
    isOpen,
    onClose,
    staff,
    year,
    month
}) => {
    const [balance, setBalance] = useState<BalanceData | null>(null);
    const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && staff) {
            loadData();
        }
    }, [isOpen, staff, year, month]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [balanceRes, leaveRes] = await Promise.all([
                balanceApi.get(staff.id),
                leaveApi.getByStaff(staff.id)
            ]);

            if (balanceRes.success) setBalance(balanceRes.data);

            if (leaveRes.success) {
                // Filter for current month
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0);

                const filtered = leaveRes.data.filter(l => {
                    const d = new Date(l.date);
                    return d >= startDate && d <= endDate;
                });
                setLeaveHistory(filtered);
            }
        } catch (error) {
            console.error('Error loading staff details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.staffInfo}>
                        <div className={styles.avatar}>{staff.name.charAt(0)}</div>
                        <div>
                            <h2 className={styles.title}>{staff.name}</h2>
                            <span className={styles.subtitle}>{staff.id} · {staff.level}</span>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    {loading ? (
                        <div className={styles.loading}>載入中...</div>
                    ) : (
                        <>
                            {/* Balance Cards */}
                            <div className={styles.balanceGrid}>
                                <div className={styles.balanceCard}>
                                    <div className={styles.balanceLabel}>特休剩餘</div>
                                    <div className={`${styles.balanceValue} ${styles.primary}`}>
                                        {balance?.annualLeaveRemaining || 0} <span className={styles.unit}>天</span>
                                    </div>
                                    <div className={styles.balanceSub}>總計 {balance?.annualLeaveTotal || 0} 天</div>
                                </div>
                                <div className={styles.balanceCard}>
                                    <div className={styles.balanceLabel}>積借休</div>
                                    <div className={`${styles.balanceValue} ${styles.info}`}>
                                        {balance?.compensatoryHours || 0} <span className={styles.unit}>小時</span>
                                    </div>
                                    <div className={styles.balanceSub}>目前可用</div>
                                </div>
                                <div className={styles.balanceCard}>
                                    <div className={styles.balanceLabel}>負債時數</div>
                                    <div className={`${styles.balanceValue} ${styles.danger}`}>
                                        {balance?.debtHours || 0} <span className={styles.unit}>小時</span>
                                    </div>
                                    <div className={styles.balanceSub}>需償還</div>
                                </div>
                            </div>

                            {/* Monthly History */}
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>
                                    <Calendar size={16} />
                                    {year}年{month}月 假勤紀錄
                                </h3>
                                <div className={styles.historyList}>
                                    {leaveHistory.length === 0 ? (
                                        <div className={styles.noData}>本月尚無假勤紀錄</div>
                                    ) : (
                                        leaveHistory.map(record => (
                                            <div key={record.id} className={styles.historyItem}>
                                                <div className={styles.historyDate}>
                                                    {format(new Date(record.date), 'MM/dd')}
                                                    <span className={styles.weekDay}>
                                                        ({format(new Date(record.date), 'EE', { locale: zhTW })})
                                                    </span>
                                                </div>
                                                <div className={styles.historyDetail}>
                                                    <span className={styles.historyType}>{record.leaveType}</span>
                                                    <span className={styles.historyStatus} data-status={record.status}>
                                                        {record.status === 'approved' ? '已核准' :
                                                            record.status === 'pending' ? '待審核' :
                                                                record.status === 'rejected' ? '已駁回' : record.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StaffLeaveHistoryModal;
