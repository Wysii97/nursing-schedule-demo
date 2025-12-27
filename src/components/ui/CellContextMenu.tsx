import React, { useState, useRef, useEffect } from 'react';
import { Clock, Briefcase, CalendarOff, Trash2, ChevronRight } from 'lucide-react';
import styles from './CellContextMenu.module.css';

interface CellContextMenuProps {
    x: number;
    y: number;
    shifts: { code: string; name: string; color: string }[];
    onClose: () => void;
    onSetShift: (code: string) => void;
    onSetLeave: (leaveType: string, borrowHours?: number) => void;
    onClear: () => void;
}

const CellContextMenu: React.FC<CellContextMenuProps> = ({
    x,
    y,
    shifts,
    onClose,
    onSetShift,
    onSetLeave,
    onClear
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [showBorrowSubmenu, setShowBorrowSubmenu] = useState(false);
    const [customHours, setCustomHours] = useState('8');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Simple adjustment if menu goes off screen (basic implementation)
    const style = {
        top: y,
        left: x,
    };

    const handleBorrowSubmit = (hours: number) => {
        onSetLeave('借休', hours);
        onClose();
    };

    return (
        <div className={styles.contextMenu} style={style} ref={menuRef}>
            {/* Shifts */}
            <div className={styles.sectionLabel}>班別設定</div>
            {shifts.filter(s => s.code !== 'OFF').map(s => (
                <div key={s.code} className={styles.menuItem} onClick={() => { onSetShift(s.code); onClose(); }}>
                    <div className={styles.colorDot} style={{ background: s.color }}></div> {s.name} ({s.code})
                </div>
            ))}
            <div className={styles.menuItem} onClick={() => { onSetShift('OFF'); onClose(); }}>
                <div className={styles.colorDot} style={{ background: '#94A3B8' }}></div> 休假 (OFF)
            </div>

            <div className={styles.separator}></div>

            {/* Leaves */}
            <div className={styles.sectionLabel}>假勤設定</div>
            <div className={styles.menuItem} onClick={() => { onSetLeave('特休'); onClose(); }}>
                <Briefcase size={14} /> 特休 (-8H)
            </div>

            {/* Borrow Leave with Submenu */}
            <div
                className={styles.menuItem}
                onMouseEnter={() => setShowBorrowSubmenu(true)}
                onMouseLeave={() => setShowBorrowSubmenu(false)}
            >
                <Clock size={14} /> 借休
                <ChevronRight size={14} className={styles.arrow} />

                {showBorrowSubmenu && (
                    <div className={styles.submenu}>
                        <div className={styles.menuItem} onClick={(e) => { e.stopPropagation(); handleBorrowSubmit(4); }}>
                            借 4 小時 (半天)
                        </div>
                        <div className={styles.menuItem} onClick={(e) => { e.stopPropagation(); handleBorrowSubmit(8); }}>
                            借 8 小時 (全天)
                        </div>
                        <div className={styles.customInputItem} onClick={(e) => e.stopPropagation()}>
                            <span>自訂:</span>
                            <input
                                type="number"
                                min="1"
                                max="12"
                                value={customHours}
                                onChange={(e) => setCustomHours(e.target.value)}
                                className={styles.hoursInput}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleBorrowSubmit(Number(customHours));
                                    }
                                }}
                            />
                            <button className={styles.okBtn} onClick={() => handleBorrowSubmit(Number(customHours))}>OK</button>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.menuItem} onClick={() => { onSetLeave('病假'); onClose(); }}>
                <CalendarOff size={14} /> 病假
            </div>
            <div className={styles.menuItem} onClick={() => { onSetLeave('事假'); onClose(); }}>
                <CalendarOff size={14} /> 事假
            </div>

            <div className={styles.separator}></div>

            <div className={`${styles.menuItem} ${styles.danger}`} onClick={() => { onClear(); onClose(); }}>
                <Trash2 size={14} /> 清除設定
            </div>
        </div>
    );
};

export default CellContextMenu;
