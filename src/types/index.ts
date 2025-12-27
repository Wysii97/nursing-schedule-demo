export type ShiftType = 'Standard' | 'Special' | 'Off';

export interface Shift {
    id: string;
    code: string;
    name: string;
    type: ShiftType;
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    hours: number;
    color: string;     // Hex code
}

export type StaffLevel = 'N0' | 'N1' | 'N2' | 'N3' | 'N4' | 'NP' | 'AHN' | 'HN';

// User roles
export type UserRole = 'nurse' | 'deputy' | 'manager';

// Unit (Department)
export interface Unit {
    id: string;
    name: string;
    code: string; // e.g., ICU, ER, GW
}

// Staff with role information
export interface Staff {
    id: string;      // e.g. N-1024
    name: string;
    level: StaffLevel;
    departmentId: string;
    role: UserRole;
    managedUnits?: Unit[]; // For deputy/manager - units they can manage
}

export interface UnitRule {
    maxLeavePerMonth: number;
    maxLeavePerDay: number;
    conflictStrategy: 'Score' | 'Random';
    preleaveOpenMonth?: string;  // Format: '2025-02'
    preleaveDeadline?: string;   // Format: '2025-01-20'
    monthlyPreLeaveLimits?: Record<string, number>; // Key: 'YYYY-MM', Value: limit per person
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

// Permissions
export type Permission =
    | 'view_schedule'
    | 'request_leave'
    | 'view_settings'    // Can view settings pages (readonly)
    | 'manage_shifts'    // Can edit shifts
    | 'manage_rules'     // Can edit rules
    | 'approve_leave'
    | 'manage_schedule'
    | 'switch_unit';

// Role permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    nurse: ['view_schedule', 'request_leave'],
    deputy: ['view_schedule', 'request_leave', 'view_settings', 'approve_leave', 'manage_schedule', 'switch_unit'],
    manager: ['view_schedule', 'request_leave', 'view_settings', 'manage_shifts', 'manage_rules', 'approve_leave', 'manage_schedule', 'switch_unit'],
};

// Role display names
export const ROLE_LABELS: Record<UserRole, string> = {
    nurse: '一般使用者',
    deputy: '職代管理者',
    manager: '管理者',
};
