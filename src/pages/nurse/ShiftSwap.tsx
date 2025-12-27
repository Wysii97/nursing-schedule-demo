import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ArrowRightLeft, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { swapApi } from '../../api/client';
import type { SwapRequest } from '../../api/client';
import styles from './ShiftSwap.module.css';

const STATUS_CONFIG = {
    pending: { label: '待對方同意', color: 'var(--warning)', icon: Clock },
    accepted: { label: '待管理員審核', color: 'var(--primary)', icon: AlertCircle },
    rejected_by_target: { label: '對方已拒絕', color: 'var(--error)', icon: XCircle },
    approved: { label: '已核准', color: 'var(--success)', icon: CheckCircle },
    rejected: { label: '已駁回', color: 'var(--error)', icon: XCircle }
};

const ShiftSwap: React.FC = () => {
    const { currentUser, hasPermission } = useAuth();
    const [requests, setRequests] = useState<SwapRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'my' | 'pending' | 'admin'>('my');

    const isAdmin = hasPermission('view_settings');

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = async () => {
        if (!currentUser) return;
        setLoading(true);

        const res = await swapApi.getByStaff(currentUser.id);
        if (res.success) {
            setRequests(res.data);
        }
        setLoading(false);
    };

    // My requests (I am the requester)
    const myRequests = requests.filter(r => r.requesterId === currentUser?.id);

    // Pending for me (I am the target and status is pending)
    const pendingForMe = requests.filter(
        r => r.targetId === currentUser?.id && r.status === 'pending'
    );

    // For admin: All accepted requests waiting for approval
    const [adminRequests, setAdminRequests] = useState<SwapRequest[]>([]);
    useEffect(() => {
        if (isAdmin) {
            swapApi.getPendingForAdmin().then(res => {
                if (res.success) setAdminRequests(res.data);
            });
        }
    }, [isAdmin]);

    const handleTargetAccept = async (id: string) => {
        console.log('[ShiftSwap] handleTargetAccept called with id:', id);
        try {
            const res = await swapApi.targetAccept(id);
            console.log('[ShiftSwap] targetAccept response:', res);
            if (res.success) {
                alert('已同意換班，等待管理員審核');
                loadData();
            } else {
                alert('操作失敗: ' + res.message);
            }
        } catch (err) {
            console.error('[ShiftSwap] Error:', err);
            alert('發生錯誤，請稍後再試');
        }
    };

    const handleTargetReject = async (id: string) => {
        console.log('[ShiftSwap] handleTargetReject called with id:', id);
        try {
            const res = await swapApi.targetReject(id);
            console.log('[ShiftSwap] targetReject response:', res);
            if (res.success) {
                alert('已拒絕換班');
                loadData();
            } else {
                alert('操作失敗: ' + res.message);
            }
        } catch (err) {
            console.error('[ShiftSwap] Error:', err);
            alert('發生錯誤，請稍後再試');
        }
    };

    const handleAdminApprove = async (id: string) => {
        console.log('[ShiftSwap] handleAdminApprove called with id:', id);
        try {
            const res = await swapApi.adminApprove(id);
            console.log('[ShiftSwap] adminApprove response:', res);
            if (res.success) {
                alert('已核准換班');
                loadData();
                swapApi.getPendingForAdmin().then(r => r.success && setAdminRequests(r.data));
            } else {
                alert('操作失敗: ' + res.message);
            }
        } catch (err) {
            console.error('[ShiftSwap] Error:', err);
            alert('發生錯誤，請稍後再試');
        }
    };

    const handleAdminReject = async (id: string) => {
        console.log('[ShiftSwap] handleAdminReject called with id:', id);
        try {
            const res = await swapApi.adminReject(id);
            console.log('[ShiftSwap] adminReject response:', res);
            if (res.success) {
                alert('已駁回換班');
                loadData();
                swapApi.getPendingForAdmin().then(r => r.success && setAdminRequests(r.data));
            } else {
                alert('操作失敗: ' + res.message);
            }
        } catch (err) {
            console.error('[ShiftSwap] Error:', err);
            alert('發生錯誤，請稍後再試');
        }
    };

    const renderStatus = (status: SwapRequest['status']) => {
        const config = STATUS_CONFIG[status];
        const Icon = config.icon;
        return (
            <span className={styles.status} style={{ color: config.color }}>
                <Icon size={14} />
                {config.label}
            </span>
        );
    };

    const renderRequestRow = (req: SwapRequest, showActions: 'target' | 'admin' | null = null) => (
        <tr key={req.id}>
            <td>{format(new Date(req.swapDate), 'M/d (E)', { locale: zhTW })}</td>
            <td>{req.requesterName}</td>
            <td>{req.requesterShift} ↔ {req.targetShift}</td>
            <td>{req.targetName}</td>
            <td>{renderStatus(req.status)}</td>
            <td>
                {showActions === 'target' && (
                    <div className={styles.actions}>
                        <button className={styles.acceptBtn} onClick={() => handleTargetAccept(req.id)}>同意</button>
                        <button className={styles.rejectBtn} onClick={() => handleTargetReject(req.id)}>拒絕</button>
                    </div>
                )}
                {showActions === 'admin' && (
                    <div className={styles.actions}>
                        <button className={styles.acceptBtn} onClick={() => handleAdminApprove(req.id)}>核准</button>
                        <button className={styles.rejectBtn} onClick={() => handleAdminReject(req.id)}>駁回</button>
                    </div>
                )}
                {!showActions && '-'}
            </td>
        </tr>
    );

    if (loading) return <div className={styles.loading}>載入中...</div>;

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>
                    <ArrowRightLeft size={24} />
                    換班管理
                </h1>
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${tab === 'my' ? styles.active : ''}`}
                    onClick={() => setTab('my')}
                >
                    我的申請 ({myRequests.length})
                </button>
                <button
                    className={`${styles.tab} ${tab === 'pending' ? styles.active : ''}`}
                    onClick={() => setTab('pending')}
                >
                    待我同意 ({pendingForMe.length})
                </button>
                {isAdmin && (
                    <button
                        className={`${styles.tab} ${tab === 'admin' ? styles.active : ''}`}
                        onClick={() => setTab('admin')}
                    >
                        待審核 ({adminRequests.length})
                    </button>
                )}
            </div>

            <div className={styles.content}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>日期</th>
                            <th>申請者</th>
                            <th>班別交換</th>
                            <th>對象</th>
                            <th>狀態</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tab === 'my' && (
                            myRequests.length === 0 ? (
                                <tr><td colSpan={6} className={styles.empty}>尚無申請記錄</td></tr>
                            ) : myRequests.map(r => renderRequestRow(r))
                        )}
                        {tab === 'pending' && (
                            pendingForMe.length === 0 ? (
                                <tr><td colSpan={6} className={styles.empty}>目前沒有待處理的換班請求</td></tr>
                            ) : pendingForMe.map(r => renderRequestRow(r, 'target'))
                        )}
                        {tab === 'admin' && isAdmin && (
                            adminRequests.length === 0 ? (
                                <tr><td colSpan={6} className={styles.empty}>目前沒有待審核的換班</td></tr>
                            ) : adminRequests.map(r => renderRequestRow(r, 'admin'))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ShiftSwap;
