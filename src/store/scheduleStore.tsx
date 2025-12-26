import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { mockSchedule as initialSchedule, mockLeaveRequests as initialLeaveRequests, mockStaff } from '../api/mockData';
import type { ScheduleEntry, LeaveRequest } from '../api/mockData';
import type { Staff } from '../types';

export type ScheduleStatus = 'planning' | 'draft' | 'official';

interface ScheduleState {
    schedule: ScheduleEntry[];
    leaveRequests: LeaveRequest[];
    staff: Staff[];
    confirmationRate: number;
    scheduleStatus: ScheduleStatus;
    confirmedStaffIds: string[];
}

interface ScheduleContextType extends ScheduleState {
    updateSchedule: (entries: ScheduleEntry[]) => void;
    submitLeaveRequest: (request: Omit<LeaveRequest, 'id' | 'createdAt'>) => void;
    approveLeaveRequest: (id: string) => void;
    rejectLeaveRequest: (id: string) => void;
    getPendingCount: () => number;
    getTodayOnDuty: () => { total: number; D: number; E: number; N: number };
    getAbsenceCount: () => number;
    // New actions
    publishDraft: () => void;
    publishOfficial: () => void;
    confirmSchedule: (staffId: string) => void;
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
    const [schedule, setSchedule] = useState<ScheduleEntry[]>(initialSchedule);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
    const [staff] = useState<Staff[]>(mockStaff);
    const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus>('planning');
    const [confirmedStaffIds, setConfirmedStaffIds] = useState<string[]>([]);

    // Calculate confirmation rate based on actual confirmations
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

    const submitLeaveRequest = useCallback((request: Omit<LeaveRequest, 'id' | 'createdAt'>) => {
        const newRequest: LeaveRequest = {
            ...request,
            id: `LR${Date.now()}`,
            createdAt: new Date().toISOString().split('T')[0],
        };
        setLeaveRequests(prev => [...prev, newRequest]);
    }, []);

    const approveLeaveRequest = useCallback((id: string) => {
        setLeaveRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' as const } : r));
    }, []);

    const rejectLeaveRequest = useCallback((id: string) => {
        setLeaveRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' as const } : r));
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
        return 3; // Mock
    }, []);

    const publishDraft = useCallback(() => {
        setScheduleStatus('draft');
        setConfirmedStaffIds([]); // Reset confirmations for new draft
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

    return (
        <ScheduleContext.Provider value={{
            schedule,
            leaveRequests,
            staff,
            confirmationRate,
            scheduleStatus,
            confirmedStaffIds,
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
        }}>
            {children}
        </ScheduleContext.Provider>
    );
};
