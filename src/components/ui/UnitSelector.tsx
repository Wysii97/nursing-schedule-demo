import React from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './UnitSelector.module.css';

const UnitSelector: React.FC = () => {
    const { currentUnit, availableUnits, switchUnit, canManageMultipleUnits } = useAuth();

    if (!canManageMultipleUnits || availableUnits.length <= 1) {
        // Just show current unit name without dropdown
        return (
            <div className={styles.unitDisplay}>
                <Building2 size={14} />
                <span>{currentUnit?.name || '未指定單位'}</span>
            </div>
        );
    }

    return (
        <div className={styles.dropdown}>
            <div className={styles.trigger}>
                <Building2 size={14} />
                <span>{currentUnit?.name}</span>
                <ChevronDown size={14} />
            </div>
            <div className={styles.menu}>
                {availableUnits.map(unit => (
                    <div
                        key={unit.id}
                        className={`${styles.menuItem} ${unit.id === currentUnit?.id ? styles.active : ''}`}
                        onClick={() => switchUnit(unit.id)}
                    >
                        <span className={styles.unitCode}>{unit.code}</span>
                        <span>{unit.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UnitSelector;
