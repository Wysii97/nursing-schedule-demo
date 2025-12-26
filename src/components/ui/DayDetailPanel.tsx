import React from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { X, RefreshCw, Users } from 'lucide-react';
import type { ScheduleEntry } from '../../api/mockData';
import type { Staff, Shift } from '../../types';
import styles from './DayDetailPanel.module.css';

interface DayDetailPanelProps {
    date: Date;
    schedule: ScheduleEntry[];
    staffList: Staff[];
    shifts: Shift[];
    currentUserShift?: ScheduleEntry;
    onClose: () => void;
    onRequestSwap?: (targetStaffId: string) => void;
}

const SHIFT_COLORS: Record<string, string> = {
    D: '#3B82F6',
    E: '#F59E0B',
    N: '#6366F1',
    OFF: '#94A3B8'
};

const DayDetailPanel: React.FC<DayDetailPanelProps> = ({
    date,
    schedule,
    staffList,
    shifts,
    currentUserShift,
    onClose,
    onRequestSwap
}) => {
    // Group schedule by shift code
    const scheduleByShift = schedule.reduce((acc, entry) => {
        const code = entry.shiftCode;
        if (!acc[code]) acc[code] = [];
        acc[code].push(entry);
        return acc;
    }, {} as Record<string, ScheduleEntry[]>);

    const getStaffName = (staffId: string) => {
        return staffList.find(s => s.id === staffId)?.name || staffId;
    };

    const getStaffLevel = (staffId: string) => {
        return staffList.find(s => s.id === staffId)?.level || '';
    };

    const getShiftInfo = (code: string) => {
        return shifts.find(s => s.code === code);
    };

    const shiftCodes = ['D', 'E', 'N', 'OFF'].filter(code => scheduleByShift[code]?.length);

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <div className={styles.dateInfo}>
                    <h3 className={styles.dateTitle}>{format(date, 'M月d日', { locale: zhTW })}</h3>
                    <span className={styles.dateWeekday}>{format(date, 'EEEE', { locale: zhTW })}</span>
                </div>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={18} />
                </button>
            </div>

            {/* My Shift */}
            {currentUserShift && (
                <div className={styles.myShiftSection}>
                    <div className={styles.sectionLabel}>我的班別</div>
                    <div className={styles.myShiftBadge} style={{ background: SHIFT_COLORS[currentUserShift.shiftCode] || '#94A3B8' }}>
                        <span className={styles.shiftCode}>{currentUserShift.shiftCode}</span>
                        <span className={styles.shiftName}>{getShiftInfo(currentUserShift.shiftCode)?.name}</span>
                    </div>
                </div>
            )}

            {/* Staff by Shift */}
            <div className={styles.staffSection}>
                <div className={styles.sectionHeader}>
                    <Users size={14} />
                    當日上班人員
                </div>

                {shiftCodes.map(code => {
                    const entries = scheduleByShift[code] || [];
                    const shiftInfo = getShiftInfo(code);

                    return (
                        <div key={code} className={styles.shiftGroup}>
                            <div className={styles.shiftGroupHeader}>
                                <span
                                    className={styles.shiftIndicator}
                                    style={{ background: SHIFT_COLORS[code] || '#94A3B8' }}
                                />
                                <span className={styles.shiftGroupName}>
                                    {shiftInfo?.name || code}
                                </span>
                                <span className={styles.shiftTime}>
                                    {shiftInfo?.startTime} - {shiftInfo?.endTime}
                                </span>
                                <span className={styles.staffCount}>{entries.length} 人</span>
                            </div>
                            <div className={styles.staffList}>
                                {entries.map(entry => (
                                    <div key={entry.staffId} className={styles.staffItem}>
                                        <div className={styles.staffInfo}>
                                            <span className={styles.staffName}>{getStaffName(entry.staffId)}</span>
                                            <span className={styles.staffLevel}>{getStaffLevel(entry.staffId)}</span>
                                        </div>
                                        {onRequestSwap && entry.staffId !== currentUserShift?.staffId && code !== 'OFF' && (
                                            <button
                                                className={styles.swapBtn}
                                                onClick={() => onRequestSwap(entry.staffId)}
                                            >
                                                <RefreshCw size={12} />
                                                換班
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DayDetailPanel;
