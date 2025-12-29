import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Staff, Unit, Permission } from '../types';
import { ROLE_PERMISSIONS } from '../types';
import { staffApi, unitsApi, managerUnitsApi } from '../api/client';

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
    const [currentUnit, setCurrentUnit] = useState<Unit | null>(null);
    const [allUnits, setAllUnits] = useState<Unit[]>([]);
    const [managedUnitIds, setManagedUnitIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load all units on mount
    useEffect(() => {
        unitsApi.getAll().then(res => {
            if (res.success) {
                setAllUnits(res.data);
            }
        });
    }, []);

    // Load current user from API on mount
    useEffect(() => {
        const loadUser = async () => {
            const res = await staffApi.getCurrent();
            if (res.success) {
                setCurrentUserState(res.data);
                // Load managed units for this user
                const managedRes = await managerUnitsApi.get(res.data.id);
                if (managedRes.success) {
                    setManagedUnitIds(managedRes.data);
                }
            }
            setIsLoading(false);
        };
        loadUser();
    }, []);

    // Set current unit when user or units are loaded
    useEffect(() => {
        if (currentUser && allUnits.length > 0 && !currentUnit) {
            // Try to find user's department unit
            const userUnit = allUnits.find(u => u.id === currentUser.departmentId);
            if (userUnit) {
                setCurrentUnit(userUnit);
            } else if (allUnits.length > 0) {
                setCurrentUnit(allUnits[0]);
            }
        }
    }, [currentUser, allUnits, currentUnit]);

    const setCurrentUser = async (user: Staff) => {
        setCurrentUserState(user);
        // Load managed units for this user
        const managedRes = await managerUnitsApi.get(user.id);
        if (managedRes.success) {
            setManagedUnitIds(managedRes.data);
        }
        // Set default unit
        if (managedRes.success && managedRes.data.length > 0) {
            const unit = allUnits.find(u => u.id === managedRes.data[0]);
            if (unit) setCurrentUnit(unit);
        } else {
            const userUnit = allUnits.find(u => u.id === user.departmentId);
            if (userUnit) setCurrentUnit(userUnit);
        }
    };

    const switchUnit = (unitId: string) => {
        const unit = allUnits.find(u => u.id === unitId);
        if (unit) {
            setCurrentUnit(unit);
        }
    };

    const hasPermission = (permission: Permission): boolean => {
        if (!currentUser) return false;
        const permissions = ROLE_PERMISSIONS[currentUser.role] || [];
        return permissions.includes(permission);
    };

    // Available units: for manager/deputy use managed units, for nurse use their department
    const availableUnits = managedUnitIds.length > 0
        ? allUnits.filter(u => managedUnitIds.includes(u.id))
        : currentUser
            ? allUnits.filter(u => u.id === currentUser.departmentId)
            : [];

    const canManageMultipleUnits = availableUnits.length > 1;

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

