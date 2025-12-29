import React, { useState, useEffect } from 'react';
import { format, addMonths } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle } from 'lucide-react';
import Calendar from '../../components/calendar/Calendar';
import { leaveApi, staffApi, balanceApi, ruleApi } from '../../api/client';
import type { LeaveRequest, BalanceData } from '../../api/mockData';
import type { Staff, UnitRule } from '../../types';
import styles from './PreLeave.module.css';

const LEAVE_TYPE_MAP: Record<string, string> = {
    preleave: '預假',      // Pre-scheduled day off (排班前申請)
    annual: '特休',        // Annual leave
    sick: '病假',          // Sick leave
    personal: '事假',      // Personal leave
    other: '其他'          // Other reasons
};

const PreLeave: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(addMonths(new Date(), 1));
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [leaveType, setLeaveType] = useState('preleave');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [currentUser, setCurrentUser] = useState<Staff | null>(null);
    const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
    const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
    const [balance, setBalance] = useState<BalanceData | null>(null);
    const [rule, setRule] = useState<UnitRule | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);

        // First load user and rules
        const [userRes, ruleRes] = await Promise.all([
            staffApi.getCurrent(),
            ruleApi.get()
        ]);

        if (userRes.success) {
            setCurrentUser(userRes.data);

            // Load user-specific data
            const [reqRes, balanceRes] = await Promise.all([
                leaveApi.getByStaff(userRes.data.id),
                balanceApi.get(userRes.data.id)
            ]);

            if (reqRes.success) {
                setMyRequests(reqRes.data);
            }
            if (balanceRes.success) {
                setBalance(balanceRes.data);
            }
        }

        if (ruleRes.success) {
            setRule(ruleRes.data);
            // Set calendar to the open month
            if (ruleRes.data.preleaveOpenMonth) {
                const [year, month] = ruleRes.data.preleaveOpenMonth.split('-').map(Number);
                setCurrentMonth(new Date(year, month - 1, 1));

                // Load all requests for the open month for transparency
                const allReqRes = await leaveApi.getByMonth(year, month);
                if (allReqRes.success) {
                    setAllRequests(allReqRes.data);
                }
            }
        }
        setLoading(false);
    };

    // Check if the month is allowed for preleave
    const isMonthAllowed = (month: Date): boolean => {
        if (!rule?.preleaveOpenMonth) return true; // No restriction if not configured
        const monthStr = format(month, 'yyyy-MM');
        return monthStr === rule.preleaveOpenMonth;
    };

    // Check if deadline has passed
    const isDeadlinePassed = (): boolean => {
        if (!rule?.preleaveDeadline) return false;
        return new Date() > new Date(rule.preleaveDeadline);
    };

    const handleMonthChange = (newMonth: Date) => {
        // Only allow changing to the open month
        if (isMonthAllowed(newMonth)) {
            setCurrentMonth(newMonth);
        } else {
            alert(`只能申請 ${rule?.preleaveOpenMonth} 月份的預假`);
        }
    };

    const handleSubmit = async () => {
        if (!selectedDate || !currentUser) {
            alert('請先選擇日期');
            return;
        }

        // Check if deadline has passed
        if (isDeadlinePassed()) {
            alert('預假申請已截止，無法提交申請');
            return;
        }

        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        // Check quota: monthly limit per person
        if (!editingId && rule) {
            const currentMonthStr = format(selectedDate, 'yyyy-MM');
            const monthlyLimit = rule.monthlyPreLeaveLimits?.[currentMonthStr] ?? rule.maxLeavePerMonth;

            // Count existing REQUESTS for this month (excluding rejected)
            const existingCount = myRequests.filter(r =>
                r.date.startsWith(currentMonthStr) &&
                r.status !== 'rejected' &&
                r.id !== editingId
            ).length;

            if (existingCount >= monthlyLimit) {
                alert(`本月預假申請已達上限 (${monthlyLimit} 次)`);
                return;
            }
        }

        setSubmitting(true);

        if (editingId) {
            // Update existing request
            const res = await leaveApi.update(editingId, {
                leaveType: LEAVE_TYPE_MAP[leaveType],
                reason: reason,
                date: dateStr // In case date changed
            });
            if (res.success) {
                alert('申請已更新');
                setEditingId(null);
                setSelectedDate(null);
                setReason('');
                await loadData();
            }
        } else {
            // Create new request
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
        }
        setSubmitting(false);
    };

    const handleEdit = (req: LeaveRequest) => {
        if (isDeadlinePassed()) {
            alert('已過截止日，無法修改');
            return;
        }
        setEditingId(req.id);
        setSelectedDate(new Date(req.date)); // Simplified parsing
        // Reverse lookup leave type key if needed, or simple set
        const typeKey = Object.keys(LEAVE_TYPE_MAP).find(key => LEAVE_TYPE_MAP[key] === req.leaveType) || 'rest';
        setLeaveType(typeKey);
        setReason(req.reason || '');
    };

    const handleCancel = async (id: string) => {
        if (!window.confirm('確定要取消此申請嗎？')) return;

        const res = await leaveApi.cancel(id);
        if (res.success) {
            await loadData();
        }
    };

    // Build calendar day data from ALL requests (group view)
    const dayDataMap = new Map();

    // First, add other people's requests
    allRequests.forEach(req => {
        if (req.staffId === currentUser?.id) return; // Skip my own here, handle separately or merge
        const existing = dayDataMap.get(req.date) || { tags: [], tooltips: [] };
        // Group view: show how many people are off, or list names in tooltip
        existing.tags.push({
            type: 'group-leave',
            label: req.staffName.charAt(0) // Show first char as minimal indicator
        });
        existing.tooltips = existing.tooltips || [];
        existing.tooltips.push(`${req.staffName}: ${req.leaveType}`);
        dayDataMap.set(req.date, existing);
    });

    // Then add my requests
    myRequests.forEach(req => {
        const existing = dayDataMap.get(req.date) || { tags: [], tooltips: [] };
        existing.tags.push({
            type: 'leave',
            label: req.leaveType || '假',
            isMine: true
        });
        dayDataMap.set(req.date, existing);
    });

    if (loading) {
        return <div>載入中...</div>;
    }

    const deadlinePassed = isDeadlinePassed();

    return (
        <div className={styles.pageContainer}>
            {/* Main Content */}
            <div className={styles.mainContent}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>預假申請</h1>
                        <p className={styles.pageDescription}>
                            {rule?.preleaveOpenMonth ? (
                                <>
                                    開放申請月份：<strong>{rule.preleaveOpenMonth}</strong>
                                    {rule.preleaveDeadline && (
                                        <span style={{ marginLeft: '1rem', color: deadlinePassed ? 'var(--error)' : 'inherit' }}>
                                            截止日期：<strong>{rule.preleaveDeadline}</strong>
                                            {deadlinePassed && ' (已截止)'}
                                        </span>
                                    )}
                                </>
                            ) : (
                                '預排下個月休假，請於截止日前完成申請。'
                            )}
                        </p>
                    </div>
                    <div className={styles.quotaBadge}>
                        <CalendarIcon size={16} />
                        本月剩餘預假次數：{balance?.annualLeaveRemaining || 0} 次
                    </div>
                </div>

                <Calendar
                    currentMonth={currentMonth}
                    onMonthChange={handleMonthChange}
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    dayDataMap={dayDataMap}
                />


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
                        {submitting ? '提交中...' : editingId ? '確認修改' : '提交申請'}
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
            {/* Request History */}
            <div className={styles.historySection}>
                <h2 className={styles.historyTitle}>已送出申請 ({myRequests.length} 筆)</h2>
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
                            {myRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                        尚無申請記錄
                                    </td>
                                </tr>
                            ) : myRequests.map(req => (
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
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <span className={styles.editLink} onClick={() => handleEdit(req)} style={{ color: '#3B82F6', cursor: 'pointer' }}>修改</span>
                                                <span className={styles.cancelLink} onClick={() => handleCancel(req.id)}>取消</span>
                                            </div>
                                        )}
                                        {req.status !== 'pending' && '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};

export default PreLeave;
