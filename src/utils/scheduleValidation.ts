
import { format, subDays } from 'date-fns';

export interface Violation {
    type: 'consecutive_days' | 'interval_error';
    date: string;
    message: string;
    severity: 'error' | 'warning';
}

export const checkScheduleCompliance = (
    staffId: string,
    schedule: Map<string, string>,
    days: Date[]
): Map<string, Violation[]> => {
    const violations = new Map<string, Violation[]>();

    // Sort days to ensure chronological order
    const sortedDays = [...days].sort((a, b) => a.getTime() - b.getTime());

    // 1. Check Consecutive Working Days (> 6 days)
    let consecutiveCount = 0;

    sortedDays.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const key = `${staffId}-${dateStr}`;
        const shift = schedule.get(key) || 'OFF';

        if (shift !== 'OFF') {
            consecutiveCount++;
        } else {
            consecutiveCount = 0;
        }

        if (consecutiveCount > 6) {
            const current = violations.get(dateStr) || [];
            violations.set(dateStr, [...current, {
                type: 'consecutive_days',
                date: dateStr,
                message: '連續工作超過 6 天 (違反勞基法)',
                severity: 'error'
            }]);
        }
    });

    // 2. Check Shift Interval (Night to Day: N -> D)
    sortedDays.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const key = `${staffId}-${dateStr}`;
        const currentShift = schedule.get(key) || 'OFF';

        // Get yesterday's shift
        const prevDay = subDays(day, 1);
        const prevKey = `${staffId}-${format(prevDay, 'yyyy-MM-dd')}`;
        const prevShift = schedule.get(prevKey) || 'OFF';

        if (prevShift === 'N' && currentShift === 'D') {
            const current = violations.get(dateStr) || [];
            violations.set(dateStr, [...current, {
                type: 'interval_error',
                date: dateStr,
                message: '大夜班接白班，休息時間不足',
                severity: 'error'
            }]);
        }
    });

    return violations;
};
