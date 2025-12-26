import type { Shift, ApiResponse, UnitRule } from '../types';
import { mockShifts, mockRule, mockLeaveRequests, mockSchedule, mockStaff, mockBalance } from './mockData';
import type { LeaveRequest, ScheduleEntry, BalanceData } from './mockData';
import type { Staff } from '../types';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generate ID
const generateId = () => Math.random().toString(36).substr(2, 9);

export const shiftApi = {
    getAll: async (): Promise<ApiResponse<Shift[]>> => {
        await delay(300);
        return { success: true, message: '', data: [...mockShifts] };
    },

    add: async (shift: Omit<Shift, 'id'>): Promise<ApiResponse<Shift>> => {
        await delay(300);
        const newShift = { ...shift, id: generateId() };
        mockShifts.push(newShift);
        return { success: true, message: '新增成功', data: newShift };
    },

    update: async (id: string, shift: Omit<Shift, 'id'>): Promise<ApiResponse<Shift>> => {
        await delay(300);
        const index = mockShifts.findIndex(s => s.id === id);
        if (index > -1) {
            mockShifts[index] = { ...shift, id };
            return { success: true, message: '更新成功', data: mockShifts[index] };
        }
        return { success: false, message: '找不到班別', data: { ...shift, id } };
    },

    delete: async (id: string): Promise<ApiResponse<void>> => {
        await delay(300);
        const index = mockShifts.findIndex(s => s.id === id);
        if (index > -1) {
            mockShifts.splice(index, 1);
            return { success: true, message: '刪除成功', data: undefined };
        }
        return { success: false, message: '找不到班別', data: undefined };
    }
};

export const ruleApi = {
    get: async (): Promise<ApiResponse<UnitRule>> => {
        await delay(300);
        return { success: true, message: '', data: { ...mockRule } };
    },

    update: async (rule: UnitRule): Promise<ApiResponse<UnitRule>> => {
        await delay(300);
        Object.assign(mockRule, rule);
        return { success: true, message: '設定已儲存', data: { ...mockRule } };
    }
};

export const leaveApi = {
    getAll: async (): Promise<ApiResponse<LeaveRequest[]>> => {
        await delay(300);
        return { success: true, message: '', data: [...mockLeaveRequests] };
    },

    getByStaff: async (staffId: string): Promise<ApiResponse<LeaveRequest[]>> => {
        await delay(300);
        const filtered = mockLeaveRequests.filter(r => r.staffId === staffId);
        return { success: true, message: '', data: filtered };
    },

    add: async (request: Omit<LeaveRequest, 'id' | 'createdAt'>): Promise<ApiResponse<LeaveRequest>> => {
        await delay(300);
        const newRequest: LeaveRequest = {
            ...request,
            id: 'LR' + generateId(),
            createdAt: new Date().toISOString().split('T')[0]
        };
        mockLeaveRequests.push(newRequest);
        return { success: true, message: '申請已送出', data: newRequest };
    },

    cancel: async (id: string): Promise<ApiResponse<void>> => {
        await delay(300);
        const index = mockLeaveRequests.findIndex(r => r.id === id);
        if (index > -1) {
            mockLeaveRequests.splice(index, 1);
            return { success: true, message: '已取消申請', data: undefined };
        }
        return { success: false, message: '找不到申請', data: undefined };
    },

    approve: async (id: string): Promise<ApiResponse<LeaveRequest>> => {
        await delay(300);
        const request = mockLeaveRequests.find(r => r.id === id);
        if (request) {
            request.status = 'approved';
            return { success: true, message: '已核准', data: request };
        }
        return { success: false, message: '找不到申請', data: undefined as unknown as LeaveRequest };
    },

    reject: async (id: string): Promise<ApiResponse<LeaveRequest>> => {
        await delay(300);
        const request = mockLeaveRequests.find(r => r.id === id);
        if (request) {
            request.status = 'rejected';
            return { success: true, message: '已駁回', data: request };
        }
        return { success: false, message: '找不到申請', data: undefined as unknown as LeaveRequest };
    }
};

export const scheduleApi = {
    getByMonth: async (year: number, month: number): Promise<ApiResponse<ScheduleEntry[]>> => {
        await delay(300);
        const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
        const filtered = mockSchedule.filter(s => s.date.startsWith(monthStr));
        return { success: true, message: '', data: filtered };
    },

    getByStaff: async (staffId: string, year: number, month: number): Promise<ApiResponse<ScheduleEntry[]>> => {
        await delay(300);
        const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
        const filtered = mockSchedule.filter(s => s.staffId === staffId && s.date.startsWith(monthStr));
        return { success: true, message: '', data: filtered };
    }
};

export const staffApi = {
    getAll: async (): Promise<ApiResponse<Staff[]>> => {
        await delay(300);
        return { success: true, message: '', data: [...mockStaff] };
    },

    getCurrent: async (): Promise<ApiResponse<Staff>> => {
        await delay(200);
        // Return first staff as current user for demo
        return { success: true, message: '', data: mockStaff[1] }; // 林雅婷
    },

    getExternal: async (): Promise<ApiResponse<Staff[]>> => {
        await delay(300);
        const { mockExternalStaff } = await import('./mockData');
        return { success: true, message: '', data: [...mockExternalStaff] };
    }
};

export const balanceApi = {
    get: async (): Promise<ApiResponse<BalanceData>> => {
        await delay(200);
        return { success: true, message: '', data: { ...mockBalance } };
    }
};
