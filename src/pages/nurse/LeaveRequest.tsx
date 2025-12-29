import React, { useState, useEffect } from 'react';

import { Calendar as CalendarIcon, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { leaveApi, staffApi, balanceApi } from '../../api/client';
import type { LeaveRequest as LeaveRequestType, BalanceData } from '../../api/mockData';
import type { Staff } from '../../types';
import styles from './LeaveRequest.module.css';

const LEAVE_TYPES = [
    { key: 'annual', label: '特休', color: '#3B82F6' },
    { key: 'compensatory', label: '補休', color: '#8B5CF6' },
    { key: 'sick', label: '病假', color: '#EF4444' },
    { key: 'personal', label: '事假', color: '#F59E0B' },
    { key: 'official', label: '公假', color: '#10B981' },
    { key: 'marriage', label: '婚假', color: '#EC4899' },
    { key: 'bereavement', label: '喪假', color: '#6B7280' },
];

const LeaveRequest: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<Staff | null>(null);
    const [myRequests, setMyRequests] = useState<LeaveRequestType[]>([]);
    const [balance, setBalance] = useState<BalanceData | null>(null);
    const [loading, setLoading] = useState(true);

    // Form state
    const [selectedType, setSelectedType] = useState('annual');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [userRes, balanceRes] = await Promise.all([
            staffApi.getCurrent(),
            balanceApi.get('N-1003') // Will update with actual user ID
        ]);

        if (userRes.success) {
            setCurrentUser(userRes.data);
            const reqRes = await leaveApi.getByStaff(userRes.data.id);
            if (reqRes.success) {
                // Filter to only show formal leave requests (not preleave)
                setMyRequests(reqRes.data.filter(r =>
                    r.leaveType !== '預假' && r.leaveType !== '預休'
                ));
            }
        }
        if (balanceRes.success) {
            setBalance(balanceRes.data);
        }
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!currentUser || !startDate) return;

        setSubmitting(true);
        const res = await leaveApi.add({
            staffId: currentUser.id,
            staffName: currentUser.name,
            date: startDate,
            type: 'leave',
            leaveType: LEAVE_TYPES.find(t => t.key === selectedType)?.label || '特休',
            reason: reason,
            status: 'pending'
        });

        if (res.success) {
            alert('請假申請已送出');
            setStartDate('');
            setEndDate('');
            setReason('');
            await loadData();
        }
        setSubmitting(false);
    };

    if (loading) {
        return <div>載入中...</div>;
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.mainContent}>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>請假申請</h1>
                    <p className={styles.pageSubtitle}>申請各類假別，查看額度與審核狀態</p>
                </div>

                {/* Quota Overview */}
                <div className={styles.quotaSection}>
                    <h2 className={styles.sectionTitle}>假別額度</h2>
                    <div className={styles.quotaGrid}>
                        <div className={styles.quotaCard}>
                            <div className={styles.quotaIcon} style={{ background: '#3B82F6' }}>
                                <CalendarIcon size={20} />
                            </div>
                            <div className={styles.quotaInfo}>
                                <span className={styles.quotaLabel}>特休</span>
                                <span className={styles.quotaValue}>
                                    {balance?.annualLeaveRemaining || 0} / {balance?.annualLeaveTotal || 14} 天
                                </span>
                            </div>
                        </div>
                        <div className={styles.quotaCard}>
                            <div className={styles.quotaIcon} style={{ background: '#EF4444' }}>
                                <FileText size={20} />
                            </div>
                            <div className={styles.quotaInfo}>
                                <span className={styles.quotaLabel}>病假</span>
                                <span className={styles.quotaValue}>30 天 / 年</span>
                            </div>
                        </div>
                        <div className={styles.quotaCard}>
                            <div className={styles.quotaIcon} style={{ background: '#F59E0B' }}>
                                <FileText size={20} />
                            </div>
                            <div className={styles.quotaInfo}>
                                <span className={styles.quotaLabel}>事假</span>
                                <span className={styles.quotaValue}>14 天 / 年</span>
                            </div>
                        </div>
                        <div className={styles.quotaCard}>
                            <div className={styles.quotaIcon} style={{ background: '#6B7280' }}>
                                <Clock size={20} />
                            </div>
                            <div className={styles.quotaInfo}>
                                <span className={styles.quotaLabel}>補休</span>
                                <span className={styles.quotaValue}>{balance?.compensatoryHours || 0} 小時</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Request Form */}
                <div className={styles.formSection}>
                    <h2 className={styles.sectionTitle}>新增請假</h2>
                    <div className={styles.formCard}>
                        <div className={styles.formRow}>
                            <label>假別</label>
                            <div className={styles.typeButtons}>
                                {LEAVE_TYPES.map(type => (
                                    <button
                                        key={type.key}
                                        className={`${styles.typeBtn} ${selectedType === type.key ? styles.active : ''}`}
                                        style={{ '--type-color': type.color } as React.CSSProperties}
                                        onClick={() => setSelectedType(type.key)}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className={styles.formRow}>
                            <label>起始日期</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={styles.dateInput}
                            />
                        </div>
                        <div className={styles.formRow}>
                            <label>結束日期</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={styles.dateInput}
                            />
                        </div>
                        <div className={styles.formRow}>
                            <label>請假原因</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="請填寫請假原因..."
                                className={styles.textInput}
                            />
                        </div>
                        <button
                            className={styles.submitBtn}
                            onClick={handleSubmit}
                            disabled={!startDate || submitting}
                        >
                            {submitting ? '送出中...' : '送出申請'}
                        </button>
                    </div>
                </div>

                {/* Request History */}
                <div className={styles.historySection}>
                    <h2 className={styles.sectionTitle}>申請記錄</h2>
                    <div className={styles.historyTable}>
                        <table>
                            <thead>
                                <tr>
                                    <th>日期</th>
                                    <th>假別</th>
                                    <th>原因</th>
                                    <th>狀態</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className={styles.emptyRow}>
                                            尚無請假記錄
                                        </td>
                                    </tr>
                                ) : myRequests.map(req => (
                                    <tr key={req.id}>
                                        <td>{req.date}</td>
                                        <td>
                                            <span className={styles.leaveTag}>
                                                {req.leaveType}
                                            </span>
                                        </td>
                                        <td>{req.reason || '-'}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${styles[req.status]}`}>
                                                {req.status === 'pending' && <Clock size={12} />}
                                                {req.status === 'approved' && <CheckCircle size={12} />}
                                                {req.status === 'rejected' && <XCircle size={12} />}
                                                {req.status === 'pending' ? '待審核' : req.status === 'approved' ? '已核准' : '已駁回'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaveRequest;
