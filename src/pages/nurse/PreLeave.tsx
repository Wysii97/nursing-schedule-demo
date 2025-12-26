import React, { useState, useEffect } from 'react';
import { format, addMonths } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle } from 'lucide-react';
import Calendar from '../../components/calendar/Calendar';
import { leaveApi, staffApi, balanceApi } from '../../api/client';
import type { LeaveRequest, BalanceData } from '../../api/mockData';
import type { Staff } from '../../types';
import styles from './PreLeave.module.css';

const LEAVE_TYPE_MAP: Record<string, string> = {
    rest: '預休',     // Pre-scheduled day off
    swap: '換班',     // Shift swap request
    other: '其他'     // Other reasons
};

const PreLeave: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(addMonths(new Date(), 1));
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [leaveType, setLeaveType] = useState('rest');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [currentUser, setCurrentUser] = useState<Staff | null>(null);
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [balance, setBalance] = useState<BalanceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [userRes, balanceRes] = await Promise.all([
            staffApi.getCurrent(),
            balanceApi.get()
        ]);

        if (userRes.success) {
            setCurrentUser(userRes.data);
            const reqRes = await leaveApi.getByStaff(userRes.data.id);
            if (reqRes.success) {
                setRequests(reqRes.data);
            }
        }

        if (balanceRes.success) {
            setBalance(balanceRes.data);
        }
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!selectedDate || !currentUser) {
            alert('請先選擇日期');
            return;
        }

        setSubmitting(true);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        const res = await leaveApi.add({
            staffId: currentUser.id,
            staffName: currentUser.name,
            date: dateStr,
            type: 'leave',
            leaveType: LEAVE_TYPE_MAP[leaveType],
            reason: reason,
            status: 'pending'
        });

        if (res.success) {
            alert('申請已送出');
            setSelectedDate(null);
            setReason('');
            await loadData();
        }
        setSubmitting(false);
    };

    const handleCancel = async (id: string) => {
        if (!window.confirm('確定要取消此申請嗎？')) return;

        const res = await leaveApi.cancel(id);
        if (res.success) {
            await loadData();
        }
    };

    // Build calendar day data from requests
    const dayDataMap = new Map();
    requests.forEach(req => {
        const existing = dayDataMap.get(req.date) || { tags: [] };
        existing.tags.push({
            type: 'leave',
            label: req.leaveType || ''
        });
        dayDataMap.set(req.date, existing);
    });

    if (loading) {
        return <div>載入中...</div>;
    }

    return (
        <div className={styles.pageContainer}>
            {/* Main Content */}
            <div className={styles.mainContent}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>預假申請</h1>
                        <p className={styles.pageDescription}>預排下個月休假，請於截止日前完成申請。</p>
                    </div>
                    <div className={styles.quotaBadge}>
                        <CalendarIcon size={16} />
                        本月剩餘預假次數：{balance?.annualLeaveRemaining || 0} 次
                    </div>
                </div>

                <Calendar
                    currentMonth={currentMonth}
                    onMonthChange={setCurrentMonth}
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    dayDataMap={dayDataMap}
                />

                {/* Request History */}
                <div className={styles.historySection}>
                    <h2 className={styles.historyTitle}>已送出申請 ({requests.length} 筆)</h2>
                    <div className={styles.historyTable}>
                        <table>
                            <thead>
                                <tr>
                                    <th>日期</th>
                                    <th>假別</th>
                                    <th>備註</th>
                                    <th>狀態</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                            尚無申請記錄
                                        </td>
                                    </tr>
                                ) : requests.map(req => (
                                    <tr key={req.id}>
                                        <td>{req.date}</td>
                                        <td>
                                            <span
                                                className={styles.shiftTag}
                                                style={{
                                                    background: 'rgba(168, 85, 247, 0.2)',
                                                    color: '#7c3aed'
                                                }}
                                            >
                                                {req.leaveType}
                                            </span>
                                        </td>
                                        <td>{req.reason}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${styles[req.status]}`}>
                                                {req.status === 'pending' && <Clock size={12} />}
                                                {req.status === 'approved' && <CheckCircle size={12} />}
                                                {req.status === 'rejected' && <XCircle size={12} />}
                                                {req.status === 'pending' ? '待審核' : req.status === 'approved' ? '已核准' : '已駁回'}
                                            </span>
                                        </td>
                                        <td>
                                            {req.status === 'pending' && (
                                                <span className={styles.cancelLink} onClick={() => handleCancel(req.id)}>取消</span>
                                            )}
                                            {req.status !== 'pending' && '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Sidebar */}
            <div className={styles.sidebar}>
                {/* Request Form */}
                <div className={styles.sidebarCard}>
                    <div className={styles.dateHeader}>
                        <span className={styles.selectedDate}>
                            {selectedDate ? format(selectedDate, 'M月d日 (E)', { locale: zhTW }) : '請選擇日期'}
                        </span>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>假別</label>
                        <select
                            className={styles.selectInput}
                            value={leaveType}
                            onChange={(e) => setLeaveType(e.target.value)}
                        >
                            <option value="rest">預休</option>
                            <option value="swap">換班</option>
                            <option value="other">其他</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>備註原因</label>
                        <textarea
                            className={styles.textareaInput}
                            placeholder="請填寫原因..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <button
                        className={styles.submitButton}
                        onClick={handleSubmit}
                        disabled={!selectedDate || submitting}
                    >
                        {submitting ? '提交中...' : '提交申請'}
                    </button>
                </div>

                {/* Quota Summary */}
                <div className={styles.quotaCard}>
                    <div className={styles.quotaHeader}>
                        <CalendarIcon size={16} />
                        額度概覽
                    </div>

                    <div className={styles.quotaItem}>
                        <div className={styles.quotaLabel}>
                            <span>特休剩餘</span>
                            <span className={styles.quotaValue}>{balance?.annualLeaveRemaining || 0} 天</span>
                        </div>
                        <div className={styles.quotaBar}>
                            <div
                                className={styles.quotaProgress}
                                style={{
                                    width: `${((balance?.annualLeaveRemaining || 0) / (balance?.annualLeaveTotal || 14)) * 100}%`,
                                    background: 'var(--primary)'
                                }}
                            />
                        </div>
                    </div>

                    <div className={styles.quotaItem}>
                        <div className={styles.quotaLabel}>
                            <span>補休時數</span>
                            <span className={styles.quotaValue}>{balance?.compensatoryHours || 0} 小時</span>
                        </div>
                        <div className={styles.quotaBar}>
                            <div
                                className={styles.quotaProgress}
                                style={{
                                    width: '60%',
                                    background: 'var(--text-secondary)'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreLeave;
