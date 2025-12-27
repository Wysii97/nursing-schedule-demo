import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { ScheduleEntry, LeaveRequest } from '../api/mockData';
import type { Staff } from '../types';
import { scheduleApi, leaveApi, staffApi } from '../api/client';

export type ScheduleStatus = 'planning' | 'draft' | 'official';

interface ScheduleState {
    schedule: ScheduleEntry[];
    leaveRequests: LeaveRequest[];
    staff: Staff[];
    confirmationRate: number;
    scheduleStatus: ScheduleStatus;
    confirmedStaffIds: string[];
    isLoading: boolean;
}

interface ScheduleContextType extends ScheduleState {
    updateSchedule: (entries: ScheduleEntry[]) => void;
    submitLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'createdAt'>) => Promise<void>;
    approveLeaveRequest: (id: string) => Promise<void>;
    rejectLeaveRequest: (id: string) => Promise<void>;
    getPendingCount: () => number;
    getTodayOnDuty: () => { total: number; D: number; E: number; N: number };
    getAbsenceCount: () => number;
    publishDraft: () => void;
    publishOfficial: () => void;
    confirmSchedule: (staffId: string) => void;
    refreshData: () => Promise<void>;
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
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus>('planning');
    const [confirmedStaffIds, setConfirmedStaffIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load initial data from Supabase
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const now = new Date();
            const [scheduleRes, leaveRes, staffRes] = await Promise.all([
                scheduleApi.getByMonth(now.getFullYear(), now.getMonth() + 1),
                leaveApi.getAll(),
                staffApi.getAll()
            ]);

            if (scheduleRes.success) setSchedule(scheduleRes.data);
            if (leaveRes.success) setLeaveRequests(leaveRes.data);
            if (staffRes.success) setStaff(staffRes.data);
        } catch (error) {
            console.error('Failed to load schedule data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const confirmationRate = staff.length > 0
        ? Math.round((confirmedStaffIds.length / staff.length) * 100)
        : 0;

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
    }, []);

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
        // TODO: Implement actual absence calculation from DB
        return leaveRequests.filter(r => r.status === 'approved').length;
    }, [leaveRequests]);

    const publishDraft = useCallback(() => {
        setScheduleStatus('draft');
        setConfirmedStaffIds([]);
    }, []);

    const publishOfficial = useCallback(() => {
        setScheduleStatus('official');
    }, []);

    const confirmSchedule = useCallback((staffId: string) => {
        setConfirmedStaffIds(prev => {
            if (prev.includes(staffId)) return prev;
            return [...prev, staffId];
        });
    }, []);

    const refreshData = useCallback(async () => {
        await loadData();
    }, [loadData]);

    return (
        <ScheduleContext.Provider value={{
            schedule,
            leaveRequests,
            staff,
            confirmationRate,
            scheduleStatus,
            confirmedStaffIds,
            isLoading,
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
        }}>
            {children}
        </ScheduleContext.Provider>
    );
};
