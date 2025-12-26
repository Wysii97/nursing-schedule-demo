import type { Shift, Staff, UnitRule, Unit } from '../types';

// Mock Units
export const mockUnits: Unit[] = [
    { id: 'U001', name: '加護病房', code: 'ICU' },
    { id: 'U002', name: '一般病房 5A', code: 'GW-5A' },
    { id: 'U003', name: '急診室', code: 'ER' },
];

// Extended mock data for shifts
export const mockShifts: Shift[] = [
    { id: '1', code: 'D', name: '白班', type: 'Standard', startTime: '08:00', endTime: '16:00', hours: 8.0, color: '#3B82F6' },
    { id: '2', code: 'E', name: '小夜班', type: 'Standard', startTime: '16:00', endTime: '00:00', hours: 8.0, color: '#F59E0B' },
    { id: '3', code: 'N', name: '大夜班', type: 'Standard', startTime: '00:00', endTime: '08:00', hours: 8.0, color: '#6366F1' },
    { id: '4', code: 'OFF', name: '例假日', type: 'Off', startTime: '-', endTime: '-', hours: 0.0, color: '#F43F5E' },
    { id: '5', code: '8-8', name: '白班長班', type: 'Special', startTime: '08:00', endTime: '20:00', hours: 12.0, color: '#14B8A6' },
    { id: '6', code: 'D/2', name: '半天白班', type: 'Special', startTime: '08:00', endTime: '12:00', hours: 4.0, color: '#8B5CF6' },
    { id: '7', code: 'TR', name: '教育訓練', type: 'Special', startTime: '09:00', endTime: '17:00', hours: 8.0, color: '#EC4899' },
];

// Extended mock staff data with roles
export const mockStaff: Staff[] = [
    // Manager (護理長) - manages ICU and GW-5A
    { id: 'N-1001', name: '陳美玲', level: 'N4', departmentId: 'U001', role: 'manager', managedUnits: [mockUnits[0], mockUnits[1]] },
    // Deputy (職代) - manages ICU
    { id: 'N-1002', name: '林雅婷', level: 'N3', departmentId: 'U001', role: 'deputy', managedUnits: [mockUnits[0]] },
    // Regular nurses
    { id: 'N-1003', name: '王曉芳', level: 'N3', departmentId: 'U001', role: 'nurse' },
    { id: 'N-1004', name: '張家豪', level: 'N2', departmentId: 'U001', role: 'nurse' },
    { id: 'N-1005', name: '李佳穎', level: 'N2', departmentId: 'U001', role: 'nurse' },
    { id: 'N-1006', name: '黃詩婷', level: 'N1', departmentId: 'U001', role: 'nurse' },
    { id: 'N-1007', name: '吳承恩', level: 'N1', departmentId: 'U001', role: 'nurse' },
    { id: 'N-1008', name: '周雅琪', level: 'N0', departmentId: 'U001', role: 'nurse' },
];

// Test users for role switching (development)
export const testUsers: Staff[] = [
    { id: 'N-1001', name: '陳美玲 (護理長)', level: 'N4', departmentId: 'U001', role: 'manager', managedUnits: [mockUnits[0], mockUnits[1]] },
    { id: 'N-1002', name: '林雅婷 (職代)', level: 'N3', departmentId: 'U001', role: 'deputy', managedUnits: [mockUnits[0]] },
    { id: 'N-1003', name: '王曉芳 (護理師)', level: 'N3', departmentId: 'U001', role: 'nurse' },
];

// External staff for support
export const mockExternalStaff: Staff[] = [
    { id: 'N-2001', name: '張心怡 (支援)', level: 'N3', departmentId: 'U002', role: 'nurse' },
    { id: 'N-2002', name: '陳建宏 (支援)', level: 'N2', departmentId: 'U002', role: 'nurse' },
    { id: 'N-3001', name: '林志豪 (支援)', level: 'N4', departmentId: 'U003', role: 'nurse' },
];

export const mockRule: UnitRule = {
    maxLeavePerMonth: 4,
    maxLeavePerDay: 2,
    conflictStrategy: 'Score',
};

// Leave request types
export interface LeaveRequest {
    id: string;
    staffId: string;
    staffName: string;
    date: string; // YYYY-MM-DD
    type: 'leave' | 'shift';
    leaveType?: string;
    shiftCode?: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected' | 'lottery';
    createdAt: string;
}

export const mockLeaveRequests: LeaveRequest[] = [
    { id: 'LR001', staffId: 'N-1002', staffName: '林雅婷', date: '2025-01-05', type: 'leave', leaveType: '特休假', reason: '家庭聚會', status: 'pending', createdAt: '2024-12-20' },
    { id: 'LR002', staffId: 'N-1003', staffName: '王曉芳', date: '2025-01-05', type: 'leave', leaveType: '特休假', reason: '出國旅遊', status: 'pending', createdAt: '2024-12-21' },
    { id: 'LR003', staffId: 'N-1004', staffName: '張家豪', date: '2025-01-05', type: 'shift', shiftCode: 'D', reason: '在職進修課程', status: 'approved', createdAt: '2024-12-19' },
    { id: 'LR004', staffId: 'N-1002', staffName: '林雅婷', date: '2025-01-08', type: 'shift', shiftCode: 'N', reason: '協助換班', status: 'pending', createdAt: '2024-12-22' },
    { id: 'LR005', staffId: 'N-1005', staffName: '李佳穎', date: '2025-01-10', type: 'leave', leaveType: '補休', reason: '個人事務', status: 'rejected', createdAt: '2024-12-18' },
];

// Schedule data type
export interface ScheduleEntry {
    date: string; // YYYY-MM-DD
    staffId: string;
    shiftCode: string;
}

// Generate mock schedule for current month
export const generateMockSchedule = (staffList: Staff[]): ScheduleEntry[] => {
    const schedule: ScheduleEntry[] = [];
    const shiftCodes = ['D', 'D', 'D', 'D', 'OFF', 'OFF', 'E', 'E', 'E', 'E', 'OFF', 'OFF', 'N', 'N', 'N', 'N', 'OFF'];

    // Generate for current month and next month
    const now = new Date();
    const months = [
        { year: now.getFullYear(), month: now.getMonth() + 1 },
        { year: now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(), month: now.getMonth() === 11 ? 1 : now.getMonth() + 2 }
    ];

    months.forEach(({ year, month }) => {
        const daysInMonth = new Date(year, month, 0).getDate();
        staffList.forEach((staff, si) => {
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const shiftIndex = (day + si * 3) % shiftCodes.length;
                schedule.push({
                    date: dateStr,
                    staffId: staff.id,
                    shiftCode: shiftCodes[shiftIndex]
                });
            }
        });
    });

    return schedule;
};

export const mockSchedule = generateMockSchedule(mockStaff);

// Balance data for current user
export interface BalanceData {
    annualLeaveRemaining: number;
    annualLeaveTotal: number;
    compensatoryHours: number;
    debtHours: number;
}

export const mockBalance: BalanceData = {
    annualLeaveRemaining: 10.5,
    annualLeaveTotal: 14,
    compensatoryHours: 32,
    debtHours: -4,
};
