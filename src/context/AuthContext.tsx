import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { Staff, Unit, Permission } from '../types';
import { ROLE_PERMISSIONS } from '../types';
import { testUsers, mockUnits } from '../api/mockData';

interface AuthContextType {
    currentUser: Staff | null;
    currentUnit: Unit | null;
    setCurrentUser: (user: Staff) => void;
    switchUnit: (unitId: string) => void;
    hasPermission: (permission: Permission) => boolean;
    canManageMultipleUnits: boolean;
    availableUnits: Unit[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Default to manager for demo
    const [currentUser, setCurrentUserState] = useState<Staff>(testUsers[0]);
    const [currentUnit, setCurrentUnit] = useState<Unit>(mockUnits[0]);

    const setCurrentUser = (user: Staff) => {
        setCurrentUserState(user);
        // Set default unit when switching user
        if (user.managedUnits && user.managedUnits.length > 0) {
            setCurrentUnit(user.managedUnits[0]);
        } else {
            // For regular nurse, use their department
            const userUnit = mockUnits.find(u => u.id === user.departmentId);
            if (userUnit) setCurrentUnit(userUnit);
        }
    };

    const switchUnit = (unitId: string) => {
        const unit = mockUnits.find(u => u.id === unitId);
        if (unit) {
            setCurrentUnit(unit);
        }
    };

    const hasPermission = (permission: Permission): boolean => {
        if (!currentUser) return false;
        const permissions = ROLE_PERMISSIONS[currentUser.role] || [];
        return permissions.includes(permission);
    };

    const canManageMultipleUnits =
        currentUser?.managedUnits !== undefined &&
        currentUser.managedUnits.length > 1;

    const availableUnits = currentUser?.managedUnits ||
        (currentUser ? [mockUnits.find(u => u.id === currentUser.departmentId)!].filter(Boolean) : []);

    return (
        <AuthContext.Provider value={{
            currentUser,
            currentUnit,
            setCurrentUser,
            switchUnit,
            hasPermission,
            canManageMultipleUnits,
            availableUnits
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
