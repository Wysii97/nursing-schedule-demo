import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Save, RotateCcw, AlertCircle, CheckCircle2, GripVertical, Send, FileCheck, UserPlus, X } from 'lucide-react';
import { useScheduleStore } from '../../store/scheduleStore';
import { shiftApi, staffApi, scheduleApi } from '../../api/client';
import type { Staff, Shift } from '../../types';
import type { ScheduleEntry } from '../../api/mockData';
import styles from './Workbench.module.css';
import { checkScheduleCompliance, type Violation } from '../../utils/scheduleValidation';
import { generateAutoSchedule } from '../../utils/autoSchedule';
import { Sparkles } from 'lucide-react';
import StaffLeaveHistoryModal from '../../components/ui/StaffLeaveHistoryModal';
import CellContextMenu from '../../components/ui/CellContextMenu';
import { balanceApiExtended, notificationApi, leaveApi } from '../../api/client';
import type { LeaveRequest } from '../../api/mockData';

const Workbench: React.FC = () => {
    const { scheduleStatus, publishDraft, publishOfficial } = useScheduleStore();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [staff, setStaff] = useState<Staff[]>([]);
    const [externalStaff, setExternalStaff] = useState<Staff[]>([]);
    const [availableSupport, setAvailableSupport] = useState<Staff[]>([]);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [schedule, setSchedule] = useState<Map<string, string>>(new Map());
    const [originalSchedule, setOriginalSchedule] = useState<Map<string, string>>(new Map());
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [autoScheduling, setAutoScheduling] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [draggedShift, setDraggedShift] = useState<string | null>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, staffId: string, date: Date } | null>(null);

    // Staff History Modal State
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Initial load
    useEffect(() => {
        loadData(true);
    }, []);

    // Month change - only refetch schedule
    useEffect(() => {
        if (!loading) loadData(false);
    }, [currentMonth]);

    const loadData = async (isInitial = false) => {
        if (isInitial) setLoading(true);


        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;

        const [staffRes, shiftRes, externalRes, scheduleRes, leaveRes] = await Promise.all([
            staffApi.getAll(),
            shiftApi.getAll(),
            staffApi.getExternal(),
            scheduleApi.getByMonth(year, month),
            leaveApi.getByMonth(year, month)
        ]);

        if (staffRes.success) setStaff(staffRes.data);
        if (shiftRes.success) setShifts(shiftRes.data);
        if (externalRes.success) setAvailableSupport(externalRes.data || []);
        if (leaveRes.success) setLeaveRequests(leaveRes.data);

        const scheduleMap = new Map<string, string>();
        const currentExternal: Staff[] = [];

        if (scheduleRes.success) {
            scheduleRes.data.forEach((s: ScheduleEntry) => {
                scheduleMap.set(`${s.staffId}-${s.date}`, s.shiftCode);

                const ext = (externalRes.data || []).find(e => e.id === s.staffId);
                if (ext && !currentExternal.find(e => e.id === s.staffId)) {
                    currentExternal.push(ext);
                }
            });
        }

        setExternalStaff(currentExternal);
        setSchedule(new Map(scheduleMap));
        setOriginalSchedule(new Map(scheduleMap));
        setHasChanges(false);
        setLoading(false);

    };

    const handleAddSupport = (supporter: Staff) => {
        if (!externalStaff.find(s => s.id === supporter.id)) {
            setExternalStaff(prev => [...prev, supporter]);
        }
        setShowSupportModal(false);
    };

    const handleRemoveSupport = (staffId: string) => {
        setExternalStaff(prev => prev.filter(s => s.id !== staffId));
    };

    // Calculate violations map combining internal and external staff
    const allStaff = [...staff, ...externalStaff];
    const violationsMap = React.useMemo(() => {
        const map = new Map<string, Violation[]>();
        allStaff.forEach(s => {
            const v = checkScheduleCompliance(s.id, schedule, days);
            v.forEach((violations, dateKey) => {
                const key = `${s.id}-${dateKey}`;
                map.set(key, violations);
            });
        });
        return map;
    }, [schedule, allStaff, days]);

    const getScheduleKey = (staffId: string, date: Date) => {
        return `${staffId}-${format(date, 'yyyy-MM-dd')}`;
    };

    const handleDragStart = useCallback((shiftCode: string) => {
        setDraggedShift(shiftCode);
    }, []);

    const handleDragEnd = useCallback(() => {
        setDraggedShift(null);
    }, []);

    const handleDrop = useCallback((staffId: string, date: Date) => {
        if (draggedShift) {
            const key = getScheduleKey(staffId, date);
            const newSchedule = new Map(schedule);
            newSchedule.set(key, draggedShift);
            setSchedule(newSchedule);
            setHasChanges(true);
        }
    }, [draggedShift, schedule]);

    const handleCellClick = (staffId: string, date: Date) => {
        // Left click cycles through standard shifts
        const key = getScheduleKey(staffId, date);
        const currentShift = schedule.get(key) || 'OFF';

        // Dynamic shift order based on API data
        // Filter out 'Special' or 'Off' types if needed, or just cycle all
        const shiftCodes = shifts.map(s => s.code);
        if (!shiftCodes.includes('OFF')) shiftCodes.push('OFF'); // Ensure OFF is available

        const currentIdx = shiftCodes.indexOf(currentShift);
        const nextShift = shiftCodes[(currentIdx + 1) % shiftCodes.length];

        const newSchedule = new Map(schedule);
        newSchedule.set(key, nextShift);
        setSchedule(newSchedule);
        setHasChanges(true);
    };

    const handleCellContextMenu = (e: React.MouseEvent, staffId: string, date: Date) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            staffId,
            date
        });
    };

    const handleMenuSetShift = (code: string) => {
        if (!contextMenu) return;
        const { staffId, date } = contextMenu;
        const key = getScheduleKey(staffId, date);
        const newSchedule = new Map(schedule);
        newSchedule.set(key, code);
        setSchedule(newSchedule);
        setHasChanges(true);
        // If switching back to normal shift, we might want to cancel any leave? 
        // For simplicity, we just update the schedule cell visual for now.
    };

    const handleMenuSetLeave = async (leaveType: string, borrowHours?: number) => {
        if (!contextMenu) return;
        const { staffId, date } = contextMenu;

        // 1. Update Schedule Visual to OFF (or special code if we had one)
        // Usually leave is treated as OFF or specific code on the grid. 
        // Let's us 'OFF' for schedule code, but maybe we can use specific codes later.
        const key = getScheduleKey(staffId, date);
        const newSchedule = new Map(schedule);
        newSchedule.set(key, 'OFF'); // Or maybe 'L' if we supported it
        setSchedule(newSchedule);
        setHasChanges(true);

        // 2. Create Leave Request (Auto Approved)
        const dateStr = format(date, 'yyyy-MM-dd');

        // Find staff name
        const staffMember = staff.find(s => s.id === staffId) || externalStaff.find(s => s.id === staffId);
        const staffName = staffMember?.name || '';

        try {
            await leaveApi.add({
                staffId,
                staffName,
                date: dateStr,
                type: 'leave',
                leaveType: leaveType,
                shiftCode: 'OFF', // The shift they are taking off from? or resulting shift?
                reason: borrowHours ? `管理員設定借休 ${borrowHours} 小時` : '管理員設定請假',
                status: 'approved'
            });

            // 3. Update Balance
            // If Borrow Leave (借休), deduct compensatory hours
            if (leaveType === '借休' && borrowHours) {
                // Fetch current first to calculate
                const balanceRes = await balanceApiExtended.get(staffId);
                if (balanceRes.success) {
                    const currentComp = balanceRes.data.compensatoryHours;
                    const newComp = Math.max(0, currentComp - borrowHours);
                    await balanceApiExtended.update(staffId, {
                        compensatoryHours: newComp
                    });
                }
            }
            // If Annual Leave (特休), deduct annual leave (assuming 8 hours = 1 day logic or simplified)
            else if (leaveType === '特休') {
                const balanceRes = await balanceApiExtended.get(staffId);
                if (balanceRes.success) {
                    const currentAnnual = balanceRes.data.annualLeaveRemaining;
                    const newAnnual = Math.max(0, currentAnnual - 1); // Deduct 1 day
                    await balanceApiExtended.update(staffId, {
                        annualLeaveRemaining: newAnnual
                    });
                }
            }

            // 4. Send Notification
            let message = `管理者已為您設定 ${dateStr} 為 ${leaveType}`;
            if (borrowHours) message += ` (${borrowHours}小時)`;

            await notificationApi.send({
                userId: staffId,
                type: 'leave_assigned',
                title: '班表異動通知',
                message: message
            });

            alert(`已設定 ${leaveType} 並同步資料`);
        } catch (error) {
            console.error('Error setting leave:', error);
            alert('設定失敗，請稍後再試');
        }
    };

    const handleMenuClear = () => {
        if (!contextMenu) return;
        const { staffId, date } = contextMenu;
        const key = getScheduleKey(staffId, date);
        const newSchedule = new Map(schedule);
        newSchedule.set(key, 'OFF'); // Default to OFF when cleared
        setSchedule(newSchedule);
        setHasChanges(true);
    };

    const handleStaffNameClick = (s: Staff) => {
        setSelectedStaff(s);
        setIsHistoryModalOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);

        // Convert schedule map to entries for save
        // Key format: "{staffId}-{YYYY-MM-DD}" - date is always last 10 chars
        const entries: ScheduleEntry[] = [];
        schedule.forEach((shiftCode, key) => {
            const date = key.slice(-10); // Last 10 chars: YYYY-MM-DD
            const staffId = key.slice(0, -11); // Everything before "-YYYY-MM-DD"
            entries.push({ staffId, date, shiftCode });
        });

        const res = await scheduleApi.save(entries);

        if (res.success) {
            setOriginalSchedule(new Map(schedule));
            setHasChanges(false);
            alert('班表已儲存');
        } else {
            alert('儲存失敗: ' + res.message);
        }
        setSaving(false);
    };

    const handleReset = () => {
        setSchedule(new Map(originalSchedule));
        setHasChanges(false);
    };

    const handlePublishDraft = async () => {
        const hasPendingLeaves = leaveRequests.some(l => l.status === 'pending');
        if (hasPendingLeaves) {
            alert('尚有未審核的預假申請，請先完成審核後再發布。');
            return;
        }

        if (hasChanges) {
            alert('請先儲存草案後再發布');
            return;
        }
        setPublishing(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        publishDraft();
        setPublishing(false);
        alert(`已發布 ${format(currentMonth, 'yyyy年M月', { locale: zhTW })} 草案給 ${staff.length} 名同仁確認`);
    };

    const handlePublishOfficial = async () => {
        setPublishing(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        publishOfficial();
        setPublishing(false);
        alert(`正式班表已發布！`);
    };

    const handleAutoSchedule = async () => {
        const hasPendingLeaves = leaveRequests.some(l => l.status === 'pending');
        if (hasPendingLeaves) {
            alert('尚有未審核的預假申請，請先完成審核後再執行智慧排班。');
            return;
        }

        if (!window.confirm('確定要執行一鍵智慧排班嗎？這將會自動填補目前的空缺。')) return;

        setAutoScheduling(true);
        // Simulate calculation delay for better UX
        await new Promise(resolve => setTimeout(resolve, 800));

        const { newSchedule, filledCount } = generateAutoSchedule(schedule, [...staff, ...externalStaff], currentMonth, leaveRequests);
        setSchedule(newSchedule);
        setHasChanges(true);
        setAutoScheduling(false);

        alert(`智慧排班完成！共自動填補了 ${filledCount} 個班次。\n系統已自動避開法規違規並平衡工時。`);
    };

    const getStaffStats = (staffId: string) => {
        let dCount = 0, eCount = 0, nCount = 0, offCount = 0, totalHours = 0;
        days.forEach(day => {
            const shift = schedule.get(getScheduleKey(staffId, day)) || 'OFF';
            if (shift === 'D') { dCount++; totalHours += 8; }
            else if (shift === 'E') { eCount++; totalHours += 8; }
            else if (shift === 'N') { nCount++; totalHours += 8; }
            else offCount++;
        });
        return { dCount, eCount, nCount, offCount, totalHours, workDays: dCount + eCount + nCount };
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    if (loading) {
        return <div className={styles.loading}>載入中...</div>;
    }

    const gridStyle = {
        gridTemplateColumns: `160px repeat(${days.length}, 44px) 120px`
    };

    return (
        <div className={styles.pageContainer}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.pageTitle}>排班工作台</h1>
                    <div className={styles.monthNav}>
                        <button onClick={prevMonth}><ChevronLeft size={16} /></button>
                        <span className={styles.monthTitle}>
                            {format(currentMonth, 'yyyy年 M月', { locale: zhTW })}
                        </span>
                        <button onClick={nextMonth}><ChevronRight size={16} /></button>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.statusIndicator}>
                        {hasChanges ? (
                            <><AlertCircle size={14} className={styles.warning} /> 尚未儲存</>
                        ) : scheduleStatus === 'official' ? (
                            <><CheckCircle2 size={14} className={styles.success} /> 正式班表</>
                        ) : scheduleStatus === 'draft' ? (
                            <><CheckCircle2 size={14} className={styles.warning} /> 草案確認中</>
                        ) : (
                            <><CheckCircle2 size={14} className={styles.success} /> 規劃中</>
                        )}
                    </div>
                    {scheduleStatus === 'planning' && (
                        <button
                            className={styles.autoBtn}
                            onClick={handleAutoSchedule}
                            disabled={autoScheduling}
                        >
                            <Sparkles size={16} /> {autoScheduling ? '計算中...' : '一鍵智慧排班'}
                        </button>
                    )}
                    <button className={styles.resetBtn} onClick={handleReset} disabled={!hasChanges || scheduleStatus === 'official'}>
                        <RotateCcw size={16} /> 重置
                    </button>
                    <button className={styles.saveBtn} onClick={handleSave} disabled={!hasChanges || saving || scheduleStatus === 'official'}>
                        <Save size={16} /> {saving ? '儲存中...' : '儲存草案'}
                    </button>

                    {scheduleStatus !== 'official' && (
                        scheduleStatus === 'planning' ? (
                            <button className={styles.publishBtn} onClick={handlePublishDraft} disabled={hasChanges || publishing}>
                                <Send size={16} /> {publishing ? '發布中...' : '發布草案'}
                            </button>
                        ) : (
                            <button className={styles.officialBtn} onClick={handlePublishOfficial} disabled={publishing}>
                                <FileCheck size={16} /> {publishing ? '發布中...' : '發布正式班表'}
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Shift Palette */}
            <div className={styles.shiftPalette}>
                <span className={styles.paletteLabel}>拖拉班別：</span>
                {shifts.map(shift => (
                    <div
                        key={shift.code}
                        className={styles.shiftChip}
                        style={{
                            background: `${shift.color}20`,
                            color: shift.color,
                            borderColor: shift.color
                        }}
                        draggable
                        onDragStart={() => handleDragStart(shift.code)}
                        onDragEnd={handleDragEnd}
                    >
                        <GripVertical size={12} />
                        <span className={styles.chipCode}>{shift.code}</span>
                        <span className={styles.chipName}>{shift.name}</span>
                    </div>
                ))}
            </div>

            {/* Schedule Grid */}
            <div className={styles.gridWrapper}>
                <div className={styles.scheduleGrid} style={gridStyle}>
                    {/* Header Row */}
                    <div className={`${styles.headerCell} ${styles.staffHeader}`}>
                        人員
                    </div>
                    {days.map(day => {
                        const dayOfWeek = getDay(day);
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        return (
                            <div
                                key={day.toISOString()}
                                className={`${styles.headerCell} ${styles.dateHeader} ${isWeekend ? styles.weekend : ''}`}
                            >
                                <span className={styles.dateNum}>{format(day, 'd')}</span>
                                <span className={styles.dateName}>{format(day, 'E', { locale: zhTW })}</span>
                            </div>
                        );
                    })}
                    <div className={`${styles.headerCell} ${styles.statsHeader}`}>
                        統計
                    </div>

                    {/* Staff Rows */}
                    {allStaff.map(s => {
                        const isExternal = externalStaff.some(e => e.id === s.id);
                        const stats = getStaffStats(s.id);
                        return (
                            <React.Fragment key={s.id}>
                                {/* Staff Info Cell */}
                                <div className={`${styles.staffCell} ${isExternal ? styles.externalStaff : ''}`}>
                                    <div className={styles.staffInfo}>
                                        <span
                                            className={`${styles.staffName} ${styles.clickable}`}
                                            onClick={() => handleStaffNameClick(s)}
                                            title="點擊查看假勤明細"
                                        >
                                            {s.name}
                                            {isExternal && <span className={styles.supportBadge}>支</span>}
                                        </span>
                                        <span className={styles.staffLevel}>{s.level}</span>
                                    </div>
                                    {isExternal && (
                                        <button className={styles.removeSupportBtn} onClick={() => handleRemoveSupport(s.id)} title="移除支援">
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>

                                {/* Shift Cells */}
                                {days.map(day => {
                                    const key = getScheduleKey(s.id, day);
                                    const shiftCode = schedule.get(key) || 'OFF';
                                    const shiftConfig = shifts.find(sh => sh.code === shiftCode);
                                    const shiftColor = shiftConfig?.color || '#94A3B8';

                                    const isChanged = schedule.get(key) !== originalSchedule.get(key);
                                    const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                                    const cellViolations = violationsMap.get(key);
                                    const hasViolation = cellViolations && cellViolations.length > 0;

                                    // Pre-leave Indicator
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const leaveReq = leaveRequests.find(l => l.staffId === s.id && l.date === dateStr);
                                    const isPendingLeave = leaveReq?.status === 'pending';
                                    const isApprovedLeave = leaveReq?.status === 'approved';

                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className={`
                                                ${styles.shiftCell} 
                                                ${isChanged ? styles.changed : ''} 
                                                ${isWeekend ? styles.weekendCell : ''} 
                                                ${hasViolation ? styles.violation : ''}
                                                ${isPendingLeave ? styles.pendingLeave : ''}
                                                ${isApprovedLeave ? styles.approvedLeave : ''}
                                            `}
                                            data-violation={hasViolation ? cellViolations[0].message : undefined}
                                            style={{
                                                background: isPendingLeave ? '#FFF7ED' : `${shiftColor}15`,
                                                borderLeftColor: isPendingLeave ? '#F59E0B' : shiftColor
                                            }}
                                            onClick={() => handleCellClick(s.id, day)}
                                            onContextMenu={(e) => handleCellContextMenu(e, s.id, day)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={() => handleDrop(s.id, day)}
                                            title={leaveReq ? `預假申請：${leaveReq.leaveType} (${leaveReq.status})` : undefined}
                                        >
                                            <span
                                                className={styles.shiftCode}
                                                style={{ color: shiftColor }}
                                            >
                                                {isPendingLeave ? '?' : shiftCode}
                                            </span>
                                        </div>
                                    );
                                })}

                                {/* Stats Cell */}
                                <div className={styles.statsCell}>
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>工作</span>
                                        <span className={styles.statValue}>{stats.workDays}天</span>
                                    </div>
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>時數</span>
                                        <span className={styles.statValue}>{stats.totalHours}h</span>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Summary Footer */}
            <div className={styles.summaryFooter}>
                <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>本月總人次</span>
                    <span className={styles.summaryValue}>{allStaff.length} 人</span>
                </div>
                <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>總工作天數</span>
                    <span className={styles.summaryValue}>
                        {allStaff.reduce((acc, s) => acc + getStaffStats(s.id).workDays, 0)} 天
                    </span>
                </div>
                <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>總時數</span>
                    <span className={styles.summaryValue}>
                        {allStaff.reduce((acc, s) => acc + getStaffStats(s.id).totalHours, 0)} 小時
                    </span>
                </div>
            </div>

            {/* Add Support Button */}
            <div className={styles.addSupportRow}>
                <button className={styles.addSupportBtn} onClick={() => setShowSupportModal(true)}>
                    <UserPlus size={16} /> 加入跨單位支援人員
                </button>
            </div>

            {/* Make Shift Palette Sticky Bottom */}

            {/* Support Modal */}
            {showSupportModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>選擇支援人員</h3>
                        <div className={styles.supportList}>
                            {availableSupport.filter(as => !externalStaff.find(es => es.id === as.id)).map(s => (
                                <div key={s.id} className={styles.supportItem} onClick={() => handleAddSupport(s)}>
                                    <div className={styles.supportInfo}>
                                        <span className={styles.supportName}>{s.name}</span>
                                        <span className={styles.supportUnit}>{s.departmentId}</span>
                                        <span className={styles.staffLevel}>{s.level}</span>
                                    </div>
                                    <button className={styles.selectBtn}>加入</button>
                                </div>
                            ))}
                            {availableSupport.filter(as => !externalStaff.find(es => es.id === as.id)).length === 0 && (
                                <div className={styles.emptySupport}>無可用支援人員</div>
                            )}
                        </div>
                        <button className={styles.closeModalBtn} onClick={() => setShowSupportModal(false)}>關閉</button>
                    </div>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <CellContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    shifts={shifts}
                    onClose={() => setContextMenu(null)}
                    onSetShift={handleMenuSetShift}
                    onSetLeave={handleMenuSetLeave}
                    onClear={handleMenuClear}
                />
            )}

            {/* Staff History Modal */}
            {isHistoryModalOpen && selectedStaff && (
                <StaffLeaveHistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    staff={selectedStaff}
                    year={currentMonth.getFullYear()}
                    month={currentMonth.getMonth() + 1}
                />
            )}
        </div>
    );
};

export default Workbench;
