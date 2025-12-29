import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { CheckCircle, XCircle, Clock, FileText, AlertCircle, Shuffle, Star, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';
import { leaveApi, staffApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useScheduleStore } from '../../store/scheduleStore';
import type { LeaveRequest } from '../../api/mockData';
import type { Staff } from '../../types';
import styles from './LeaveApproval.module.css';

interface DateGroup {
    date: string;
    requests: LeaveRequest[];
    isOverLimit: boolean;
}

const LeaveApproval: React.FC = () => {
    const { currentUnit, hasPermission } = useAuth();
    const { currentPeriod } = useScheduleStore();

    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    // const [rule, setRule] = useState<UnitRule | null>(null); // Unused
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

    const maxLeavePerDay = 3;

    useEffect(() => {
        loadData();
    }, [currentUnit, currentPeriod]);

    const loadData = async () => {
        setLoading(true);

        const staffRes = await staffApi.getAll(currentUnit?.id);

        // if (ruleRes.success) setRule(ruleRes.data); // Unused
        if (staffRes.success) setStaffList(staffRes.data);

        if (currentPeriod) {
            const leaveRes = await leaveApi.getByRange(currentPeriod.startDate, currentPeriod.endDate);
            if (leaveRes.success) setRequests(leaveRes.data);
        } else {
            const leaveRes = await leaveApi.getAll();
            if (leaveRes.success) setRequests(leaveRes.data);
        }

        setLoading(false);
    };

    // Get staff name by ID
    const getStaffName = (staffId: string): string => {
        const staff = staffList.find(s => s.id === staffId);
        return staff?.name || staffId;
    };

    // Calculate priority score
    const getPriorityScore = (staffId: string): { score: number; reasons: string[] } => {
        const staff = staffList.find(s => s.id === staffId);
        let score = 0;
        const reasons: string[] = [];

        if (staff) {
            const idNum = parseInt(staff.id.replace(/\D/g, '')) || 0;
            if (idNum < 1003) { score += 10; reasons.push('資深'); }
            else if (idNum < 1005) { score += 5; reasons.push('中年資'); }
        }

        const approvedCount = requests.filter(r =>
            r.staffId === staffId && r.status === 'approved'
        ).length;
        if (approvedCount === 0) { score += 3; reasons.push('本期未核准'); }

        return { score, reasons };
    };

    // Group requests by date
    const dateGroups = useMemo((): DateGroup[] => {
        const groups = new Map<string, LeaveRequest[]>();

        const filtered = requests.filter(req => {
            if (filter === 'all') return true;
            return req.status === filter;
        });

        filtered.forEach(req => {
            const list = groups.get(req.date) || [];
            list.push(req);
            groups.set(req.date, list);
        });

        return Array.from(groups.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, reqs]) => ({
                date,
                requests: reqs.sort((a, b) => {
                    const aScore = getPriorityScore(a.staffId).score;
                    const bScore = getPriorityScore(b.staffId).score;
                    return bScore - aScore;
                }),
                isOverLimit: reqs.filter(r => r.status === 'pending').length > maxLeavePerDay
            }));
    }, [requests, filter, staffList]);

    const handleApprove = async (id: string) => {
        setProcessing(true);
        await leaveApi.approve(id);
        await loadData();
        setSelectedIds(prev => { prev.delete(id); return new Set(prev); });
        setProcessing(false);
    };

    const handleReject = async (id: string) => {
        setProcessing(true);
        await leaveApi.reject(id);
        await loadData();
        setSelectedIds(prev => { prev.delete(id); return new Set(prev); });
        setProcessing(false);
    };

    const handleBatchApprove = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`確定要批次核准 ${selectedIds.size} 筆申請嗎？`)) return;

        setProcessing(true);
        for (const id of selectedIds) {
            await leaveApi.approve(id);
        }
        setSelectedIds(new Set());
        await loadData();
        setProcessing(false);
    };

    const handleBatchReject = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`確定要批次駁回 ${selectedIds.size} 筆申請嗎？`)) return;

        setProcessing(true);
        for (const id of selectedIds) {
            await leaveApi.reject(id);
        }
        setSelectedIds(new Set());
        await loadData();
        setProcessing(false);
    };

    const handleLottery = (date: string) => {
        const group = dateGroups.find(g => g.date === date);
        if (!group) return;

        const pendingIds = group.requests
            .filter(r => r.status === 'pending')
            .map(r => r.id);

        const shuffled = [...pendingIds].sort(() => Math.random() - 0.5);
        const winners = shuffled.slice(0, maxLeavePerDay);

        setSelectedIds(prev => {
            const next = new Set(prev);
            pendingIds.forEach(id => next.delete(id));
            winners.forEach(id => next.add(id));
            return next;
        });

        alert(`🎲 抽籤完成！已選取 ${winners.length} 人`);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Toggle select all for a specific date
    const toggleDateSelectAll = (date: string) => {
        const group = dateGroups.find(g => g.date === date);
        if (!group) return;

        const pendingIds = group.requests.filter(r => r.status === 'pending').map(r => r.id);
        const allSelected = pendingIds.every(id => selectedIds.has(id));

        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allSelected) {
                pendingIds.forEach(id => next.delete(id));
            } else {
                pendingIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const isDateAllSelected = (date: string): boolean => {
        const group = dateGroups.find(g => g.date === date);
        if (!group) return false;
        const pendingIds = group.requests.filter(r => r.status === 'pending').map(r => r.id);
        return pendingIds.length > 0 && pendingIds.every(id => selectedIds.has(id));
    };

    const toggleDateExpand = (date: string) => {
        setExpandedDates(prev => {
            const next = new Set(prev);
            if (next.has(date)) next.delete(date);
            else next.add(date);
            return next;
        });
    };

    // Stats
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const approvedCount = requests.filter(r => r.status === 'approved').length;
    const rejectedCount = requests.filter(r => r.status === 'rejected').length;

    const canApprove = hasPermission('manage_schedule');

    if (!canApprove) {
        return (
            <div className={styles.container}>
                <div className={styles.accessDenied}>
                    <AlertCircle size={48} />
                    <h2>無權限</h2>
                    <p>您沒有審核預假申請的權限</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className={styles.loading}>載入中...</div>;
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerRow}>
                    <div className={styles.headerContent}>
                        <h1 className={styles.pageTitle}>
                            <FileText size={24} />
                            預假審核
                        </h1>
                        <p className={styles.pageDescription}>
                            {currentPeriod
                                ? `排班期間：${currentPeriod.startDate} ~ ${currentPeriod.endDate}`
                                : '審核護理人員的預假申請'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsRow}>
                <button
                    className={`${styles.statCard} ${filter === 'pending' ? styles.activeCard : ''}`}
                    onClick={() => setFilter('pending')}
                >
                    <div className={styles.statIcon} style={{ background: '#FEF3C7', color: '#B45309' }}>
                        <Clock size={20} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{pendingCount}</span>
                        <span className={styles.statLabel}>待審核</span>
                    </div>
                </button>
                <button
                    className={`${styles.statCard} ${filter === 'approved' ? styles.activeCard : ''}`}
                    onClick={() => setFilter('approved')}
                >
                    <div className={styles.statIcon} style={{ background: '#DCFCE7', color: '#15803D' }}>
                        <CheckCircle size={20} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{approvedCount}</span>
                        <span className={styles.statLabel}>已核准</span>
                    </div>
                </button>
                <button
                    className={`${styles.statCard} ${filter === 'rejected' ? styles.activeCard : ''}`}
                    onClick={() => setFilter('rejected')}
                >
                    <div className={styles.statIcon} style={{ background: '#FEE2E2', color: '#DC2626' }}>
                        <XCircle size={20} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{rejectedCount}</span>
                        <span className={styles.statLabel}>已駁回</span>
                    </div>
                </button>
                <button
                    className={`${styles.statCard} ${filter === 'all' ? styles.activeCard : ''}`}
                    onClick={() => setFilter('all')}
                >
                    <div className={styles.statIcon} style={{ background: '#E0E7FF', color: '#4F46E5' }}>
                        <FileText size={20} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{requests.length}</span>
                        <span className={styles.statLabel}>全部</span>
                    </div>
                </button>
            </div>

            {/* Batch Actions */}
            {filter === 'pending' && selectedIds.size > 0 && (
                <div className={styles.batchBar}>
                    <span className={styles.batchInfo}>已選取 {selectedIds.size} 筆</span>
                    <div className={styles.batchActions}>
                        <button
                            className={styles.batchApproveBtn}
                            onClick={handleBatchApprove}
                            disabled={processing}
                        >
                            <CheckCircle size={16} />
                            批次核准
                        </button>
                        <button
                            className={styles.batchRejectBtn}
                            onClick={handleBatchReject}
                            disabled={processing}
                        >
                            <XCircle size={16} />
                            批次駁回
                        </button>
                    </div>
                </div>
            )}

            {/* Date Groups */}
            <div className={styles.dateGroups}>
                {dateGroups.length === 0 ? (
                    <div className={styles.emptyState}>
                        <CheckCircle size={48} />
                        <p>沒有{filter === 'pending' ? '待審核的' : ''}申請</p>
                    </div>
                ) : (
                    dateGroups.map(group => {
                        const pendingInGroup = group.requests.filter(r => r.status === 'pending');
                        const isExpanded = expandedDates.has(group.date) || group.requests.length <= 5;
                        const allSelected = isDateAllSelected(group.date);

                        return (
                            <div key={group.date} className={`${styles.dateGroup} ${group.isOverLimit ? styles.overLimit : ''}`}>
                                {/* Date Header */}
                                <div className={styles.dateHeader}>
                                    {filter === 'pending' && pendingInGroup.length > 1 && (
                                        <button
                                            className={styles.selectAllBtn}
                                            onClick={() => toggleDateSelectAll(group.date)}
                                            title="全選此日"
                                        >
                                            {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>
                                    )}
                                    <div className={styles.dateInfo} onClick={() => toggleDateExpand(group.date)}>
                                        <span className={styles.dateText}>
                                            {format(new Date(group.date), 'M月d日 (E)', { locale: zhTW })}
                                        </span>
                                        <span className={styles.dateCount}>
                                            {pendingInGroup.length} 人申請
                                        </span>
                                        {group.isOverLimit && (
                                            <span className={styles.overLimitBadge}>⚠️ 超過限額 {maxLeavePerDay} 人</span>
                                        )}
                                    </div>
                                    <div className={styles.dateActions}>
                                        {group.isOverLimit && filter === 'pending' && (
                                            <button
                                                className={styles.lotteryBtn}
                                                onClick={() => handleLottery(group.date)}
                                            >
                                                <Shuffle size={14} />
                                                抽籤
                                            </button>
                                        )}
                                        {group.requests.length > 5 && (
                                            <button className={styles.expandBtn} onClick={() => toggleDateExpand(group.date)}>
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Requests Table */}
                                {isExpanded && (
                                    <table className={styles.table}>
                                        <colgroup>
                                            {filter === 'pending' && <col style={{ width: '50px' }} />}
                                            <col style={{ width: '120px' }} />
                                            <col style={{ width: '80px' }} />
                                            <col style={{ width: '100px' }} />
                                            <col style={{ width: '80px' }} />
                                            <col style={{ width: '80px' }} />
                                            {filter === 'pending' && <col style={{ width: '90px' }} />}
                                        </colgroup>
                                        <tbody>
                                            {group.requests.map(req => {
                                                const priority = getPriorityScore(req.staffId);
                                                const isSelected = selectedIds.has(req.id);
                                                const isPreleave = req.leaveType === '預假' || req.leaveType === '預休';

                                                return (
                                                    <tr key={req.id} className={isSelected ? styles.selectedRow : ''}>
                                                        {filter === 'pending' && (
                                                            <td className={styles.checkboxCol}>
                                                                {req.status === 'pending' && (
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => toggleSelect(req.id)}
                                                                    />
                                                                )}
                                                            </td>
                                                        )}
                                                        <td className={styles.nameCell}>
                                                            <span className={styles.staffName}>{getStaffName(req.staffId)}</span>
                                                            {priority.score > 0 && (
                                                                <span className={styles.priorityBadge} title={priority.reasons.join(', ')}>
                                                                    <Star size={10} /> {priority.reasons[0]}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span className={`${styles.leaveTypeBadge} ${isPreleave ? styles.preleave : styles.otherLeave}`}>
                                                                {isPreleave ? '📅 預假' : `📋 ${req.leaveType}`}
                                                            </span>
                                                        </td>
                                                        <td className={styles.reasonCell}>{req.reason || '-'}</td>
                                                        <td>
                                                            <span className={`${styles.statusBadge} ${styles[req.status]}`}>
                                                                {req.status === 'pending' ? '待審核' : req.status === 'approved' ? '已核准' : '已駁回'}
                                                            </span>
                                                        </td>
                                                        {filter === 'pending' && (
                                                            <td className={styles.actionCell}>
                                                                {req.status === 'pending' && (
                                                                    <>
                                                                        <button
                                                                            className={styles.approveBtn}
                                                                            onClick={() => handleApprove(req.id)}
                                                                            disabled={processing}
                                                                            title="核准"
                                                                        >
                                                                            <CheckCircle size={16} />
                                                                        </button>
                                                                        <button
                                                                            className={styles.rejectBtn}
                                                                            onClick={() => handleReject(req.id)}
                                                                            disabled={processing}
                                                                            title="駁回"
                                                                        >
                                                                            <XCircle size={16} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default LeaveApproval;
