import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { ScheduleEntry, LeaveRequest } from '../api/mockData';
import type { Staff } from '../types';
import { scheduleApi, leaveApi, staffApi, ruleApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export type ScheduleStatus = 'planning' | 'draft' | 'official';

import { periodApi, confirmApi } from '../api/client';
import type { SchedulePeriod } from '../types';
import { format } from 'date-fns';

interface ScheduleState {
    schedule: ScheduleEntry[];
    leaveRequests: LeaveRequest[];
    staff: Staff[];
    scheduleStatus: ScheduleStatus; // Current period status
    confirmedStaffIds: string[];
    isLoading: boolean;
    currentPeriod: SchedulePeriod | null;
}

interface ScheduleContextType extends ScheduleState {
    updateSchedule: (entries: ScheduleEntry[]) => void;
    submitLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'createdAt'>) => Promise<void>;
    approveLeaveRequest: (id: string) => Promise<void>;
    rejectLeaveRequest: (id: string) => Promise<void>;
    getPendingCount: () => number;
    getTodayOnDuty: () => { total: number; D: number; E: number; N: number };
    getAbsenceCount: () => number;
    publishDraft: () => Promise<void>;
    publishOfficial: () => Promise<void>;
    confirmSchedule: (staffId: string) => Promise<void>;
    refreshData: () => Promise<void>;
    switchPeriod: (date: Date) => Promise<void>;
}

const ScheduleContext = createContext<ScheduleContextType | null>(null);

export const useScheduleStore = () => {
    const context = useContext(ScheduleContext);
    if (!context) {
        throw new Error('useScheduleStore must be used within ScheduleProvider');
    }
    return context;
};

interface ScheduleProviderProps {
    children: ReactNode;
}

