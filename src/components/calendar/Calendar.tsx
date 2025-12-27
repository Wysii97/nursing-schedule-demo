import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import styles from './Calendar.module.css';

interface DayData {
    date: Date;
    tags?: { type: string; label: string; color?: string; isMine?: boolean }[];
    needsLottery?: boolean;
    tooltips?: string[];
}

interface CalendarProps {
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
    selectedDate: Date | null;
    onDateSelect: (date: Date) => void;
    dayDataMap?: Map<string, DayData>;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const Calendar: React.FC<CalendarProps> = ({
    currentMonth,
    onMonthChange,
    selectedDate,
    onDateSelect,
    dayDataMap = new Map()
}) => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows: Date[][] = [];
    let days: Date[] = [];
    let day = startDate;

    while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
            days.push(day);
            day = addDays(day, 1);
        }
        rows.push(days);
        days = [];
    }

    const getDayKey = (date: Date) => format(date, 'yyyy-MM-dd');

    return (
        <div className={styles.calendarContainer}>
            <div className={styles.calendarHeader}>
                <div className={styles.monthNav}>
                    <button className={styles.navButton} onClick={() => onMonthChange(subMonths(currentMonth, 1))}>
                        <ChevronLeft size={16} />
                    </button>
                    <span className={styles.monthTitle}>
                        {format(currentMonth, 'yyyy年 M月', { locale: zhTW })} 班表預填
                    </span>
                    <button className={styles.navButton} onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
                        <ChevronRight size={16} />
                    </button>
                </div>

                <div className={styles.legend}>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: '#3B82F6' }}></span>
                        D班
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: '#F59E0B' }}></span>
                        E班
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: '#6366F1' }}></span>
                        N班
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: '#A855F7' }}></span>
                        預假
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: '#EF4444' }}></span>
                        需抽籤
                        <div className={styles.legendItem}>
                            <span className={styles.legendDot} style={{ background: '#94A3B8' }}></span>
                            同事預假
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.calendarGrid}>
                {WEEKDAYS.map(wd => (
                    <div key={wd} className={styles.weekdayHeader}>{wd}</div>
                ))}

                {rows.map((week, wi) => (
                    <React.Fragment key={wi}>
                        {week.map((d, di) => {
                            const dayData = dayDataMap.get(getDayKey(d));
                            const isCurrentMonth = isSameMonth(d, currentMonth);
                            const isSelected = selectedDate && isSameDay(d, selectedDate);

                            return (
                                <div
                                    key={di}
                                    className={`${styles.dayCell} 
                    ${!isCurrentMonth ? styles.otherMonth : ''} 
                    ${isToday(d) ? styles.today : ''} 
                    ${isSelected ? styles.selected : ''}`}
                                    onClick={() => isCurrentMonth && onDateSelect(d)}
                                    title={dayData?.tooltips?.join('\n')}
                                >
                                    <div className={styles.dayNumber}>{format(d, 'd')}</div>
                                    {dayData?.needsLottery && (
                                        <span className={styles.lotteryBadge}>抽</span>
                                    )}
                                    {dayData?.tags && (
                                        <div className={styles.dayTags}>
                                            {dayData.tags.map((tag: { type: string; label: string; color?: string; isMine?: boolean }, ti: number) => (
                                                <span
                                                    key={ti}
                                                    className={`${styles.dayTag} ${styles[tag.type]}`}
                                                    style={tag.color ? {
                                                        background: `${tag.color}20`,
                                                        color: tag.color,
                                                        borderLeft: `3px solid ${tag.color}`
                                                    } : undefined}
                                                >
                                                    {tag.label}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default Calendar;
