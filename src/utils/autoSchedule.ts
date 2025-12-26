
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { checkScheduleCompliance } from './scheduleValidation';
import type { Staff } from '../types';

export const generateAutoSchedule = (
    currentSchedule: Map<string, string>,
    staffList: Staff[],
    monthDate: Date
): { newSchedule: Map<string, string>; filledCount: number } => {
    const schedule = new Map(currentSchedule);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    let filledCount = 0;

    // Daily Requirement Configuration (Can be dynamic in future)
    // Example: D:3, E:2, N:2
    const dailyNeeds = { D: 3, E: 2, N: 2 };

    days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');

        // 1. Calculate current staffing for this day
        const currentCounts = { D: 0, E: 0, N: 0 };
        staffList.forEach(s => {
            const shift = schedule.get(`${s.id}-${dateStr}`) || 'OFF';
            if (shift in currentCounts) {
                currentCounts[shift as keyof typeof currentCounts]++;
            }
        });

        // 2. Identify Deficits
        const deficits = {
            D: Math.max(0, dailyNeeds.D - currentCounts.D),
            E: Math.max(0, dailyNeeds.E - currentCounts.E),
            N: Math.max(0, dailyNeeds.N - currentCounts.N)
        };

        // 3. Fill Deficits Greedy
        (['N', 'E', 'D'] as const).forEach(shiftType => { // Fill Night first (hardest)
            while (deficits[shiftType] > 0) {
                let bestStaff: Staff | null = null;
                let bestScore = -Infinity;

                // Find best candidate
                staffList.forEach(s => {
                    // Skip if already assigned today
                    if (schedule.has(`${s.id}-${dateStr}`) && schedule.get(`${s.id}-${dateStr}`) !== 'OFF') return;

                    let score = 0;

                    // Trial assignment
                    schedule.set(`${s.id}-${dateStr}`, shiftType);

                    // Check Compliance
                    const violations = checkScheduleCompliance(s.id, schedule, days);
                    const hasViolation = Array.from(violations.values()).some(v => v.length > 0);

                    if (hasViolation) {
                        score = -10000; // Penalize violations heavily
                    } else {
                        // Reward: Balance total shifts (simple heuristic: prefer those with fewer shifts)
                        const totalShifts = days.filter(d => {
                            const k = `${s.id}-${format(d, 'yyyy-MM-dd')}`;
                            return schedule.get(k) && schedule.get(k) !== 'OFF';
                        }).length;
                        score -= totalShifts * 10; // -10 per existing shift to prefer low utilization

                        // Reward: Continuity (same shift as yesterday is good for biological clock)
                        const yesterdayStr = format(new Date(day.getTime() - 86400000), 'yyyy-MM-dd');
                        const yesterdayShift = schedule.get(`${s.id}-${yesterdayStr}`);
                        if (yesterdayShift === shiftType) score += 20;

                    }

                    // Revert trial
                    schedule.delete(`${s.id}-${dateStr}`);

                    if (score > bestScore) {
                        bestScore = score;
                        bestStaff = s;
                    }
                });

                // Assign if candidate found and score is acceptable (not a violation)
                if (bestStaff && bestScore > -5000) {
                    schedule.set(`${(bestStaff as Staff).id}-${dateStr}`, shiftType);
                    deficits[shiftType]--;
                    filledCount++;
                } else {
                    break; // Cannot fill this slot without violation
                }
            }
        });
    });

    return { newSchedule: schedule, filledCount };
};