export const ScheduleProvider: React.FC<ScheduleProviderProps> = ({ children }) => {
    const { currentUnit } = useAuth();
    const unitId = currentUnit?.id || 'U001';
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus>('planning');
    const [confirmedStaffIds, setConfirmedStaffIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [periodStartDay, setPeriodStartDay] = useState(1); // Default to 1st
    const [currentPeriod, setCurrentPeriod] = useState<SchedulePeriod | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date()); // Tracks the navigation date

    // Calculate period bounds based on a given date and periodStartDay
    const calculatePeriodBounds = (date: Date, startDay: number): { start: Date, end: Date, name: string } => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();

        let periodStart: Date;
        let periodEnd: Date;
        let periodName: string;

        if (day >= startDay) {
            // We are in the period starting this month
            periodStart = new Date(year, month, startDay);
            // Period ends on (startDay - 1) of next month
            const nextMonth = month + 1;
            periodEnd = new Date(year, nextMonth, startDay - 1);
            periodName = format(periodStart, 'yyyy-MM');
        } else {
            // We are in the period that started last month
            const lastMonth = month - 1;
            periodStart = new Date(year, lastMonth, startDay);
            periodEnd = new Date(year, month, startDay - 1);
            periodName = format(periodStart, 'yyyy-MM');
        }

        return { start: periodStart, end: periodEnd, name: periodName };
    };

    // Get or calculate period - does NOT require DB to exist
    const ensurePeriod = async (date: Date, forceStartDay?: number): Promise<SchedulePeriod> => {
        const startDay = forceStartDay ?? periodStartDay;
        const { start, end, name } = calculatePeriodBounds(date, startDay);

        const dateStr = format(date, 'yyyy-MM-dd');
        // Try to get existing period from DB
        const res = await periodApi.getPeriodByDate(unitId, dateStr);
        if (res.success && res.data) {
            return res.data;
        }

        // No DB period - create a temporary one for display (will be saved when user saves schedule)
        const tempPeriod: SchedulePeriod = {
            id: 'new-' + Date.now(),
            unitId: unitId,
            name: name,
            startDate: format(start, 'yyyy-MM-dd'),
            endDate: format(end, 'yyyy-MM-dd'),
            status: 'planning'
        };

        return tempPeriod;
    };

    // Load data for specific period
    const loadData = useCallback(async (targetDate: Date = currentDate) => {
        setIsLoading(true);
        try {
            // First, fetch the rule to get periodStartDay
            const ruleRes = await ruleApi.get(unitId);
            const startDay = ruleRes.success ? (ruleRes.data.periodStartDay || 1) : 1;
            setPeriodStartDay(startDay);

            const period = await ensurePeriod(targetDate, startDay);
            setCurrentPeriod(period);
            setScheduleStatus(period.status);

            const [scheduleRes, leaveRes, staffRes, confirmRes] = await Promise.all([
                // Fetch schedule by exact date range
                // We need to modify api to support range, for now use getByMonth logic but filtering later?
                // Or better, let's just stick to date-based loading matching the period range
                // The current scheduleApi.getByMonth takes year/month. 
                // We should ideally use a range query. 
                // For this step, we will assume period is month-aligned OR we just load enough data.
                // Let's rely on standard current logic for now but filtered by period dates if possible.
                // NOTE: scheduleApi.getByMonth loads 1st to last day. If we have custom range, we might miss data.
                // Let's improve this later. For now, we accept standard month for data loading.
                scheduleApi.getByMonth(targetDate.getFullYear(), targetDate.getMonth() + 1),
                leaveApi.getByMonth(targetDate.getFullYear(), targetDate.getMonth() + 1),
                staffApi.getAll(unitId),
                confirmApi.getByPeriod(period.id)
            ]);

            if (scheduleRes.success) setSchedule(scheduleRes.data);
            if (leaveRes.success) setLeaveRequests(leaveRes.data);
            if (staffRes.success) setStaff(staffRes.data);
            if (confirmRes.success) setConfirmedStaffIds(confirmRes.data);
        } catch (error) {
            console.error('Failed to load schedule data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentDate, unitId]);

    // Reload data when unit changes
    useEffect(() => {
        loadData();
    }, [loadData]);

    const switchPeriod = async (date: Date) => {
        setCurrentDate(date);
        await loadData(date);
    };

    const updateSchedule = useCallback((entries: ScheduleEntry[]) => {
        setSchedule(prev => {
            const updated = [...prev];
            entries.forEach(entry => {
                const idx = updated.findIndex(s => s.staffId === entry.staffId && s.date === entry.date);
                if (idx >= 0) {
                    updated[idx] = entry;
                } else {
                    updated.push(entry);
                }
            });
            return updated;
        });

        // If modifying draft, we must reset confirmations
        if (scheduleStatus === 'draft' && currentPeriod) {
            // Async reset in background
            periodApi.updateStatus(currentPeriod.id, 'planning').then(() => {
                confirmApi.reset(currentPeriod.id);
                setScheduleStatus('planning');
                setConfirmedStaffIds([]);
            });
        }
    }, [scheduleStatus, currentPeriod]);

    const submitLeaveRequest = useCallback(async (request: Omit<LeaveRequest, 'id' | 'createdAt'>) => {
        const res = await leaveApi.add(request);
        if (res.success) {
            setLeaveRequests(prev => [...prev, res.data]);
        }
    }, []);

    const approveLeaveRequest = useCallback(async (id: string) => {
        const res = await leaveApi.approve(id);
        if (res.success) {
            setLeaveRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' as const } : r));
        }
    }, []);

    const rejectLeaveRequest = useCallback(async (id: string) => {
        const res = await leaveApi.reject(id);
        if (res.success) {
            setLeaveRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' as const } : r));
        }
    }, []);

    const getPendingCount = useCallback(() => {
        return leaveRequests.filter(r => r.status === 'pending').length;
    }, [leaveRequests]);

    const getTodayOnDuty = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];
        const todaySchedule = schedule.filter(s => s.date === today && s.shiftCode !== 'OFF');
        return {
            total: todaySchedule.length,
            D: todaySchedule.filter(s => s.shiftCode === 'D').length,
            E: todaySchedule.filter(s => s.shiftCode === 'E').length,
            N: todaySchedule.filter(s => s.shiftCode === 'N').length,
        };
    }, [schedule]);

    const getAbsenceCount = useCallback(() => {
        return leaveRequests.filter(r => r.status === 'approved').length;
    }, [leaveRequests]);

    const publishDraft = useCallback(async () => {
        if (!currentPeriod) return;
        await periodApi.updateStatus(currentPeriod.id, 'draft');
        // Reset confirmations when publishing new draft
        await confirmApi.reset(currentPeriod.id);

        setScheduleStatus('draft');
        setConfirmedStaffIds([]);
    }, [currentPeriod]);

    const publishOfficial = useCallback(async () => {
        if (!currentPeriod) return;
        await periodApi.updateStatus(currentPeriod.id, 'official');
        setScheduleStatus('official');
    }, [currentPeriod]);

    const confirmSchedule = useCallback(async (staffId: string) => {
        if (!currentPeriod) return;

        await confirmApi.confirm(staffId, currentPeriod.id);
        setConfirmedStaffIds(prev => {
            if (prev.includes(staffId)) return prev;
            return [...prev, staffId];
        });
    }, [currentPeriod]);

    const refreshData = useCallback(async () => {
        await loadData(currentDate);
    }, [loadData, currentDate]);

    return (
        <ScheduleContext.Provider value={{
            schedule,
            leaveRequests,
            staff,
            scheduleStatus,
            confirmedStaffIds,
            isLoading,
            currentPeriod,
            updateSchedule,
            submitLeaveRequest,
            approveLeaveRequest,
            rejectLeaveRequest,
            getPendingCount,
            getTodayOnDuty,
            getAbsenceCount,
            publishDraft,
            publishOfficial,
            confirmSchedule,
            refreshData,
            switchPeriod,
        }}>
            {children}
        </ScheduleContext.Provider>
    );
};
