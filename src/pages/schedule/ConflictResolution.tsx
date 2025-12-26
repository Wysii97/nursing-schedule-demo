import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { AlertTriangle, Users, Shuffle, Trophy, CheckCircle, X } from 'lucide-react';
import { leaveApi } from '../../api/client';
import { mockRule } from '../../api/mockData';
import type { LeaveRequest } from '../../api/mockData';
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

    useEffect(() => {
        loadConflicts();
    }, []);

    const loadConflicts = async () => {
        setLoading(true);
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
                    maxAllowed: mockRule.maxLeavePerDay,
                    hasConflict: requests.length > mockRule.maxLeavePerDay
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

        // Simulate resolution
        await new Promise(resolve => setTimeout(resolve, 1500));

        // In real app, this would call API to determine winners
        const winners = [...selectedConflict.requests]
            .sort(() => method === 'random' ? Math.random() - 0.5 : 0)
            .slice(0, selectedConflict.maxAllowed);

        alert(`已核准 ${winners.map(w => w.staffName).join(', ')} 的申請`);

        setSelectedConflict(null);
        setResolving(false);
        await loadConflicts();
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
                        處理同日申請人數超過上限 ({mockRule.maxLeavePerDay} 人) 的日期
                    </p>
                </div>
                <div className={styles.strategyBadge}>
                    預設策略：{mockRule.conflictStrategy === 'Score' ? '積分優先' : '隨機抽籤'}
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
