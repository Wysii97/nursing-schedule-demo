import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, eachDayOfInterval, getDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Save, RotateCcw, AlertCircle, CheckCircle2, GripVertical, Send, FileCheck, UserPlus, X, CalendarOff, Download } from 'lucide-react';
import { useScheduleStore } from '../../store/scheduleStore';
import { useAuth } from '../../context/AuthContext';
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
    const navigate = useNavigate();
    const {
        scheduleStatus,
        publishDraft,
        publishOfficial,
        currentPeriod,
        switchPeriod,
        confirmedStaffIds
    } = useScheduleStore();

    const { currentUnit } = useAuth();

    // Local state for navigation (sync with store period)
    const [navDate] = useState(new Date());

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

    // Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Interval Calculation
    const days = React.useMemo(() => {
        if (!currentPeriod) return [];
        return eachDayOfInterval({
            start: new Date(currentPeriod.startDate),
            end: new Date(currentPeriod.endDate)
        });
    }, [currentPeriod]);

    // Initial load
    useEffect(() => {
        loadData(true);
    }, []);

    // Period change
    useEffect(() => {
        if (!loading && currentPeriod) {
            // When store period changes, reload local data view
            loadData(false);
        }
    }, [currentPeriod]);

    const loadData = async (isInitial = false) => {
        if (isInitial) setLoading(true);

        const targetDate = isInitial ? navDate : (currentPeriod ? new Date(currentPeriod.startDate) : navDate);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;

        // For leave requests, we need to cover the full period range (may span 2 months)
        const periodStart = currentPeriod ? currentPeriod.startDate : `${year}-${String(month).padStart(2, '0')}-01`;
        const periodEnd = currentPeriod ? currentPeriod.endDate : `${year}-${String(month).padStart(2, '0')}-31`;

        // Fetch data... (Keep existing fetching logic mostly but use period range for critical parts if possible)
        // Note: The store already fetched the main data. Here we might just sync local state or fetch auxiliary data.
        // Actually, since store manages schedule, we should ideally get schedule FROM STORE context, not fetch again.
        // But for refactor minimization, we keep local state usage if it was fetching directly.
        // Wait, the previous code fetched API in loadData. 
        // To be consistent with "Store manages state", we should pull from store. 
        // BUT, Workbench has local editing state (schedule map).

        const [staffRes, shiftRes, externalRes, scheduleRes, leaveRes] = await Promise.all([
            staffApi.getAll(currentUnit?.id),
            shiftApi.getAll(),
            staffApi.getExternal(currentUnit?.id),
            scheduleApi.getByMonth(year, month),
            leaveApi.getByRange(periodStart, periodEnd)  // Use range for period spans
        ]);

        if (staffRes.success) setStaff(staffRes.data);
        if (shiftRes.success) setShifts(shiftRes.data);
        if (externalRes.success) setAvailableSupport(externalRes.data || []);
        if (leaveRes.success) {
            setLeaveRequests(leaveRes.data);
        }

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
            const leaveRes = await leaveApi.add({
                staffId,
                staffName,
                date: dateStr,
                type: 'leave',
                leaveType: leaveType,
                shiftCode: 'OFF',
                reason: borrowHours ? `管理員設定借休 ${borrowHours} 小時` : '管理員設定請假',
                status: 'approved'
            });

            if (!leaveRes.success) {
                throw new Error(leaveRes.message);
            }

            // 3. Update Balance
            // ... (rest of the logic)
            if (leaveType === '借休' && borrowHours) {
                const balanceRes = await balanceApiExtended.get(staffId);
                if (balanceRes.success) {
                    const currentComp = balanceRes.data.compensatoryHours;
                    const newComp = Math.max(0, currentComp - borrowHours);
                    await balanceApiExtended.update(staffId, {
                        compensatoryHours: newComp
                    });
                }
            } else if (leaveType === '特休') {
                const balanceRes = await balanceApiExtended.get(staffId);
                if (balanceRes.success) {
                    const currentAnnual = balanceRes.data.annualLeaveRemaining;
                    const newAnnual = Math.max(0, currentAnnual - 1);
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
            // Refresh data to show new leave
            loadData(false);
        } catch (error: any) {
            console.error('Error setting leave:', error);
            alert('設定失敗: ' + (error.message || '未知錯誤'));
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

    // Export schedule as CSV
    const handleExport = () => {
        if (!currentPeriod || days.length === 0) return;

        // Build CSV header: 姓名, 日期1, 日期2, ...
        const headers = ['姓名', ...days.map(d => format(d, 'M/d'))];

        // Build rows: staff name, shift for each day
        const allStaff = [...staff, ...externalStaff];
        const rows = allStaff.map(s => {
            const row = [s.name];
            days.forEach(day => {
                const key = `${s.id}-${format(day, 'yyyy-MM-dd')}`;
                row.push(schedule.get(key) || '-');
            });
            return row;
        });

        // Build CSV content
        const csvContent = [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');

        // Add BOM for Excel UTF-8 compatibility
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

        // Download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `排班表_${currentPeriod.startDate}_${currentPeriod.endDate}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
        alert(`已發布 ${currentPeriod?.name || ''} 草案給 ${staff.length} 名同仁確認`);
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

        const periodStart = currentPeriod ? new Date(currentPeriod.startDate) : new Date();
        const periodEnd = currentPeriod ? new Date(currentPeriod.endDate) : new Date();

        // Fetch previous period's last few days for continuity
        const prevPeriodEnd = new Date(periodStart);
        prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 1);
        const prevPeriodStart = new Date(prevPeriodEnd);
        prevPeriodStart.setDate(prevPeriodStart.getDate() - 6); // Last 7 days of previous period

        const prevYear = prevPeriodEnd.getFullYear();
        const prevMonth = prevPeriodEnd.getMonth() + 1;

        // Fetch previous period schedule
        const prevScheduleRes = await scheduleApi.getByMonth(prevYear, prevMonth);
        const previousSchedule = new Map<string, string>();
        if (prevScheduleRes.success) {
            prevScheduleRes.data.forEach((s: ScheduleEntry) => {
                previousSchedule.set(`${s.staffId}-${s.date}`, s.shiftCode);
            });
        }

        const { newSchedule, filledCount } = generateAutoSchedule(schedule, [...staff, ...externalStaff], periodStart, periodEnd, leaveRequests, previousSchedule);
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

    // Synchronized scroll for all scrollableMiddle elements
    const scrollContainersRef = React.useRef<HTMLDivElement[]>([]);
    const handleScrollSync = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        scrollContainersRef.current.forEach(el => {
            if (el && el !== e.currentTarget && el.scrollLeft !== scrollLeft) {
                el.scrollLeft = scrollLeft;
            }
        });
    };

    if (loading) {
        return <div className={styles.loading}>載入中...</div>;
    }

    return (
        <div className={styles.pageContainer}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.pageTitle}>排班工作台</h1>
                    <div className={styles.monthNav}>
                        <button onClick={() => switchPeriod(subMonths(new Date(currentPeriod?.startDate || new Date()), 1))}><ChevronLeft size={16} /></button>
                        <span className={styles.monthTitle}>
                            {currentPeriod ? (
                                <>
                                    {currentPeriod.name}
                                    <span style={{ fontSize: '0.8em', color: '#666', marginLeft: '8px' }}>
                                        ({format(new Date(currentPeriod.startDate), 'M/d')} - {format(new Date(currentPeriod.endDate), 'M/d')})
                                    </span>
                                </>
                            ) : '載入中...'}
                        </span>
                        <button onClick={() => switchPeriod(addMonths(new Date(currentPeriod?.startDate || new Date()), 1))}><ChevronRight size={16} /></button>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.statusIndicator}>
                        {hasChanges ? (
                            <><AlertCircle size={14} className={styles.warning} /> 尚未儲存</>
                        ) : scheduleStatus === 'official' ? (
                            <><CheckCircle2 size={14} className={styles.success} /> 正式班表</>
                        ) : scheduleStatus === 'draft' ? (
                            <button
                                className={styles.statusBtn}
                                onClick={() => setShowConfirmModal(true)}
                                title="點擊查看確認進度"
                            >
                                <CheckCircle2 size={14} className={styles.warning} />
                                草案確認中 ({confirmedStaffIds.length}/{staff.length})
                            </button>
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
                    <button className={styles.exportBtn} onClick={handleExport} title="匯出 CSV">
                        <Download size={16} /> 匯出
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

            {/* Schedule Grid - Single Vertical Scroll */}
            <div className={styles.gridWrapper}>
                {/* Header Row */}
                <div className={styles.headerRow}>
                    <div className={`${styles.stickyLeft} ${styles.headerCell} ${styles.staffHeader}`}>
                        人員
                    </div>
                    <div className={styles.scrollableDates} ref={el => { if (el) scrollContainersRef.current[0] = el; }} onScroll={handleScrollSync}>
                        <div className={styles.datesRow}>
                            {days.map(day => {
                                const dayOfWeek = getDay(day);
                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                return (
                                    <div key={day.toISOString()} className={`${styles.headerCell} ${styles.dateHeader} ${isWeekend ? styles.weekend : ''}`}>
                                        <span className={styles.dateNum}>{format(day, 'd')}</span>
                                        <span className={styles.dateName}>{format(day, 'E', { locale: zhTW })}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className={`${styles.stickyRight} ${styles.headerCell} ${styles.statsHeader}`}>
                        統計
                    </div>
                </div>

                {/* Body - Single Vertical Scroll */}
                <div className={styles.bodyContainer}>
                    {allStaff.map(s => {
                        const isExternal = externalStaff.some(e => e.id === s.id);
                        const stats = getStaffStats(s.id);
                        return (
                            <div key={s.id} className={styles.dataRow}>
                                {/* Staff Name - Sticky Left */}
                                <div className={`${styles.stickyLeft} ${styles.staffCell} ${isExternal ? styles.externalStaff : ''}`}>
                                    <div className={styles.staffInfo}>
                                        <span className={`${styles.staffName} ${styles.clickable}`} onClick={() => handleStaffNameClick(s)} title="點擊查看假勤明細">
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

                                {/* Schedule Dates - Horizontal Scroll */}
                                <div className={styles.scrollableDates} ref={el => { if (el) scrollContainersRef.current[allStaff.indexOf(s) + 1] = el; }} onScroll={handleScrollSync}>
                                    <div className={styles.datesRow}>
                                        {days.map(day => {
                                            const key = getScheduleKey(s.id, day);
                                            const rawShift = schedule.get(key);
                                            const shiftCode = rawShift ?? '';  // Keep actual value or empty for unscheduled
                                            const displayCode = rawShift !== undefined ? rawShift : '-';  // Show '-' only for unscheduled
                                            const shiftConfig = shifts.find(sh => sh.code === shiftCode);
                                            const shiftColor = shiftConfig?.color || '#94A3B8';
                                            const isChanged = schedule.get(key) !== originalSchedule.get(key);
                                            const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                                            const cellViolations = violationsMap.get(key);
                                            const hasViolation = cellViolations && cellViolations.length > 0;
                                            const dateStr = format(day, 'yyyy-MM-dd');
                                            const leaveReq = leaveRequests.find(l => l.staffId === s.id && l.date === dateStr);
                                            const isPendingLeave = leaveReq?.status === 'pending';
                                            const isApprovedLeave = leaveReq?.status === 'approved';

                                            return (
                                                <div
                                                    key={day.toISOString()}
                                                    className={`${styles.shiftCell} ${isChanged ? styles.changed : ''} ${isWeekend ? styles.weekendCell : ''} ${hasViolation ? styles.violation : ''} ${isPendingLeave ? styles.pendingLeave : ''} ${isApprovedLeave ? styles.approvedLeave : ''}`}
                                                    data-violation={hasViolation ? cellViolations[0].message : undefined}
                                                    style={{ background: isPendingLeave ? '#FFF7ED' : `${shiftColor}15`, borderLeftColor: isPendingLeave ? '#F59E0B' : shiftColor }}
                                                    onClick={() => {
                                                        if (isPendingLeave) {
                                                            navigate('/schedule/leave-approval');
                                                        } else {
                                                            handleCellClick(s.id, day);
                                                        }
                                                    }}
                                                    onContextMenu={(e) => handleCellContextMenu(e, s.id, day)}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={() => handleDrop(s.id, day)}
                                                    title={leaveReq ? `預假申請：${leaveReq.leaveType} (${leaveReq.status})` : undefined}
                                                >
                                                    <span className={styles.shiftCode} style={{ color: shiftColor }}>
                                                        {isPendingLeave ? '?' : displayCode}
                                                    </span>
                                                    {isApprovedLeave && (
                                                        <span className={styles.leaveIcon} title="已核准預假">
                                                            <CalendarOff size={12} />
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Stats - Sticky Right */}
                                <div className={`${styles.stickyRight} ${styles.statsCell}`}>
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>工作</span>
                                        <span className={styles.statValue}>{stats.workDays}天</span>
                                    </div>
                                    <div className={styles.statItem}>
                                        <span className={styles.statLabel}>時數</span>
                                        <span className={styles.statValue}>{stats.totalHours}h</span>
                                    </div>
                                </div>
                            </div>
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

            {/* Confirmation Status Modal */}
            {
                showConfirmModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                            <h3>草案確認狀態</h3>
                            <div className={styles.confirmStats}>
                                <p>已確認：{confirmedStaffIds.length} / {staff.length}</p>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{ width: `${(confirmedStaffIds.length / staff.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <div className={styles.confirmList}>
                                {staff.map(s => {
                                    const isConfirmed = confirmedStaffIds.includes(s.id);
                                    return (
                                        <div key={s.id} className={`${styles.confirmItem} ${isConfirmed ? styles.confirmed : styles.pending}`}>
                                            <span className={styles.confirmName}>{s.name}</span>
                                            <span className={styles.confirmStatus}>
                                                {isConfirmed ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                                {isConfirmed ? '已確認' : '未確認'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <button className={styles.closeModalBtn} onClick={() => setShowConfirmModal(false)}>關閉</button>
                        </div>
                    </div>
                )
            }

            {/* Support Modal */}
            {
                showSupportModal && (
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
                )
            }

            {/* Context Menu */}
            {
                contextMenu && (
                    <CellContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        shifts={shifts}
                        onClose={() => setContextMenu(null)}
                        onSetShift={handleMenuSetShift}
                        onSetLeave={(type, hours) => {
                            // Enforce: Cancel borrow leave if not official or expired
                            if (type === '借休') {
                                if (scheduleStatus !== 'official') {
                                    alert('僅能在「正式班表」狀態下設定借休。');
                                    return;
                                }
                                // Optional: Check if date is in past (if needed)
                            }
                            handleMenuSetLeave(type, hours);
                        }}
                        onClear={handleMenuClear}
                    />
                )
            }

            {/* Staff History Modal */}
            {
                isHistoryModalOpen && selectedStaff && currentPeriod && (
                    <StaffLeaveHistoryModal
                        isOpen={isHistoryModalOpen}
                        onClose={() => setIsHistoryModalOpen(false)}
                        staff={selectedStaff}
                        year={new Date(currentPeriod.startDate).getFullYear()}
                        month={new Date(currentPeriod.startDate).getMonth() + 1}
                    />
                )
            }
        </div >
    );
};

export default Workbench;
