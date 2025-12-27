import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { AlertTriangle, Users, Shuffle, Trophy, CheckCircle, X } from 'lucide-react';
import { leaveApi, ruleApi } from '../../api/client';
import type { LeaveRequest } from '../../api/mockData';
import type { UnitRule } from '../../types';
import styles from './ConflictResolution.module.css';

interface ConflictDay {
    date: string;
    requests: LeaveRequest[];
    maxAllowed: number;
    hasConflict: boolean;
}

const ConflictResolution: React.FC = () => {
    const [conflicts, setConflicts] = useState<ConflictDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedConflict, setSelectedConflict] = useState<ConflictDay | null>(null);
    const [resolving, setResolving] = useState(false);
    const [rule, setRule] = useState<UnitRule>({ maxLeavePerDay: 2, maxLeavePerMonth: 4, conflictStrategy: 'Score' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        // Load rules first
        const ruleRes = await ruleApi.get();
        let currentRule = rule;
        if (ruleRes.success) {
            setRule(ruleRes.data);
            currentRule = ruleRes.data;
        }
        // Then load leave requests
        await loadConflicts(currentRule);
    };

    const loadConflicts = async (currentRule: UnitRule) => {
        const res = await leaveApi.getAll();

        if (res.success) {
            // Group requests by date
            const byDate = new Map<string, LeaveRequest[]>();
            res.data.forEach((req: LeaveRequest) => {
                if (req.status === 'pending') {
                    const existing = byDate.get(req.date) || [];
                    existing.push(req);
                    byDate.set(req.date, existing);
                }
            });

            // Build conflict list
            const conflictList: ConflictDay[] = [];
            byDate.forEach((requests, date) => {
                conflictList.push({
                    date,
                    requests,
                    maxAllowed: currentRule.maxLeavePerDay,
                    hasConflict: requests.length > currentRule.maxLeavePerDay
                });
            });

            // Sort by date
            conflictList.sort((a, b) => a.date.localeCompare(b.date));
            setConflicts(conflictList);
        }
        setLoading(false);
    };

    const handleResolve = async (method: 'score' | 'random') => {
        if (!selectedConflict) return;

        setResolving(true);

        try {
            // Sort requests based on method
            let sorted = [...selectedConflict.requests];

            if (method === 'random') {
                // Random shuffle using Fisher-Yates
                for (let i = sorted.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
                }
            } else {
                // Score method: Earlier request = higher priority (createdAt ascending)
                sorted.sort((a, b) => {
                    const dateA = new Date(a.createdAt || '9999-12-31').getTime();
                    const dateB = new Date(b.createdAt || '9999-12-31').getTime();
                    return dateA - dateB;
                });
            }

            // Split into winners and losers
            const winners = sorted.slice(0, selectedConflict.maxAllowed);
            const losers = sorted.slice(selectedConflict.maxAllowed);

            // Approve winners
            const approvePromises = winners.map(w => leaveApi.approve(w.id));
            // Reject losers
            const rejectPromises = losers.map(l => leaveApi.reject(l.id));

            await Promise.all([...approvePromises, ...rejectPromises]);

            alert(`✅ 已核准：${winners.map(w => w.staffName).join(', ')}\n❌ 已駁回：${losers.map(l => l.staffName).join(', ') || '無'}`);

        } catch (error) {
            console.error('Resolve error:', error);
            alert('處理時發生錯誤，請稍後再試');
        }

        setSelectedConflict(null);
        setResolving(false);
        await loadConflicts(rule);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return format(date, 'M月d日 (E)', { locale: zhTW });
    };

    if (loading) {
        return <div className={styles.loading}>載入中...</div>;
    }

    const conflictDays = conflicts.filter(c => c.hasConflict);
    const pendingDays = conflicts.filter(c => !c.hasConflict);

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>預假衝突處理</h1>
                    <p className={styles.pageSubtitle}>
                        處理同日申請人數超過上限 ({rule.maxLeavePerDay} 人) 的日期
                    </p>
                </div>
                <div className={styles.strategyBadge}>
                    預設策略：{rule.conflictStrategy === 'Score' ? '積分優先' : '隨機抽籤'}
                </div>
            </div>

            <div className={styles.content}>
                {/* Conflict List */}
                <div className={styles.mainPanel}>
                    {/* Conflict Days */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <AlertTriangle size={16} className={styles.danger} />
                            需處理衝突 ({conflictDays.length} 日)
                        </div>

                        {conflictDays.length === 0 ? (
                            <div className={styles.emptyState}>
                                <CheckCircle size={32} />
                                <p>目前無衝突需處理</p>
                            </div>
                        ) : (
                            <div className={styles.conflictList}>
                                {conflictDays.map(conflict => (
                                    <div
                                        key={conflict.date}
                                        className={`${styles.conflictCard} ${selectedConflict?.date === conflict.date ? styles.selected : ''}`}
                                        onClick={() => setSelectedConflict(conflict)}
                                    >
                                        <div className={styles.conflictDate}>
                                            {formatDate(conflict.date)}
                                        </div>
                                        <div className={styles.conflictInfo}>
                                            <span className={styles.requestCount}>
                                                <Users size={14} />
                                                {conflict.requests.length} 人申請
                                            </span>
                                            <span className={styles.overLimit}>
                                                超出 {conflict.requests.length - conflict.maxAllowed} 人
                                            </span>
                                        </div>
                                        <div className={styles.applicants}>
                                            {conflict.requests.map(req => (
                                                <span key={req.id} className={styles.applicantTag}>
                                                    {req.staffName}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pending Days (No Conflict) */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <CheckCircle size={16} className={styles.success} />
                            無衝突申請 ({pendingDays.length} 日)
                        </div>

                        <div className={styles.pendingList}>
                            {pendingDays.map(day => (
                                <div key={day.date} className={styles.pendingCard}>
                                    <span className={styles.pendingDate}>{formatDate(day.date)}</span>
                                    <span className={styles.pendingCount}>{day.requests.length} 人</span>
                                    <div className={styles.pendingApplicants}>
                                        {day.requests.map(req => req.staffName).join(', ')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Resolution Panel */}
                <div className={styles.sidePanel}>
                    {selectedConflict ? (
                        <div className={styles.resolutionCard}>
                            <div className={styles.resolutionHeader}>
                                <h3>{formatDate(selectedConflict.date)}</h3>
                                <button className={styles.closeBtn} onClick={() => setSelectedConflict(null)}>
                                    <X size={16} />
                                </button>
                            </div>

                            <div className={styles.resolutionInfo}>
                                <div className={styles.infoRow}>
                                    <span>申請人數</span>
                                    <span className={styles.danger}>{selectedConflict.requests.length} 人</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span>可核准</span>
                                    <span>{selectedConflict.maxAllowed} 人</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span>需抽籤/排序</span>
                                    <span>{selectedConflict.requests.length - selectedConflict.maxAllowed} 人</span>
                                </div>
                            </div>

                            <div className={styles.applicantList}>
                                <div className={styles.listHeader}>申請人列表</div>
                                {selectedConflict.requests.map((req, idx) => (
                                    <div key={req.id} className={styles.applicantItem}>
                                        <span className={styles.rank}>{idx + 1}</span>
                                        <span className={styles.name}>{req.staffName}</span>
                                        <span className={styles.type}>{req.leaveType}</span>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.resolutionActions}>
                                <button
                                    className={`${styles.actionBtn} ${styles.score}`}
                                    onClick={() => handleResolve('score')}
                                    disabled={resolving}
                                >
                                    <Trophy size={16} />
                                    積分優先
                                </button>
                                <button
                                    className={`${styles.actionBtn} ${styles.random}`}
                                    onClick={() => handleResolve('random')}
                                    disabled={resolving}
                                >
                                    <Shuffle size={16} />
                                    隨機抽籤
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.noSelection}>
                            <AlertTriangle size={32} />
                            <p>選擇左側衝突日期以開始處理</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConflictResolution;
