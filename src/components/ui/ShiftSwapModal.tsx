import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { X, ArrowRightLeft } from 'lucide-react';
import { swapApi } from '../../api/client';
import type { Staff, Shift } from '../../types';
import type { ScheduleEntry } from '../../api/mockData';
import styles from './ShiftSwapModal.module.css';

interface ShiftSwapModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date;
    currentUser: Staff;
    myShift: ScheduleEntry | undefined;
    allSchedule: ScheduleEntry[];
    allStaff: Staff[];
    shifts: Shift[];
    onSuccess: () => void;
    preselectedTargetId?: string; // NEW: Pre-select target from DayDetailPanel
}

const ShiftSwapModal: React.FC<ShiftSwapModalProps> = ({
    isOpen,
    onClose,
    selectedDate,
    currentUser,
    myShift,
    allSchedule,
    allStaff,
    shifts,
    onSuccess,
    preselectedTargetId
}) => {
    const [selectedTargetId, setSelectedTargetId] = useState<string>('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Auto-select target when modal opens with preselected ID
    useEffect(() => {
        if (isOpen && preselectedTargetId) {
            setSelectedTargetId(preselectedTargetId);
        }
    }, [isOpen, preselectedTargetId]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedTargetId('');
            setReason('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // Get other staff schedules on this date
    const otherStaffSchedules = allSchedule.filter(
        s => s.date === dateStr && s.staffId !== currentUser.id
    );

    const getShiftName = (code: string) => {
        const shift = shifts.find(s => s.code === code);
        return shift?.name || code;
    };

    const handleSubmit = async () => {
        console.log('handleSubmit called');
        console.log('selectedTargetId:', selectedTargetId);
        console.log('otherStaffSchedules:', otherStaffSchedules);

        if (!selectedTargetId) {
            alert('請選擇換班對象');
            return;
        }

        const targetSchedule = otherStaffSchedules.find(s => s.staffId === selectedTargetId);
        console.log('targetSchedule:', targetSchedule);

        if (!targetSchedule) {
            alert('找不到對象的排班資料');
            return;
        }

        setSubmitting(true);

        console.log('Sending swap request:', {
            requesterId: currentUser.id,
            targetId: selectedTargetId,
            swapDate: dateStr,
            requesterShift: myShift?.shiftCode || 'OFF',
            targetShift: targetSchedule.shiftCode || 'OFF',
            reason: reason
        });

        const res = await swapApi.create({
            requesterId: currentUser.id,
            targetId: selectedTargetId,
            swapDate: dateStr,
            requesterShift: myShift?.shiftCode || 'OFF',
            targetShift: targetSchedule.shiftCode || 'OFF',
            reason: reason
        });

        console.log('Swap API response:', res);

        if (res.success) {
            alert('換班申請已送出，等待對方同意');
            onSuccess();
            onClose();
        } else {
            alert('申請失敗：' + res.message);
        }
        setSubmitting(false);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        <ArrowRightLeft size={20} />
                        申請換班
                    </h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.dateInfo}>
                        <strong>{format(selectedDate, 'M月d日 (EEEE)', { locale: zhTW })}</strong>
                        <span className={styles.myShift}>
                            我的班別：{myShift ? getShiftName(myShift.shiftCode) : '休假'}
                        </span>
                    </div>

                    {/* Show confirmation view when target is pre-selected, otherwise show selection list */}
                    {preselectedTargetId ? (
                        // Simplified confirmation view for pre-selected target
                        (() => {
                            const targetSched = otherStaffSchedules.find(s => s.staffId === preselectedTargetId);
                            const targetStaff = allStaff.find(s => s.id === preselectedTargetId);
                            if (!targetSched || !targetStaff) return <div className={styles.noData}>找不到對象資料</div>;

                            return (
                                <div className={styles.swapConfirmation}>
                                    <div className={styles.swapParty}>
                                        <div className={styles.partyLabel}>我的班別</div>
                                        <div className={styles.partyInfo}>
                                            <span className={styles.partyName}>{currentUser.name}</span>
                                            <span className={styles.partyShift} style={{ background: 'var(--primary)' }}>
                                                {myShift ? getShiftName(myShift.shiftCode) : '休假'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.swapArrow}>↔</div>
                                    <div className={styles.swapParty}>
                                        <div className={styles.partyLabel}>換班對象</div>
                                        <div className={styles.partyInfo}>
                                            <span className={styles.partyName}>{targetStaff.name}</span>
                                            <span className={styles.partyShift} style={{ background: 'var(--warning)' }}>
                                                {getShiftName(targetSched.shiftCode)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()
                    ) : (
                        // Full selection list when no target is pre-selected
                        <div className={styles.formGroup}>
                            <label>選擇換班對象</label>
                            <div className={styles.staffList}>
                                {otherStaffSchedules.length === 0 ? (
                                    <div className={styles.noData}>當日無其他人員排班</div>
                                ) : (
                                    otherStaffSchedules.map(sched => {
                                        const staff = allStaff.find(s => s.id === sched.staffId);
                                        return (
                                            <label key={sched.staffId} className={styles.staffItem}>
                                                <input
                                                    type="radio"
                                                    name="targetStaff"
                                                    value={sched.staffId}
                                                    checked={selectedTargetId === sched.staffId}
                                                    onChange={() => setSelectedTargetId(sched.staffId)}
                                                />
                                                <span className={styles.staffName}>{staff?.name || sched.staffId}</span>
                                                <span className={styles.staffShift}>{getShiftName(sched.shiftCode)}</span>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label>換班原因（選填）</label>
                        <textarea
                            className={styles.textarea}
                            placeholder="請說明換班原因..."
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose}>取消</button>
                    <button
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={submitting || !selectedTargetId}
                    >
                        {submitting ? '送出中...' : '送出申請'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShiftSwapModal;
