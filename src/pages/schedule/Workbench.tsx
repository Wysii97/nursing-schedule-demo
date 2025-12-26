import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Save, RotateCcw, AlertCircle, CheckCircle2, GripVertical, Send, FileCheck, UserPlus, X } from 'lucide-react';
import { useScheduleStore } from '../../store/scheduleStore';
import { shiftApi, staffApi } from '../../api/client';
import { mockSchedule } from '../../api/mockData';
import type { Staff, Shift } from '../../types';
import styles from './Workbench.module.css';
import { checkScheduleCompliance, type Violation } from '../../utils/scheduleValidation';
import { generateAutoSchedule } from '../../utils/autoSchedule';
import { Sparkles } from 'lucide-react';

const SHIFT_COLORS: Record<string, string> = {
    D: '#3B82F6',
    E: '#F59E0B',
    N: '#6366F1',
    OFF: '#94A3B8'
};

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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [autoScheduling, setAutoScheduling] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [draggedShift, setDraggedShift] = useState<string | null>(null);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    useEffect(() => {
        loadData();
    }, [currentMonth]);

    const loadData = async () => {
        setLoading(true);
        const [staffRes, shiftRes, externalRes] = await Promise.all([
            staffApi.getAll(),
            shiftApi.getAll(),
            staffApi.getExternal()
        ]);

        if (staffRes.success) setStaff(staffRes.data);
        if (shiftRes.success) setShifts(shiftRes.data);
        if (externalRes.success) setAvailableSupport(externalRes.data || []);

        const scheduleMap = new Map<string, string>();
        const yearMonth = format(currentMonth, 'yyyy-MM');

        // Find utilized external staff from schedule
        const currentExternal: Staff[] = [];

        mockSchedule
            .filter(s => s.date.startsWith(yearMonth))
            .forEach(s => {
                scheduleMap.set(`${s.staffId}-${s.date}`, s.shiftCode);

                // Check if it's an external staff member and add to list if used
                if ((externalRes.data || []).find(e => e.id === s.staffId) && !currentExternal.find(e => e.id === s.staffId)) {
                    const ext = (externalRes.data || []).find(e => e.id === s.staffId);
                    if (ext) currentExternal.push(ext);
                }
            });

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
        const key = getScheduleKey(staffId, date);
        const currentShift = schedule.get(key) || 'OFF';
        const shiftOrder = ['D', 'E', 'N', 'OFF'];
        const currentIdx = shiftOrder.indexOf(currentShift);
        const nextShift = shiftOrder[(currentIdx + 1) % shiftOrder.length];

        const newSchedule = new Map(schedule);
        newSchedule.set(key, nextShift);
        setSchedule(newSchedule);
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setOriginalSchedule(new Map(schedule));
        setHasChanges(false);
        setSaving(false);
        alert('班表已儲存');
    };

    const handleReset = () => {
        setSchedule(new Map(originalSchedule));
        setHasChanges(false);
    };

    const handlePublishDraft = async () => {
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
        if (!window.confirm('確定要執行一鍵智慧排班嗎？這將會自動填補目前的空缺。')) return;

        setAutoScheduling(true);
        // Simulate calculation delay for better UX
        await new Promise(resolve => setTimeout(resolve, 800));

        const { newSchedule, filledCount } = generateAutoSchedule(schedule, [...staff, ...externalStaff], currentMonth);
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
                {['D', 'E', 'N', 'OFF'].map(code => (
                    <div
                        key={code}
                        className={styles.shiftChip}
                        style={{ background: `${SHIFT_COLORS[code]}20`, color: SHIFT_COLORS[code], borderColor: SHIFT_COLORS[code] }}
                        draggable
                        onDragStart={() => handleDragStart(code)}
                        onDragEnd={handleDragEnd}
                    >
                        <GripVertical size={12} />
                        <span className={styles.chipCode}>{code}</span>
                        <span className={styles.chipName}>{shifts.find(s => s.code === code)?.name || code}</span>
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
                                        <span className={styles.staffName}>
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
                                    const isChanged = schedule.get(key) !== originalSchedule.get(key);
                                    const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                                    const cellViolations = violationsMap.get(key);
                                    const hasViolation = cellViolations && cellViolations.length > 0;

                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className={`${styles.shiftCell} ${isChanged ? styles.changed : ''} ${isWeekend ? styles.weekendCell : ''} ${hasViolation ? styles.violation : ''}`}
                                            data-violation={hasViolation ? cellViolations[0].message : undefined}
                                            style={{
                                                background: `${SHIFT_COLORS[shiftCode]}15`,
                                                borderLeftColor: SHIFT_COLORS[shiftCode]
                                            }}
                                            onClick={() => handleCellClick(s.id, day)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={() => handleDrop(s.id, day)}
                                        >
                                            <span
                                                className={styles.shiftCode}
                                                style={{ color: SHIFT_COLORS[shiftCode] }}
                                            >
                                                {shiftCode}
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
        </div>
    );
};

export default Workbench;
