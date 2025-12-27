import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Staff, Unit, Permission } from '../types';
import { ROLE_PERMISSIONS } from '../types';
import { mockUnits } from '../api/mockData';
import { staffApi } from '../api/client';

interface AuthContextType {
    currentUser: Staff | null;
    currentUnit: Unit | null;
    setCurrentUser: (user: Staff) => void;
    switchUnit: (unitId: string) => void;
    hasPermission: (permission: Permission) => boolean;
    canManageMultipleUnits: boolean;
    availableUnits: Unit[];
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUserState] = useState<Staff | null>(null);
    const [currentUnit, setCurrentUnit] = useState<Unit>(mockUnits[0]);
    const [isLoading, setIsLoading] = useState(true);

    // Load current user from API on mount
    useEffect(() => {
        const loadUser = async () => {
            const res = await staffApi.getCurrent();
            if (res.success) {
                setCurrentUserState(res.data);
                // Set default unit based on user's department
                const userUnit = mockUnits.find(u => u.id === res.data.departmentId);
                if (userUnit) setCurrentUnit(userUnit);
            }
            setIsLoading(false);
        };
        loadUser();
    }, []);

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
            availableUnits,
            isLoading
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
