import React, { useState, useEffect } from 'react';
import { format, startOfMonth } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { CalendarDays, Wallet, Bell, BarChart3, RefreshCw, FileText, AlertTriangle, Info, CheckCircle2, History } from 'lucide-react';
import { useScheduleStore } from '../../store/scheduleStore';
import Calendar from '../../components/calendar/Calendar';
import DayDetailPanel from '../../components/ui/DayDetailPanel';
import { scheduleApi, staffApi, balanceApi, shiftApi } from '../../api/client';
import { mockSchedule, mockStaff } from '../../api/mockData';
import type { ScheduleEntry, BalanceData } from '../../api/mockData';
import type { Staff, Shift } from '../../types';
import styles from './MySchedule.module.css';

const SHIFT_COLORS: Record<string, string> = {
    D: '#3B82F6',
    E: '#F59E0B',
    N: '#6366F1',
    OFF: '#94A3B8'
};

const MySchedule: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);

    const [currentUser, setCurrentUser] = useState<Staff | null>(null);
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [allSchedule] = useState<ScheduleEntry[]>(mockSchedule); // All staff schedule
    const [allStaff, setAllStaff] = useState<Staff[]>(mockStaff);
    const [balance, setBalance] = useState<BalanceData | null>(null);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [todayShift, setTodayShift] = useState<ScheduleEntry | null>(null);

    const { scheduleStatus, confirmSchedule, confirmedStaffIds } = useScheduleStore();

    // Determine the view mode for the current month
    // If viewing past month: Always Official (History)
    // If viewing current/future month: Follow system status
    const isPastMonth = currentMonth < startOfMonth(new Date());
    const displayStatus = isPastMonth ? 'official' : scheduleStatus;

    // Check if current user has confirmed (only relevant for draft)
    const isConfirmed = currentUser && confirmedStaffIds.includes(currentUser.id);

    // Initial load (once)
    useEffect(() => {
        loadInitialData();
    }, []);

    const handleConfirm = () => {
        if (currentUser) {
            confirmSchedule(currentUser.id);
            alert('已確認班表草案！');
        }
    };

    // Load schedule when month changes
    useEffect(() => {
        if (currentUser) {
            loadScheduleForMonth();
        }
    }, [currentMonth, currentUser]);

    const loadInitialData = async () => {
        setLoading(true);

        const [userRes, balanceRes, shiftsRes, staffRes] = await Promise.all([
            staffApi.getCurrent(),
            balanceApi.get(),
            shiftApi.getAll(),
            staffApi.getAll()
        ]);

        if (userRes.success) setCurrentUser(userRes.data);
        if (balanceRes.success) setBalance(balanceRes.data);
        if (shiftsRes.success) setShifts(shiftsRes.data);
        if (staffRes.success) setAllStaff(staffRes.data);

        setLoading(false);
    };

    const loadScheduleForMonth = async () => {
        if (!currentUser) return;

        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;

        const schedRes = await scheduleApi.getByStaff(currentUser.id, year, month);
        if (schedRes.success) {
            setSchedule(schedRes.data);
            // Find today's shift
            const today = format(new Date(), 'yyyy-MM-dd');
            const todayEntry = schedRes.data.find(s => s.date === today);
            setTodayShift(todayEntry || null);
        }
    };

    // Build calendar day data from schedule with shift colors
    const dayDataMap = new Map();
    schedule.forEach(entry => {
        const shiftInfo = shifts.find(s => s.code === entry.shiftCode);
        const color = SHIFT_COLORS[entry.shiftCode] || shiftInfo?.color || '#94A3B8';
        dayDataMap.set(entry.date, {
            tags: [{
                type: 'shift',
                label: entry.shiftCode === 'OFF' ? 'OFF' : `${entry.shiftCode}班`,
                color: color
            }]
        });
    });

    // Get schedule for selected date
    const getSelectedDateSchedule = (): ScheduleEntry[] => {
        if (!selectedDate) return [];
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        return allSchedule.filter(s => s.date === dateStr);
    };

    const getMyShiftOnDate = (): ScheduleEntry | undefined => {
        if (!selectedDate || !currentUser) return undefined;
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        return allSchedule.find(s => s.date === dateStr && s.staffId === currentUser.id);
    };

    const handleRequestSwap = (targetStaffId: string) => {
        alert(`發起換班請求：與 ${allStaff.find(s => s.id === targetStaffId)?.name} 換班`);
    };

    const getTodayShiftInfo = () => {
        if (!todayShift) return { code: '-', name: '未排班', time: '-', color: '#94A3B8' };
        const shiftInfo = shifts.find(s => s.code === todayShift.shiftCode);
        return {
            code: todayShift.shiftCode,
            name: shiftInfo?.name || todayShift.shiftCode,
            time: shiftInfo ? `${shiftInfo.startTime}-${shiftInfo.endTime}` : '-',
            color: SHIFT_COLORS[todayShift.shiftCode] || '#94A3B8'
        };
    };

    const todayInfo = getTodayShiftInfo();

    if (loading) {
        return <div>載入中...</div>;
    }

    return (
        <div className={styles.pageContainer}>
            {/* Left Panel */}
            <div className={styles.leftPanel}>
                {/* Today Status */}
                <div className={styles.todayCard}>
                    <div className={styles.cardHeader}>
                        <CalendarDays size={16} />
                        今日勤態
                    </div>
                    <div className={styles.todayShift}>
                        <div className={styles.shiftBadge} style={{ background: todayInfo.color }}>
                            <span className={styles.code}>{todayInfo.code}</span>
                            <span className={styles.label}>{todayInfo.code === 'OFF' ? 'OFF' : todayInfo.code}</span>
                        </div>
                        <div className={styles.shiftInfo}>
                            <div className={styles.shiftName}>{todayInfo.name}</div>
                            <div className={styles.shiftTime}>{todayInfo.time}</div>
                        </div>
                    </div>
                    <div className={styles.nextShift}>
                        → {currentUser?.name || '使用者'}，歡迎回來
                    </div>

                    <div className={styles.todoList}>
                        <div className={styles.cardHeader} style={{ marginTop: 'var(--spacing-md)' }}>待辦事項</div>

                        {displayStatus === 'draft' && !isConfirmed && (
                            <div className={styles.todoItem}>
                                <span className={styles.todoDot} style={{ background: 'var(--danger)' }}></span>
                                班表草案待確認
                            </div>
                        )}

                        <div className={styles.todoItem}>
                            <span className={styles.todoDot} style={{ background: 'var(--warning)' }}></span>
                            {schedule.length} 筆班表資料已載入
                        </div>
                    </div>
                </div>

                {/* Balance Card */}
                <div className={styles.balanceCard}>
                    <div className={styles.balanceHeader}>
                        <div className={styles.balanceTitle}>
                            <Wallet size={16} />
                            假勤帳戶概覽
                        </div>
                        <a href="#" className={styles.viewDetails}>查看明細 &gt;</a>
                    </div>

                    <div className={styles.balanceGrid}>
                        <div className={styles.balanceItem}>
                            <div className={styles.balanceLabel}>特休剩餘</div>
                            <div className={styles.balanceProgress}>
                                <div className={styles.bar} style={{ width: `${((balance?.annualLeaveRemaining || 0) / (balance?.annualLeaveTotal || 14)) * 100}%`, background: 'var(--success)' }}></div>
                            </div>
                            <div className={styles.balanceValue}>
                                {balance?.annualLeaveRemaining || 0}<span className={styles.unit}> 天</span>
                            </div>
                        </div>

                        <div className={styles.balanceItem}>
                            <div className={styles.balanceLabel}>積假時數</div>
                            <div className={styles.balanceProgress}>
                                <div className={styles.bar} style={{ width: '50%', background: 'var(--primary)' }}></div>
                            </div>
                            <div className={styles.balanceValue}>
                                {balance?.compensatoryHours || 0}<span className={styles.unit}> 小時</span>
                            </div>
                        </div>

                        <div className={styles.balanceItem}>
                            <div className={styles.balanceLabel}>借休負債</div>
                            <div className={styles.balanceProgress}>
                                <div className={styles.bar} style={{ width: '20%', background: 'var(--danger)' }}></div>
                            </div>
                            <div className={`${styles.balanceValue} ${styles.negative}`}>
                                {balance?.debtHours || 0}<span className={styles.unit}> 小時</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Calendar */}
            <div className={styles.mainContent}>
                <div className={styles.pageHeader}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.pageTitle}>我的班表</h1>
                        <span className={styles.pageSubtitle}>{format(new Date(), 'yyyy年 M月 d日 (EEEE)', { locale: zhTW })}</span>
                    </div>
                    <div className={styles.headerActions}>
                        {displayStatus === 'draft' && (
                            <>
                                {isConfirmed ? (
                                    <div className={styles.confirmedBadge}>
                                        <CheckCircle2 size={16} /> 已確認無誤
                                    </div>
                                ) : (
                                    <button className={`${styles.actionButton} ${styles.confirmBtn}`} onClick={handleConfirm}>
                                        <CheckCircle2 size={16} />
                                        確認無誤
                                    </button>
                                )}
                                <button className={styles.actionButton} onClick={() => alert('換班申請功能')}>
                                    <RefreshCw size={16} />
                                    申請換班
                                </button>
                            </>
                        )}

                        {displayStatus === 'official' && (
                            <div className={styles.officialBadge}>
                                {isPastMonth ? <History size={16} /> : <FileText size={16} />}
                                {isPastMonth ? '歷史班表' : '正式班表'}
                            </div>
                        )}

                        <button className={`${styles.actionButton} ${styles.primary}`}>
                            <FileText size={16} />
                            積借休申請
                        </button>
                    </div>
                </div>

                <div className={styles.calendarHint}>
                    💡 點擊日期可查看當日所有上班人員
                </div>

                <div className={styles.scheduleCalendar}>
                    <Calendar
                        currentMonth={currentMonth}
                        onMonthChange={setCurrentMonth}
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                        dayDataMap={dayDataMap}
                    />
                </div>
            </div>

            {/* Right Panel - Day Detail or Notices */}
            <div className={styles.rightPanel}>
                {selectedDate ? (
                    <DayDetailPanel
                        date={selectedDate}
                        schedule={getSelectedDateSchedule()}
                        staffList={allStaff}
                        shifts={shifts}
                        currentUserShift={getMyShiftOnDate()}
                        onClose={() => setSelectedDate(null)}
                        onRequestSwap={handleRequestSwap}
                    />
                ) : (
                    <>
                        {/* Notices */}
                        <div className={styles.noticeCard}>
                            <div className={styles.noticeTitle}>
                                <Bell size={16} />
                                重要通知 Notices
                            </div>

                            <div className={`${styles.noticeItem} ${styles.warning}`}>
                                <div className={styles.noticeItemTitle}>
                                    <AlertTriangle size={14} /> 系統公告
                                </div>
                                <div className={styles.noticeItemDesc}>
                                    下月班表開放預假申請中，請於截止日前完成申請。
                                </div>
                                <div className={styles.noticeItemTime}>{format(new Date(), 'HH:mm')} • 系統</div>
                            </div>

                            <div className={`${styles.noticeItem} ${styles.info}`}>
                                <div className={styles.noticeItemTitle}>
                                    <Info size={14} /> 班表已更新
                                </div>
                                <div className={styles.noticeItemDesc}>
                                    {format(currentMonth, 'yyyy年 M月', { locale: zhTW })} 班表已載入完成。
                                </div>
                                <div className={styles.noticeItemTime}>{format(new Date(), 'HH:mm')} • 排班系統</div>
                            </div>
                        </div>

                        {/* Skill Mix */}
                        <div className={styles.skillMixCard}>
                            <div className={styles.skillMixTitle}>
                                <BarChart3 size={16} />
                                職級分佈 Skill Mix
                            </div>

                            <div className={styles.skillMixItem}>
                                <span className={styles.skillMixLabel}>N4 (資深 Leader)</span>
                                <div className={styles.skillMixBar}>
                                    <div className={styles.bar} style={{ width: '20%', background: '#F59E0B' }}></div>
                                </div>
                                <span className={styles.skillMixPercent}>20%</span>
                            </div>

                            <div className={styles.skillMixItem}>
                                <span className={styles.skillMixLabel}>N3 (進階 Advanced)</span>
                                <div className={styles.skillMixBar}>
                                    <div className={styles.bar} style={{ width: '40%', background: '#3B82F6' }}></div>
                                </div>
                                <span className={styles.skillMixPercent}>40%</span>
                            </div>

                            <div className={styles.skillMixItem}>
                                <span className={styles.skillMixLabel}>N2 (勝任 Competent)</span>
                                <div className={styles.skillMixBar}>
                                    <div className={styles.bar} style={{ width: '30%', background: '#10B981' }}></div>
                                </div>
                                <span className={styles.skillMixPercent}>30%</span>
                            </div>

                            <div className={styles.skillMixItem}>
                                <span className={styles.skillMixLabel}>N0/N1 (新進 Novice)</span>
                                <div className={styles.skillMixBar}>
                                    <div className={styles.bar} style={{ width: '10%', background: '#94A3B8' }}></div>
                                </div>
                                <span className={styles.skillMixPercent}>10%</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MySchedule;
