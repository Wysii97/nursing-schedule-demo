import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, addDays, isWeekend, isToday as isTodayFn } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Users, AlertTriangle, ChevronLeft, ChevronRight, Calendar, BarChart2, Check, FileText, Settings, UserPlus, RefreshCw } from 'lucide-react';
import { useScheduleStore } from '../../store/scheduleStore';
import styles from './Dashboard.module.css';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { schedule, staff, getPendingCount, getTodayOnDuty } = useScheduleStore();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const todayData = getTodayOnDuty();
    const totalStaff = staff.length;
    const dayShift = todayData.D;
    const eveningShift = todayData.E;
    const nightShift = todayData.N;
    const onDuty = todayData.total;
    const pendingCount = getPendingCount();

    const monthStart = startOfMonth(currentMonth);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monthStart, 21 + i));

    const staffSchedule = staff.slice(0, 5).map(s => {
        const sched = weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const entry = schedule.find(e => e.staffId === s.id && e.date === dateStr);
            return entry?.shiftCode || 'OFF';
        });
        const hours = sched.filter(sh => sh !== 'OFF').length * 8;
        const offBalance = 0; // TODO: calculate from leave balance
        return { ...s, schedule: sched, hours, offBalance };
    });

    const wardRatios = [
        { ward: '內科一病房 (5F)', nurses: 8, patients: 64, ratio: '1:8.0', status: 'normal' },
        { ward: '外科二病房 (6F)', nurses: 6, patients: 58, ratio: '1:9.6', status: 'high' },
        { ward: '加護病房 ICU', nurses: 12, patients: 24, ratio: '1:2.0', status: 'good' },
        { ward: '綜合病房 (8F)', nurses: 4, patients: 42, ratio: '1:10.5', status: 'danger' },
    ];

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.pageTitle}>管理儀表板</h1>
                    <p className={styles.headerDate}>{format(new Date(), 'yyyy年 M月 d日 (EEEEE)', { locale: zhTW })}</p>
                </div>
                <button className={styles.refreshBtn}><RefreshCw size={14} /> 最後更新: 剛剛</button>
            </div>

            {/* Today Overview */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>今日總覽</h2>
                <p className={styles.sectionDesc}>即時監控人力配置與病房運作狀況。</p>
                <div className={styles.overviewCards}>
                    <div className={styles.overviewCard}>
                        <div className={styles.cardHeader}>
                            <span>今日執勤人數</span>
                            <Users size={20} className={styles.iconBlue} />
                        </div>
                        <div className={styles.cardValue}>
                            <span className={styles.bigNum}>{onDuty}</span>
                            <span className={styles.subNum}>/{totalStaff}</span>
                        </div>
                        <div className={styles.shiftBreakdown}>
                            <span><span className={styles.dot} data-shift="D" /> 早班 {dayShift}</span>
                            <span><span className={styles.dot} data-shift="E" /> 小夜 {eveningShift}</span>
                            <span><span className={styles.dot} data-shift="N" /> 大夜 {nightShift}</span>
                        </div>
                    </div>
                    <div className={styles.overviewCard}>
                        <div className={styles.cardHeader}>
                            <span>缺勤狀況</span>
                            <AlertTriangle size={20} className={styles.iconOrange} />
                        </div>
                        <div className={styles.cardValue}>
                            <span className={styles.bigNum}>3</span>
                            <span className={styles.alertTag}>人力吃緊</span>
                        </div>
                        <div className={styles.absenceDetail}>病假 1, 事假 1, 臨時請假 1</div>
                    </div>
                    <div className={styles.overviewCard}>
                        <div className={styles.cardHeader}>
                            <span>全院平均護病比</span>
                            <Check size={20} className={styles.iconGreen} />
                        </div>
                        <div className={styles.cardValue}>
                            <span className={styles.bigNum}>1:8.5</span>
                        </div>
                        <div className={styles.ratioBar}>
                            <div className={styles.ratioFill} style={{ width: '70%' }} />
                        </div>
                        <span className={styles.ratioStatus}>正常</span>
                    </div>
                    <div className={styles.overviewCard}>
                        <div className={styles.cardHeader}>
                            <span>排班草案確認率</span>
                            <Calendar size={20} className={styles.iconBlue} />
                        </div>
                        <div className={styles.cardValue}>
                            <span className={styles.bigNum}>85%</span>
                            <span className={styles.subNum}>{format(new Date(), 'M月', { locale: zhTW })}</span>
                        </div>
                        <div className={styles.confirmBreakdown}>
                            <span>待審核 <strong className={styles.dangerText}>{pendingCount}件</strong></span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Grid */}
            <div className={styles.mainGrid}>
                {/* Left: Schedule Grid */}
                <div className={styles.leftColumn}>
                    {/* Schedule Grid */}
                    <div className={styles.scheduleCard}>
                        <div className={styles.scheduleHeader}>
                            <h3><Calendar size={14} /> 當月班表</h3>
                            <div className={styles.monthNav}>
                                <button onClick={prevMonth}><ChevronLeft size={14} /></button>
                                <span>{format(currentMonth, 'yyyy年 M月', { locale: zhTW })}</span>
                                <button onClick={nextMonth}><ChevronRight size={14} /></button>
                            </div>
                        </div>
                        <div className={styles.scheduleGrid}>
                            <div className={styles.gridHeader}>
                                <div className={styles.staffCol}>人員</div>
                                {weekDays.map(day => (
                                    <div key={day.toISOString()} className={`${styles.dayCol} ${isWeekend(day) ? styles.weekend : ''} ${isTodayFn(day) ? styles.today : ''}`}>
                                        <span>{format(day, 'd')}</span>
                                        <span>{format(day, 'EEEEE', { locale: zhTW })}</span>
                                    </div>
                                ))}
                                <div className={styles.hoursCol}>時數</div>
                            </div>
                            {staffSchedule.map(staff => (
                                <div key={staff.id} className={styles.gridRow}>
                                    <div className={styles.staffCell}>
                                        <div className={styles.avatar}>{staff.name.charAt(0)}</div>
                                        <div>
                                            <div className={styles.staffName}>{staff.name}</div>
                                            <div className={styles.staffLevel}>{staff.level}</div>
                                        </div>
                                    </div>
                                    {staff.schedule.map((shift, i) => (
                                        <div key={i} className={`${styles.shiftCell} ${isWeekend(weekDays[i]) ? styles.weekend : ''}`}>
                                            <span className={styles.shiftBadge} data-shift={shift}>{shift}</span>
                                        </div>
                                    ))}
                                    <div className={styles.hoursCell}>{staff.hours}</div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => navigate('/schedule/workbench')} className={styles.viewLink}>查看完整班表 →</button>
                    </div>
                </div>

                {/* Right: Ward Ratio Table */}
                <div className={styles.rightColumn}>
                    <div className={styles.ratioCard}>
                        <div className={styles.ratioHeader}>
                            <h3><BarChart2 size={14} /> 病房護病比監控</h3>
                            <a href="#" className={styles.detailLink}>查看詳細報表</a>
                        </div>
                        <table className={styles.ratioTable}>
                            <thead>
                                <tr>
                                    <th>單位</th>
                                    <th>值班護理師</th>
                                    <th>在院病患數</th>
                                    <th>即時護病比</th>
                                    <th>狀態</th>
                                </tr>
                            </thead>
                            <tbody>
                                {wardRatios.map(row => (
                                    <tr key={row.ward}>
                                        <td>{row.ward}</td>
                                        <td>{row.nurses} 人</td>
                                        <td>{row.patients} 人</td>
                                        <td className={row.status === 'danger' ? styles.dangerText : ''}>{row.ratio}</td>
                                        <td>
                                            <span className={styles.statusBadge} data-status={row.status}>
                                                {row.status === 'normal' ? '正常' : row.status === 'high' ? '略高' : row.status === 'good' ? '優良' : '過高'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button className={styles.expandBtn}>查看更多單位 ▾</button>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className={styles.actionBar}>
                <button className={styles.actionBtn} data-type="primary" onClick={() => navigate('/schedule/workbench')}>
                    <Check size={16} /> <div><strong>發布排班</strong><span>11月正式班表</span></div>
                </button>
                <button className={styles.actionBtn} onClick={() => navigate('/schedule/workbench')}>
                    <UserPlus size={16} /> <div><strong>支援調度</strong><span>跨病房人力支援</span></div>
                </button>
                <button className={styles.actionBtn}>
                    <FileText size={16} /> <div><strong>匯出日報</strong><span>今日人力異常</span></div>
                </button>
                <button className={styles.actionBtn} onClick={() => navigate('/settings/rules')}>
                    <Settings size={16} /> <div><strong>參數設定</strong><span>護病比警戒值</span></div>
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
